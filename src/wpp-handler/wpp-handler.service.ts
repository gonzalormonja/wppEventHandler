import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AdminService } from 'src/admin/admin.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { CalendarService } from 'src/calendar/calendar.service';
import { TypeEvent } from 'src/entities/type-event.entity';
import { User } from 'src/entities/user.entity';
import { EventService } from 'src/event/event.service';
import { GetEventService } from 'src/get-event/get-event.service';
import { TypeEventService } from 'src/type-event/type-event.service';
import { UserService } from 'src/user/user.service';
import convertHourToMinute from 'src/utils/convert-hour-to-minute';
import convertMinuteToHour from 'src/utils/convert-minute-to-hour';

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
  fallback?: any; //use this when user send wrong response
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
  private async getAvailability(
    calendarId: string,
    dateString: string,
    typeEvent: TypeEvent,
  ): Promise<string> {
    const date = DateTime.fromFormat(dateString, 'dd-MM-yyyy');
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
    date: string,
    from: string,
    to: string,
    userId: string,
    typeEventId: string,
  ): Promise<boolean> {
    const startDateTime = DateTime.fromFormat(
      `${date} ${from}`,
      'dd-MM-yyyy HH:mm',
    );
    const endDateTime = DateTime.fromFormat(
      `${date} ${to}`,
      'dd-MM-yyyy HH:mm',
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
    date: string,
    timeFrom: string,
    timeTo: string,
  ): Promise<void> {
    const admin = await this.adminService.getOne(adminId);
    if (admin) {
      //todo send notification to other whatsapp
      console.log(`send notification to ${admin.wppId}`);
      console.log(
        `${name} reservo un turno para el dia ${date} desde las ${timeFrom} hasta las ${timeTo}`,
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
      {
        previousMessageId: 'welcome_answer',
        keywords: ['1'],
        messageId: 'get_availability_calendar',
        function: async () => this.chooseCalendar('get_availability_calendar'),
      },
      {
        previousMessageId: 'get_availability_calendar',
        keywords: ['.'],
        messageId: 'get_availability_date',
        function: async ({ message }) => {
          if (message == 'cancelar') {
            return this.welcomeAnswer();
          }
          const [calendars] = await this.calendarService.get();
          const calendar = calendars[parseInt(message) - 1];

          //todo if doesn't understand calendar question against
          if (!calendar) {
            return {
              resetConversation: true,
              response: 'Calendario no encontrado',
              nextAnswer: this.welcomeAnswer(),
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
      },
      {
        previousMessageId: 'get_availability_date',
        keywords: ['.'],
        messageId: 'get_availability_type_event',
        function: async ({ message, buffer }) => {
          const response = await this.chooseTypeEvent(
            'get_availability_type_event',
            buffer,
          );
          return {
            ...response,
            buffer: {
              ...response.buffer,
              date: message,
            },
          };
        },
      },
      {
        previousMessageId: 'get_availability_type_event',
        keywords: ['.'],
        messageId: 'get_availability_response',
        function: async ({ message, buffer }) => {
          const [typeEvents] = await this.typeEventService.get();
          const typeEvent = typeEvents[parseInt(message) - 1];
          if (!typeEvent)
            return {
              resetConversation: true,
              response: 'Tipo de evento no encontrado',
              nextAnswer: this.welcomeAnswer(),
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
      {
        previousMessageId: 'welcome_answer',
        keywords: ['2'],
        messageId: 'add_event_calendar',
        function: () => this.chooseCalendar('add_event_calendar'),
      },
      {
        previousMessageId: 'add_event_calendar',
        keywords: ['.'],
        messageId: 'add_event_type_event',
        function: async ({ message, buffer }) => {
          const [calendars] = await this.calendarService.get();
          const calendar = calendars[parseInt(message) - 1];
          //todo if doesn't understand calendar question against
          if (!calendar) {
            return {
              response: 'Calendario no encontrado',
              nextAnswer: this.welcomeAnswer(),
              resetConversation: true,
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
      },
      {
        previousMessageId: 'add_event_type_event',
        keywords: ['.'],
        messageId: 'add_event_date',
        function: async ({ message }) => {
          const [typeEvents] = await this.typeEventService.get();
          const typeEvent = typeEvents[parseInt(message) - 1];
          if (!typeEvent)
            return {
              resetConversation: true,
              response: 'Tipo de evento no encontrado',
              nextAnswer: this.welcomeAnswer(),
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
      },
      {
        previousMessageId: 'add_event_date',
        keywords: ['.'],
        messageId: 'add_event_time',
        function: ({ message }) => {
          return {
            response: `¿Desde que horario a que horario?\n`,
            buffer: { date: message },
            messageId: 'add_event_time',
          };
        },
      },
      {
        previousMessageId: 'add_event_time',
        keywords: ['.'],
        messageId: 'add_event_response',
        function: async ({ wppId, buffer, message, adminId }) => {
          const user = await this.userService.getOneBy('wppId', wppId);
          const from = message;
          const to = convertMinuteToHour(
            convertHourToMinute(from) + buffer.typeEvent.durationInMinutes,
          );
          const isCreated = await this.addEvent(
            `${buffer.typeEvent.name} - ${user.name}`,
            buffer.calendarId,
            buffer.date,
            from,
            to,
            user.id,
            buffer.typeEvent.id,
          );

          await this.newEventNotification(
            adminId,
            user.name,
            buffer.date,
            from,
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
          const response = events.reduce((acc, el, index) => {
            const date = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('dd-MM-yyyy');
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
          return {
            response: `Tienes las siguientes reservas\n${response}\n\n¿Cual deseas cancelar?`,
            messageId: 'remove_event',
          };
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
          ).toFormat('dd-MM-yyyy');
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
          const response = events.reduce((acc, el) => {
            const date = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('dd-MM-yyyy');
            const from = DateTime.fromJSDate(
              new Date(el.startDateTime),
            ).toFormat('HH:mm');
            const to = DateTime.fromJSDate(new Date(el.endDateTime)).toFormat(
              'HH:mm',
            );
            return `${acc}\nEl dia ${date} desde ${from}hs hasta ${to}hs`;
          }, '');
          return {
            response: `Tienes las siguientes reservas\n${response}`,
            nextAnswer: this.welcomeAnswer(),
            resetConversation: true,
            messageId: 'get_events',
          };
        },
      },
    ];
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
        answer.previousMessageId == lastMessageId &&
        answer.previousMessageId &&
        answer.keywords.some((keyword) =>
          new RegExp(keyword, 'i').test(userResponse),
        ),
    );
    const otherAnswers = answers.filter(
      (answer) =>
        !answer.previousMessageId &&
        answer.keywords.some((keyword) =>
          new RegExp(keyword, 'i').test(userResponse),
        ),
    );
    if (answersWithPreviousMessageId.length == 1)
      return answersWithPreviousMessageId[0];
    if (otherAnswers.length == 1) return otherAnswers[0];

    console.log(
      'Hay muchas respuestas',
      answersWithPreviousMessageId,
      otherAnswers,
    );
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
