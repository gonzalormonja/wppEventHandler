import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AdminService } from 'src/admin/admin.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { CalendarService } from 'src/calendar/calendar.service';
import { Calendar } from 'src/entities/calendar.entity';
import { TypeEvent } from 'src/entities/type-event.entity';
import { User } from 'src/entities/user.entity';
import { EventService } from 'src/event/event.service';
import { GetEventService } from 'src/get-event/get-event.service';
import { TypeEventService } from 'src/type-event/type-event.service';
import { UserService } from 'src/user/user.service';
import convertHourToMinute from 'src/utils/convert-hour-to-minute';
import convertMinuteToHour from 'src/utils/convert-minute-to-hour';
import datesRegExp from 'src/utils/dates-reg-exp';
import timesRegExp from 'src/utils/times-reg-exp';

interface AnswerFunction {
  message?: string;
  buffer?: any;
  wppId?: string;
  messageId?: string;
  adminId: string;
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

  private getAnswers(): Answer[] {
    return [
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
        function: async ({ message, buffer, wppId }) => {
          await this.userService.create({
            name: message,
            wppId,
          });
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
      this.getAvailabilityChooseCalendar(),
      this.getAvailabilityDate(),
      this.getAvailabilityTypeEvent(),
      {
        previousMessageId: 'get_availability_type_event',
        keywords: ['^\\d{1,2}$'],
        messageId: 'get_availability_response',
        function: async ({ message, buffer }) => {
          const [typeEvents] = await this.typeEventService.get();
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
          );
          return {
            response: `La disponibilidad para la fecha ${buffer.date} del calendario ${buffer.calendarName} es\n${availabilityString}`,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'get_availability_response',
          };
        },
      },
      this.addEventChooseCalendar(),
      this.addEventTypeEvent(),
      this.addEventDate(),
      this.addEventTime(),
      {
        previousMessageId: 'add_event_time',
        keywords: timesRegExp.map((timeRegEx) => timeRegEx.regExp),
        messageId: 'add_event_response',
        function: async ({ wppId, buffer, message, adminId }) => {
          const user = await this.userService.getOneBy('wppId', wppId);

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
          );

          await this.newEventNotification(
            adminId,
            user.name,
            buffer.date,
            from.toFormat('HH:mm'),
            to,
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
      {
        previousMessageId: 'welcome_answer',
        keywords: ['3'],
        messageId: 'remove_event',
        function: async ({ wppId, buffer, message, adminId }) => {
          const user = await this.userService.getOneBy('wppId', wppId);
          const [events] = await this.getEventService.get(user.id);
          const eventsString = events.reduce((acc, el, index) => {
            const date = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('dd/MM/yyyy');
            const from = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('HH:mm');
            const to = DateTime.fromJSDate(new Date(el.endDateTime)).toFormat(
              'HH:mm',
            );
            return `${acc}\n${
              index + 1
            }_ El dia ${date} desde ${from}hs hasta ${to}hs`;
          }, '');
          let response: AnswerFunctionOutput = {
            response: `Tienes las siguientes reservas\n${eventsString}\n\n¿Cual deseas cancelar?`,
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
      },
      {
        previousMessageId: 'remove_event',
        keywords: ['.'],
        messageId: 'remove_event_confirm',
        function: async ({ wppId, buffer, message, adminId }) => {
          const user = await this.userService.getOneBy('wppId', wppId);
          const [events] = await this.getEventService.get(user.id);
          const event = events[parseInt(message) - 1];
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
      },
      {
        previousMessageId: 'remove_event_confirm',
        keywords: ['1'],
        messageId: 'remove_event_yes',
        function: async ({ wppId, buffer, message, adminId }) => {
          await this.eventServixe.delete(buffer.eventId);

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
        keywords: ['2'],
        messageId: 'remove_event_no',
        function: () => ({
          resetConversation: true,
          nextAnswer: this.welcomeAnswer(),
          messageId: 'remove_event_no',
        }),
      },
      {
        previousMessageId: 'welcome_answer',
        keywords: ['4'],
        messageId: 'get_events',
        function: async ({ wppId, buffer, message, adminId }) => {
          const user = await this.userService.getOneBy('wppId', wppId);
          const [events] = await this.getEventService.get(user.id);
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

  private addEventChooseCalendar(): Answer {
    return {
      previousMessageId: 'welcome_answer',
      keywords: ['2'],
      messageId: 'add_event_calendar',
      fallback: () => ({
        messageId: 'add_event_calendar',
        nextAnswer: this.getAvailabilityChooseCalendar(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async () => this.chooseCalendar('add_event_calendar'),
    };
  }

  private addEventTypeEvent(): Answer {
    return {
      previousMessageId: 'add_event_calendar',
      keywords: ['.'],
      messageId: 'add_event_type_event',
      function: async ({ message, buffer }) => {
        let calendar: Calendar = null;
        if (message.length > 0) {
          const [calendars] = await this.calendarService.get();
          calendar = calendars[parseInt(message) - 1];
        }

        if (!calendar)
          calendar = await this.calendarService.getOne(buffer.calendarId);

        //todo if doesn't understand calendar question against
        if (!calendar) {
          return {
            response: 'Calendario no encontrado',
            nextAnswer: this.addEventChooseCalendar(),
            messageId: 'add_event_type_event',
          };
        }
        const response = await this.chooseTypeEvent(
          'add_event_type_event',
          buffer,
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
      keywords: ['.'],
      messageId: 'add_event_date',
      fallback: () => ({
        messageId: 'add_event_date',
        nextAnswer: this.addEventDate(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message }) => {
        const [typeEvents] = await this.typeEventService.get();
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
          response: `¿A que hora?\n`,
          buffer: { date },
          messageId: 'add_event_time',
        };
      },
    };
  }

  private getAvailabilityChooseCalendar(): Answer {
    return {
      previousMessageId: 'welcome_answer',
      keywords: ['1'],
      messageId: 'get_availability_calendar',
      fallback: () => ({
        messageId: 'get_availability_calendar',
        nextAnswer: this.getAvailabilityChooseCalendar(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async () => this.chooseCalendar('get_availability_calendar'),
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
      function: async ({ message, buffer }) => {
        if (message == 'cancelar') {
          return {
            resetConversation: true,
            nextAnswer: this.welcomeAnswer(),
            messageId: 'get_availability_date',
          };
        }

        let calendar: Calendar = null;
        if (message.length > 0) {
          const [calendars] = await this.calendarService.get();
          calendar = calendars[parseInt(message) - 1];
        }

        if (!calendar)
          calendar = await this.calendarService.getOne(buffer.calendarId);

        //todo if doesn't understand calendar question against
        if (!calendar) {
          return {
            response: 'Calendario no encontrado',
            nextAnswer: this.getAvailabilityChooseCalendar(),
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
      function: async ({ message, buffer }) => {
        const response = await this.chooseTypeEvent(
          'get_availability_type_event',
          buffer,
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
  ): Promise<string> {
    const { schedules } = await this.availabilityService.getAvailability(
      calendarId,
      date,
      typeEvent.id,
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
  ): Promise<boolean> {
    const startDateTime = DateTime.fromFormat(
      `${date.toFormat('dd/MM/yyyy')} ${from}`,
      'dd/MM/yyyy HH:mm',
    );
    const endDateTime = DateTime.fromFormat(
      `${date.toFormat('dd/MM/yyyy')} ${to}`,
      'dd/MM/yyyy HH:mm',
    );

    const event = await this.eventServixe.create({
      calendarId,
      description,
      startDateTime: startDateTime.toJSDate(),
      endDateTime: endDateTime.toJSDate(),
      userId,
      typeEventId,
    });
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
  ): Promise<AnswerFunctionOutput> {
    const [calendars] = await this.calendarService.get();
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
  ): Promise<AnswerFunctionOutput> {
    const [typeOfEvents] = await this.typeEventService.get();
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
    adminId: string,
    name: string,
    date: DateTime,
    timeFrom: string,
    timeTo: string,
  ): Promise<void> {
    const admin = await this.adminService.getOne(adminId);
    if (admin) {
      //todo send notification to other whatsapp
      console.log(`send notification to ${admin.wppId}`);
      console.log(
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
    response: AnswerFunctionOutput,
    wppId: string,
    userMemory: MemoryStatus,
    adminId: string,
    message: string,
  ): Promise<string[]> {
    let responses: string[] = [];
    if (response) {
      if (!response.resetConversation) {
        this.updateMemory(wppId, response.messageId, response.buffer);
      } else {
        this.resetConversation(wppId);
      }
      responses.push(response.response);
      if (response.nextAnswer) {
        const nextResponse: AnswerFunctionOutput =
          await response.nextAnswer.function({
            message,
            buffer: userMemory.buffer,
            wppId,
            messageId: response.messageId,
            adminId,
          });
        const nextResponses = await this.processResponse(
          nextResponse,
          wppId,
          userMemory,
          adminId,
          message,
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
  ): Promise<{ user?: User; answer?: Answer }> {
    const user = await this.userService.getOneBy('wppId', wppId);
    if (!user && userMemory.messageIds.at(-1) != 'user_not_found') {
      return { answer: this.welcome(this.userNotFound()) };
    }
    return { user };
  }

  private async getMatchAnswer(
    userResponse: string,
    userMemory: MemoryStatus,
  ): Promise<Answer> {
    const answers = this.getAnswers();
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
    adminId?: string,
  ): Promise<string[]> {
    const userMemory = this.getUserMemory(wppId);
    const { user, answer } = await this.getUser(wppId, userMemory);
    let matchAnswer: Answer;
    if (answer) {
      matchAnswer = answer;
    } else {
      matchAnswer = await this.getMatchAnswer(message, userMemory);
    }

    if (matchAnswer) {
      const response: AnswerFunctionOutput = await matchAnswer.function({
        buffer: userMemory.buffer,
        message,
        messageId: matchAnswer.messageId,
        wppId,
        adminId,
      });
      return this.processResponse(
        response,
        wppId,
        userMemory,
        adminId,
        message,
      );
    }
  }
}
