import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AdminService } from '../admin/admin.service';
import { AvailabilityService } from '../availability/availability.service';
import { CalendarService } from '../calendar/calendar.service';
import { Calendar } from '../entities/calendar.entity';
import { TypeEvent } from '../entities/type-event.entity';
import { User } from '../entities/user.entity';
import { EventService } from '../event/event.service';
import { GetEventService } from '../get-event/get-event.service';
import { TypeEventService } from '../type-event/type-event.service';
import { UserService } from '../user/user.service';
import convertHourToMinute from '../utils/convert-hour-to-minute';
import convertMinuteToHour from '../utils/convert-minute-to-hour';
import datesRegExp from '../utils/dates-reg-exp';
import timesRegExp from '../utils/times-reg-exp';
import { Admin } from 'src/entities/admin.entity';

interface AnswerFunction {
  message?: string;
  buffer?: any;
  wppId?: string;
  messageId?: string;
  sendMessage?: (from: string, response: string) => any;
  admin: Admin;
}
interface AnswerFunctionOutput {
  buffer?: any;
  response?: string;
  resetConversation?: boolean;
  nextAnswer?: Answer;
  messageId: string;
}
interface Answer {
  messageId: string;
  keywords?: string[];
  previousMessageId?: string;
  fallback?: () => AnswerFunctionOutput | Promise<AnswerFunctionOutput>; //use this when user send wrong response
  function: ({
    message,
    buffer,
    wppId,
  }: AnswerFunction) => AnswerFunctionOutput | Promise<AnswerFunctionOutput>;
}

interface MemoryStatus {
  wppId: string;
  messageIds: string[];
  buffer: any;
}
let memoryStatus: MemoryStatus[] = [];

@Injectable()
export class WppHandlerService {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly calendarService: CalendarService,
    private readonly eventServixe: EventService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly typeEventService: TypeEventService,
    private readonly getEventService: GetEventService,
  ) {}

  private getAnswers(admin: Admin): Answer[] {
    return [
      {
        messageId: 'connect_admin',
        keywords: [`^${admin.connectString}$`],
        previousMessageId: 'welcome_answer',
        function: async ({ message, admin, wppId }) => {
          if (admin.connectString == message) {
            await this.adminService.addWppId(admin.id, wppId);
            return {
              response: 'Admin conectado',
              resetConversation: true,
              messageId: 'connect_admin',
            };
          }
          return {
            resetConversation: true,
            messageId: 'connect_admin',
          };
        },
      },
      this.welcome(this.welcomeAnswer()),
      {
        messageId: 'reset',
        keywords: ['reset', 'resetear', 'reiniciar'],
        function: () => {
          return {
            response: 'Reiniciando',
            resetConversation: true,
            nextAnswer: this.welcomeAnswer(),
            messageId: 'reset',
          };
        },
      },
      {
        function: async ({ message, buffer, wppId, admin }) => {
          await this.userService.create(
            {
              name: message,
              wppId,
            },
            admin,
          );
          return {
            response: `¡Bienvenido ${message}!`,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'user_not_found',
          };
        },
        keywords: ['.'],
        messageId: 'add_user',
        previousMessageId: 'user_not_found',
      },
      this.welcomeAnswer(),
      this.getAvailabilityChooseCalendar(admin),
      this.getAvailabilityDate(),
      this.getAvailabilityTypeEvent(),
      {
        previousMessageId: 'get_availability_type_event',
        keywords: ['^\\d{1,2}$'],
        messageId: 'get_availability_response',
        function: async ({ message, buffer, admin }) => {
          const [typeEvents] = await this.typeEventService.get(admin);
          const typeEvent = typeEvents[parseInt(message) - 1];
          if (!typeEvent)
            return {
              response: 'Tipo de evento no encontrado',
              nextAnswer: this.getAvailabilityTypeEvent(),
              messageId: 'get_availability_response',
            };
          const availabilityString = await this.getAvailability(
            buffer.calendarId,
            buffer.date,
            typeEvent,
            admin,
          );
          return {
            response: `La disponibilidad para la fecha ${buffer.date} del calendario ${buffer.calendarName} es\n${availabilityString}`,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'get_availability_response',
          };
        },
      },
      this.addEventChooseCalendar(admin),
      this.addEventTypeEvent(),
      this.addEventDate(),
      this.addEventTime(),
      {
        previousMessageId: 'add_event_time',
        keywords: timesRegExp.map((timeRegEx) => timeRegEx.regExp),
        messageId: 'add_event_response',
        function: async ({ wppId, buffer, message, sendMessage, admin }) => {
          const user = await this.userService.getOneBy('wppId', wppId, admin);

          const timeRegExp = timesRegExp.find(({ regExp }) =>
            new RegExp(regExp).test(message),
          );
          let from: DateTime = null;
          if (!timeRegExp) {
            from = buffer.date;
          } else {
            from = DateTime.fromFormat(message, timeRegExp.luxonFormat);
          }
          if (!from || !from.isValid) {
            return this.addEventTime().fallback();
          }

          const to = convertMinuteToHour(
            convertHourToMinute(from.toFormat('HH:mm')) +
              buffer.typeEvent.durationInMinutes,
          );
          const isCreated = await this.addEvent(
            `${buffer.typeEvent.name} - ${user.name}`,
            buffer.calendarId,
            buffer.date,
            from.toFormat('HH:mm'),
            to,
            user.id,
            buffer.typeEvent.id,
            admin,
          );

          await this.newEventNotification(
            admin,
            user.name,
            buffer.date,
            from.toFormat('HH:mm'),
            to,
            sendMessage,
          );

          return {
            response: !isCreated
              ? 'Hubo un error al crear el evento.'
              : `Evento agregado.\n`,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'add_event_response',
          };
        },
      },
      this.removeEventChooseEvent(),
      this.removeEventConfirm(),
      {
        previousMessageId: 'remove_event_confirm',
        keywords: ['^1$'],
        messageId: 'remove_event_yes',
        function: async ({ buffer, admin }) => {
          await this.eventServixe.delete(buffer.eventId, admin);

          return {
            response: `Reserva cancelada`,
            resetConversation: true,
            messageId: 'remove_event_confirm',
            nextAnswer: this.welcomeAnswer(),
          };
        },
      },
      {
        previousMessageId: 'remove_event_confirm',
        keywords: ['^2$'],
        messageId: 'remove_event_no',
        function: () => ({
          resetConversation: true,
          nextAnswer: this.welcomeAnswer(),
          messageId: 'remove_event_no',
        }),
      },
      {
        previousMessageId: 'welcome_answer',
        keywords: ['^4$'],
        messageId: 'get_events',
        function: async ({ wppId, admin }) => {
          let user: User = null;
          if (admin.wppId !== wppId)
            user = await this.userService.getOneBy('wppId', wppId, admin);
          const [events] = await this.getEventService.get(admin.id, user?.id);
          const eventsString = events.reduce((acc, el) => {
            const date = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('dd/MM/yyyy');
            const from = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('HH:mm');
            const to = DateTime.fromJSDate(new Date(el.endDateTime)).toFormat(
              'HH:mm',
            );
            return `${acc}\nEl dia ${date} desde ${from}hs hasta ${to}hs`;
          }, '');
          let response = `Tienes las siguientes reservas\n${eventsString}`;
          if (events.length <= 0) {
            response = `No tienes reservas actualmente.`;
          }
          return {
            response: response,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'get_events',
          };
        },
      },
    ];
  }

  private removeEventConfirm() {
    return {
      previousMessageId: 'remove_event',
      keywords: ['^\\d{1,2}$', 'cancelar'],
      messageId: 'remove_event_confirm',
      fallback: () => ({
        messageId: 'remove_event_confirm',
        nextAnswer: this.removeEventConfirm(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ wppId, buffer, message, admin }) => {
        if (message == 'cancelar') {
          return {
            resetConversation: true,
            nextAnswer: this.welcomeAnswer(),
            messageId: 'remove_event_confirm',
          };
        }
        let user: User = null;
        if (admin.wppId !== wppId)
          user = await this.userService.getOneBy('wppId', wppId, admin);
        const [events] = await this.getEventService.get(admin.id, user?.id);
        let event = events[parseInt(message) - 1];

        if (!event) {
          event = await this.getEventService.getOne(buffer.eventId);
        }

        if (!event) {
          return {
            response: 'Lo siento, no pude entenderte.',
            nextAnswer: this.removeEventChooseEvent(),
            messageId: 'remove_event_confirm',
          };
        }

        const date = DateTime.fromJSDate(
          new Date(event.startDateTime),
        ).toFormat('dd/MM/yyyy');
        const from = DateTime.fromJSDate(
          new Date(event.startDateTime),
        ).toFormat('HH:mm');
        const to = DateTime.fromJSDate(new Date(event.endDateTime)).toFormat(
          'HH:mm',
        );

        return {
          response: `¿Seguro deseas cancelar la reserva del dia ${date} desde ${from}hs hasta ${to}hs?\n1_ Si\n2_ No`,
          messageId: 'remove_event_confirm',
          buffer: {
            eventId: event.id,
          },
        };
      },
    };
  }

  private removeEventChooseEvent() {
    return {
      previousMessageId: 'welcome_answer',
      keywords: ['^3$'],
      messageId: 'remove_event',
      fallback: () => ({
        messageId: 'remove_event',
        nextAnswer: this.removeEventChooseEvent(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ wppId, admin }) => {
        let user: User = null;
        if (admin.wppId !== wppId)
          user = await this.userService.getOneBy('wppId', wppId, admin);
        const [events] = await this.getEventService.get(admin.id, user?.id);
        const eventsString = events.reduce((acc, el, index) => {
          const date = DateTime.fromJSDate(new Date(el.startDateTime)).toFormat(
            'dd/MM/yyyy',
          );
          const from = DateTime.fromJSDate(new Date(el.startDateTime)).toFormat(
            'HH:mm',
          );
          const to = DateTime.fromJSDate(new Date(el.endDateTime)).toFormat(
            'HH:mm',
          );
          return `${acc}\n${
            index + 1
          }_ El dia ${date} desde ${from}hs hasta ${to}hs`;
        }, '');
        let response: AnswerFunctionOutput = {
          response: `Tienes las siguientes reservas${eventsString}\n\n¿Cual deseas cancelar?\nPara volver al menu de inicio escribe *cancelar*`,
          messageId: 'remove_event',
        };
        if (events.length <= 0) {
          response = {
            response: `No tienes reservas actualmente.`,
            messageId: 'remove_event',
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
          };
        }
        return response;
      },
    };
  }

  private addEventChooseCalendar(admin: Admin): Answer {
    return {
      previousMessageId: 'welcome_answer',
      keywords: ['^2$'],
      messageId: 'add_event_calendar',
      fallback: () => ({
        messageId: 'add_event_calendar',
        nextAnswer: this.getAvailabilityChooseCalendar(admin),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async () => this.chooseCalendar('add_event_calendar', admin),
    };
  }

  private addEventTypeEvent(): Answer {
    return {
      previousMessageId: 'add_event_calendar',
      keywords: ['^\\d{1,2}$', 'cancelar'],
      messageId: 'add_event_type_event',
      function: async ({ message, buffer, admin }) => {
        if (message == 'cancelar') {
          return {
            resetConversation: true,
            nextAnswer: this.welcomeAnswer(),
            messageId: 'add_event_type_event',
          };
        }

        let calendar: Calendar = null;
        if (message.length > 0) {
          const [calendars] = await this.calendarService.get(admin);
          calendar = calendars[parseInt(message) - 1];
        }

        if (!calendar)
          calendar = await this.calendarService.getOne(
            buffer.calendarId,
            admin,
          );

        if (!calendar) {
          return {
            response: 'Calendario no encontrado',
            nextAnswer: this.addEventChooseCalendar(admin),
            messageId: 'add_event_type_event',
          };
        }
        const response = await this.chooseTypeEvent(
          'add_event_type_event',
          buffer,
          admin,
        );

        return {
          ...response,
          buffer: {
            ...response.buffer,
            calendarId: calendar.id,
            calendarName: calendar.name,
          },
        };
      },
    };
  }

  private addEventDate(): Answer {
    return {
      previousMessageId: 'add_event_type_event',
      keywords: ['^\\d{1,2}$', 'cancelar'],
      messageId: 'add_event_date',
      fallback: () => ({
        messageId: 'add_event_date',
        nextAnswer: this.addEventDate(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, admin }) => {
        const [typeEvents] = await this.typeEventService.get(admin);
        const typeEvent = typeEvents[parseInt(message) - 1];
        if (!typeEvent)
          return {
            response: 'Tipo de evento no encontrado',
            nextAnswer: this.addEventTypeEvent(),
            messageId: 'add_event_date',
          };
        return {
          response: '¿Para que fecha?',
          buffer: {
            typeEvent: typeEvent,
          },
          messageId: 'add_event_date',
        };
      },
    };
  }

  private addEventTime(): Answer {
    return {
      previousMessageId: 'add_event_date',
      keywords: datesRegExp.map((dateRegEx) => dateRegEx.regExp),
      messageId: 'add_event_time',
      fallback: () => ({
        messageId: 'add_event_time',
        nextAnswer: this.addEventTime(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: ({ message, buffer }) => {
        const dateRegExp = datesRegExp.find(({ regExp }) =>
          new RegExp(regExp).test(message),
        );
        let date: DateTime = null;
        if (!dateRegExp) {
          date = buffer.date;
        } else {
          date = DateTime.fromFormat(message, dateRegExp.luxonFormat);
        }
        if (!date || !date.isValid) {
          return this.addEventDate().fallback();
        }
        return {
          response: `¿A que hora?`,
          buffer: { date },
          messageId: 'add_event_time',
        };
      },
    };
  }

  private getAvailabilityChooseCalendar(admin: Admin): Answer {
    return {
      previousMessageId: 'welcome_answer',
      keywords: ['^1$'],
      messageId: 'get_availability_calendar',
      fallback: () => ({
        messageId: 'get_availability_calendar',
        nextAnswer: this.getAvailabilityChooseCalendar(admin),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async () =>
        this.chooseCalendar('get_availability_calendar', admin),
    };
  }

  private getAvailabilityDate(): Answer {
    return {
      previousMessageId: 'get_availability_calendar',
      keywords: ['^\\d{1,2}$', 'cancelar'],
      messageId: 'get_availability_date',
      fallback: () => ({
        messageId: 'get_availability_date',
        nextAnswer: this.getAvailabilityDate(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        if (message == 'cancelar') {
          return {
            resetConversation: true,
            nextAnswer: this.welcomeAnswer(),
            messageId: 'get_availability_date',
          };
        }

        let calendar: Calendar = null;
        if (message.length > 0) {
          const [calendars] = await this.calendarService.get(admin);
          calendar = calendars[parseInt(message) - 1];
        }

        if (!calendar)
          calendar = await this.calendarService.getOne(
            buffer.calendarId,
            admin,
          );

        if (!calendar) {
          return {
            response: 'Calendario no encontrado',
            nextAnswer: this.getAvailabilityChooseCalendar(admin),
            messageId: 'get_availability_date',
          };
        }

        return {
          response: `¿Para que fecha?`,
          buffer: {
            calendarId: calendar.id,
            calendarName: calendar.name,
          },
          messageId: 'get_availability_date',
        };
      },
    };
  }

  private getAvailabilityTypeEvent(): Answer {
    return {
      previousMessageId: 'get_availability_date',
      keywords: datesRegExp.map((dateRegEx) => dateRegEx.regExp),
      messageId: 'get_availability_type_event',
      fallback: () => ({
        messageId: 'get_availability_type_event',
        nextAnswer: this.getAvailabilityTypeEvent(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        const response = await this.chooseTypeEvent(
          'get_availability_type_event',
          buffer,
          admin,
        );
        const dateRegExp = datesRegExp.find(({ regExp }) =>
          new RegExp(regExp).test(message),
        );
        let date: DateTime = null;
        if (!dateRegExp) {
          date = buffer.date;
        } else {
          date = DateTime.fromFormat(message, dateRegExp.luxonFormat);
        }
        if (!date || !date.isValid) {
          return this.getAvailabilityDate().fallback();
        }
        return {
          ...response,
          buffer: {
            ...response.buffer,
            date,
          },
        };
      },
    };
  }

  private async getAvailability(
    calendarId: string,
    date: DateTime,
    typeEvent: TypeEvent,
    admin: Admin,
  ): Promise<string> {
    const { schedules } = await this.availabilityService.getAvailability(
      calendarId,
      date,
      typeEvent.id,
      admin,
    );
    return schedules
      .reduce(
        (acc, el) =>
          `${acc}\nDesde: ${convertMinuteToHour(
            el.from,
          )} Hasta: ${convertMinuteToHour(el.to)}`,
        '',
      )
      .slice(1);
  }

  private resetConversation(wppId): void {
    memoryStatus = memoryStatus.filter(({ wppId: _wppId }) => _wppId != wppId);
  }

  private async addEvent(
    description: string,
    calendarId: string,
    date: DateTime,
    from: string,
    to: string,
    userId: string,
    typeEventId: string,
    admin: Admin,
  ): Promise<boolean> {
    const startDateTime = DateTime.fromFormat(
      `${date.toFormat('dd/MM/yyyy')} ${from}`,
      'dd/MM/yyyy HH:mm',
    );
    const endDateTime = DateTime.fromFormat(
      `${date.toFormat('dd/MM/yyyy')} ${to}`,
      'dd/MM/yyyy HH:mm',
    );

    const event = await this.eventServixe.create(
      {
        calendarId,
        description,
        startDateTime: startDateTime.toJSDate(),
        endDateTime: endDateTime.toJSDate(),
        userId,
        typeEventId,
      },
      admin,
    );
    return !!event;
  }

  private updateMemory(wppId: string, messageId: string, buffer: any): void {
    const memory = this.getUserMemory(wppId);
    memoryStatus = memoryStatus.filter(({ wppId }) => memory.wppId != wppId);
    memoryStatus.push({
      ...memory,
      messageIds: [...memory.messageIds, messageId],
      buffer: { ...memory.buffer, ...buffer },
    });
  }

  private async chooseCalendar(
    messageId: string,
    admin: Admin,
  ): Promise<AnswerFunctionOutput> {
    const [calendars] = await this.calendarService.get(admin);
    const calendarString = calendars
      .reduce((acc, el, index) => `${acc}\n${index + 1}_ ${el.name}`, '')
      .slice(1);
    return {
      response: `¿En cual calendario te gustaria reservar?\n${calendarString}\nSi queres cancelar escribi *cancelar*`,
      messageId,
    };
  }

  private async chooseTypeEvent(
    messageId: string,
    buffer: any,
    admin: Admin,
  ): Promise<AnswerFunctionOutput> {
    const [typeOfEvents] = await this.typeEventService.get(admin);
    const typeOfEventsString = typeOfEvents
      .reduce((acc, el, index) => `${acc}\n${index + 1}_ ${el.name}`, '')
      .slice(1);
    return {
      response: `¿Que tipo de evento te gustaria reservar?\n${typeOfEventsString}\nSi queres cancelar escribi *cancelar*`,
      messageId,
      buffer,
    };
  }

  private async newEventNotification(
    admin: Admin,
    name: string,
    date: DateTime,
    timeFrom: string,
    timeTo: string,
    sendMessage: (from: string, response: string) => any,
  ): Promise<void> {
    if (admin) {
      sendMessage(
        admin.wppId,
        `${name} reservo un turno para el dia ${date.toFormat(
          'dd/MM/yyyy',
        )} desde las ${timeFrom} hasta las ${timeTo}`,
      );
    }
  }

  private userNotFound(): Answer {
    return {
      function: () => ({
        response: `Al parecer eres nuevo por aqui! ¿Cual es tu nombre?`,
        messageId: 'user_not_found',
      }),
      messageId: 'user_not_found',
      keywords: ['.'],
    };
  }

  private welcome(nextFunction): Answer {
    return {
      messageId: 'welcome',
      keywords: ['.'],
      function: () => ({
        response: `Bienvenido a la barberia Alcorta`,
        messageId: 'welcome',
        nextAnswer: nextFunction,
      }),
    };
  }

  private welcomeAnswer(): Answer {
    return {
      previousMessageId: 'welcome',
      messageId: 'welcome_answer',
      keywords: ['.'],
      fallback: () => ({
        messageId: 'welcome_answer',
        nextAnswer: this.welcomeAnswer(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: () => ({
        response: `¿En que podemos ayudarte?\n
          1_ Ver disponibilidad\n
          2_ Reservar\n
          3_ Cancelar reserva\n
          4_ Ver reservas`,
        messageId: 'welcome_answer',
      }),
    };
  }

  private async processResponse(
    matchAnswer: Answer,
    wppId: string,
    userMemory: MemoryStatus,
    message: string,
    sendMessage: (from: string, response: string) => any,
    admin: Admin,
  ): Promise<string[]> {
    const response: AnswerFunctionOutput = await matchAnswer.function({
      buffer: userMemory.buffer,
      message,
      messageId: matchAnswer.messageId,
      wppId,
      sendMessage,
      admin,
    });
    let responses: string[] = [];
    if (response) {
      if (!response.resetConversation) {
        this.updateMemory(wppId, response.messageId, response.buffer);
      } else {
        this.resetConversation(wppId);
      }
      responses.push(response.response);
      if (response.nextAnswer) {
        const nextResponses = await this.processResponse(
          response.nextAnswer,
          wppId,
          userMemory,
          message,
          sendMessage,
          admin,
        );
        responses = [...responses, ...nextResponses];
      }
      return responses.filter((r) => !!r);
    }
    return ['Lo siento no pude entenderte'];
  }

  private getUserMemory(wppId: string) {
    let userMemoryStatus = memoryStatus.find((m) => m.wppId == wppId);
    if (!userMemoryStatus) {
      userMemoryStatus = {
        wppId,
        messageIds: [],
        buffer: {},
      };
      memoryStatus.push(userMemoryStatus);
    }
    return userMemoryStatus;
  }

  private async getUser(
    wppId: string,
    userMemory: MemoryStatus,
    admin: Admin,
  ): Promise<{ user?: User; answer?: Answer }> {
    const user = await this.userService.getOneBy('wppId', wppId, admin);
    if (!user && userMemory.messageIds.at(-1) != 'user_not_found') {
      return { answer: this.welcome(this.userNotFound()) };
    }
    return { user };
  }

  private async getMatchAnswer(
    userResponse: string,
    userMemory: MemoryStatus,
    admin: Admin,
  ): Promise<Answer> {
    const answers = this.getAnswers(admin);
    const lastMessageId = userMemory.messageIds.at(-1);
    const answersWithPreviousMessageId = answers.filter(
      (answer) =>
        ((answer.previousMessageId == lastMessageId &&
          answer.previousMessageId) ||
          (!lastMessageId && !answer.previousMessageId)) &&
        answer.keywords.some((keyword) =>
          new RegExp(keyword, 'i').test(userResponse),
        ),
    );
    if (answersWithPreviousMessageId.length == 1)
      return answersWithPreviousMessageId[0];

    if (answersWithPreviousMessageId.length <= 0) {
      const lastMessage = answers.find(
        ({ messageId }) => messageId == lastMessageId,
      );
      if (lastMessage && lastMessage.fallback)
        return {
          ...lastMessage,
          function: lastMessage.fallback,
        };
      return this.welcomeAnswer();
    }
    if (answersWithPreviousMessageId.length > 1) {
      console.log('Hay muchas respuestas', answersWithPreviousMessageId);
    }
  }
  public async messageHandler(
    message: string,
    wppId: string,
    adminId: string,
    sendMessage: (from: string, response: string) => any,
  ): Promise<string[]> {
    const admin = await this.adminService.getOne(adminId);
    if (!admin) throw new NotFoundException('error.ADMIN_NOT_FOUND');
    const userMemory = this.getUserMemory(wppId);
    const { user, answer } = await this.getUser(wppId, userMemory, admin);
    let matchAnswer: Answer;
    if (answer) {
      matchAnswer = answer;
    } else {
      matchAnswer = await this.getMatchAnswer(message, userMemory, admin);
    }

    if (matchAnswer) {
      return this.processResponse(
        matchAnswer,
        wppId,
        userMemory,
        message,
        sendMessage,
        admin,
      );
    }
  }
}
