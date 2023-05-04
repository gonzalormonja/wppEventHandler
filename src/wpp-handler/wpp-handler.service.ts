import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AdminService } from 'src/admin/admin.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { CalendarService } from 'src/calendar/calendar.service';
import { User } from 'src/entities/user.entity';
import { EventService } from 'src/event/event.service';
import { UserService } from 'src/user/user.service';
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
  ) {}
  private async getAvailability(
    calendarId: string,
    dateString: string,
  ): Promise<string> {
    const date = DateTime.fromFormat(dateString, 'dd-MM-yyyy');
    const { schedules } = await this.availabilityService.getAvailability(
      calendarId,
      date,
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
    time: string,
    userId: string,
  ): Promise<boolean> {
    const [from, to] = time.split(' a ');
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
    });
    return !!event;
  }

  private updateMemory(wppId: string, messageId: string, buffer: any): void {
    const memoryIndex = memoryStatus.findIndex((m) => m.wppId == wppId);
    const memory = memoryStatus[memoryIndex];
    memoryStatus.splice(memoryIndex, 1, {
      wppId,
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

  private async newEventNotification(
    adminId: string,
    name: string,
    date: string,
    timeFrom: string,
    timeTo: string,
  ): Promise<void> {
    const admin = await this.adminService.getOne(adminId);
    //todo send notification to other whatsapp
    console.log(`send notification to ${admin.wppId}`);
    console.log(
      `${name} reservo un turno para el dia ${date} desde las ${timeFrom} hasta las ${timeTo}`,
    );
  }

  private userNotFound(): Answer {
    return {
      function: () => ({
        response: `Al parecer eres nuevo por aqui! ¿Cual es tu nombre?`,
        messageId: 'user_not_found',
      }),
      messageId: 'user_not_found',
    };
  }

  private welcomeAnswer(): Answer {
    return {
      messageId: 'welcome_answer',
      keywords: ['.'],
      function: () => ({
        response: `¿En que podemos ayudarte?\n
          1_ Ver disponibilidad\n
          2_ Reservar\n
          1_ Cancelar reserva`,
        messageId: 'welcome_answer',
      }),
    };
  }

  private getAnswers(): Answer[] {
    return [
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
      this.userNotFound(),
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
        previousMessageId: 'welcome_anwser',
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
            return {
              resetConversation: true,
              nextAnswer: this.welcomeAnswer(),
              messageId: 'get_availability_date',
            };
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
        previousMessageId: 'get_availability_calendar',
        keywords: ['.'],
        messageId: 'get_availability_response',
        function: async ({ message, buffer }) => {
          const availabilityString = await this.getAvailability(
            buffer.calendarId,
            message,
          );
          return {
            response: `La disponibilidad para la fecha ${message} del calendario ${buffer.calendarName} es\n${availabilityString}`,
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
        messageId: 'add_event_date',
        function: async ({ message }) => {
          const [calendars] = await this.calendarService.get();
          const calendar = calendars[parseInt(message) - 1];
          //todo if doesn't understand calendar question against
          if (!calendar) {
            return {
              response: 'Calendario no encontrado',
              nextAnswer: this.welcomeAnswer(),
              resetConversation: true,
              messageId: 'add_event_date',
            };
          }
          return {
            response: '¿Para que fecha?',
            buffer: {
              calendarId: calendar.id,
              calendarName: calendar.name,
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
          const [from, to] = message.split(' a ');
          await this.newEventNotification(
            adminId,
            user.name,
            buffer.date,
            from,
            to,
          );
          const isCreated = await this.addEvent(
            'New event',
            buffer.calendarId,
            buffer.date,
            message,
            user.id,
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
        function: () => ({ response: 'remove_event', messageId: 'todo' }),
      },
      {
        previousMessageId: 'remove_event',
        keywords: ['.'],
        messageId: 'remove_event_confirm',
        function: () => ({
          response: 'todo',
          messageId: 'remove_event_confirm',
        }),
      },
      {
        previousMessageId: 'remove_event_confirm',
        keywords: ['si'],
        messageId: 'remove_event_yes',
        function: () => ({
          response: 'todo',
          messageId: 'remove_event_yes',
        }),
      },
      {
        previousMessageId: 'remove_event_confirm',
        keywords: ['no'],
        messageId: 'remove_event_yes',
        function: () => ({
          response: 'todo',
          messageId: 'remove_event_yes',
        }),
      },
    ];
  }

  private async getLastResponse(
    { messageIds, buffer, wppId }: MemoryStatus,
    adminId: string,
    message: string,
  ): Promise<AnswerFunctionOutput> {
    const possibleAnswers = this.getAnswers();
    let answer = null;
    messageIds.forEach((messageId) => {
      answer = possibleAnswers.find((answer) => answer.messageId == messageId);
    });
    if (!answer) {
      //todo return welcome
    }
    return await answer.function({
      buffer: buffer,
      message,
      messageId: answer.messageId,
      wppId,
      adminId,
    });
  }

  private async processResponse(
    response: AnswerFunctionOutput,
    wppId: string,
    messageId: string,
    userMemory: MemoryStatus,
    adminId: string,
    message: string,
  ): Promise<string[]> {
    let responses: string[] = [];
    if (response) {
      if (!response.resetConversation) {
        this.updateMemory(wppId, messageId, response.buffer);
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
            messageId,
            adminId,
          });
        const nextResponses = await this.processResponse(
          nextResponse,
          wppId,
          messageId,
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
      return userMemoryStatus;
    }
  }

  private async getUser(
    wppId: string,
    userMemory: MemoryStatus,
  ): Promise<{ user?: User; answer?: Answer }> {
    const user = await this.userService.getOneBy('wppId', wppId);
    if (!user && userMemory.messageIds.at(-1) != 'user_not_found') {
      return { answer: this.userNotFound() };
    }
    return { user };
  }

  private async getMatchAnswer(
    userResponse: string,
    wppId: string,
    userMemory: MemoryStatus,
  ): Promise<Answer> {
    const { user, answer } = await this.getUser(wppId, userMemory);
    if (!user) return answer;

    const answers = this.getAnswers();
    const lastMessageId = userMemory.messageIds.at(-1);
    const possibleAnswers = answers.filter(
      (answer) =>
        answer.previousMessageId == lastMessageId &&
        answer.keywords.some((keyword) =>
          new RegExp(keyword, 'i').test(userResponse),
        ),
    );
    if (possibleAnswers.length == 1) return possibleAnswers[0];
    console.log('Hay muchas respuestas', possibleAnswers);
  }
  public async messageHandler(
    message: string,
    wppId: string,
    adminId?: string,
  ): Promise<string[]> {
    const userMemory = this.getUserMemory(wppId);
    const matchAnswer = await this.getMatchAnswer(message, wppId, userMemory);

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
        response.messageId,
        userMemory,
        adminId,
        message,
      );
    }
  }
}
