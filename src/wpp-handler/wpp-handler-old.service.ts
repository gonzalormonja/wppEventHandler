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
import convertMinuteToHour from '../utils/convert-minute-to-hour';
import datesRegExp from '../utils/dates-reg-exp';
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
export class WppHandlerOldService {
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
        function: async ({ message, wppId, admin }) => {
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
      this.getAvailabilityDate2(),
      this.getAvailabilityTypeEvent(),
      this.getAvailabilityTypeEvent2(admin),
      {
        previousMessageId: 'get_availability_type_event',
        keywords: ['^detalle \\d{1,2}$'],
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
      {
        previousMessageId: 'add_event_calendar',
        keywords: ['^1$'],
        messageId: 'faq1',
        function: async ({ message, buffer, admin }) => ({
          response: `Elegi la opcion 1 en el menu de inicio, elegi el menu deseado e ingresa pedir <numero del menu>`,
          nextAnswer: this.addEventChooseCalendar(admin),
          messageId: 'faq1',
        }),
      },
      {
        previousMessageId: 'add_event_calendar',
        keywords: ['^2$'],
        messageId: 'faq2',
        function: async ({ message, buffer, admin }) => ({
          response: `Los metodos de pago son MercadoPago, efectivo y transferencia`,
          nextAnswer: this.addEventChooseCalendar(admin),
          messageId: 'faq2',
        }),
      },
      {
        previousMessageId: 'add_event_calendar',
        keywords: ['^3$'],
        messageId: 'faq3',
        function: async ({ message, buffer, admin }) => ({
          response: `Los horarios son de martes a domingo de 10:00hs a 14:00hs`,
          nextAnswer: this.addEventChooseCalendar(admin),
          messageId: 'faq3',
        }),
      },
      {
        previousMessageId: 'add_event_calendar',
        keywords: ['^volver$'],
        messageId: 'faq4',
        function: async ({ message, buffer, admin }) => ({
          nextAnswer: this.welcomeAnswer(),
          messageId: 'faq4',
          resetConversation: true,
        }),
      },
      {
        previousMessageId: 'welcome_answer',
        keywords: ['^3$'],
        messageId: 'pedidos',
        function: async ({ message, buffer, admin }) => ({
          response: `Tienes un pedido de milanesas con papas fritas para hoy! Horario estimado de 11:30 a 12:00`,
          messageId: 'pedidos',
          resetConversation: true,
        }),
      },
      {
        previousMessageId: 'welcome_answer',
        keywords: ['^4$'],
        messageId: 'sugerencias',
        function: async ({ message, buffer, admin }) => ({
          response: `Envianos tu comentario por favor`,
          messageId: 'sugerencias',
        }),
      },
      {
        previousMessageId: 'sugerencias',
        keywords: ['.'],
        messageId: 'sugerencias2',
        function: async ({ message, buffer, admin }) => ({
          response: `Gracias!`,
          messageId: 'sugerencias2',
          resetConversation: true,
        }),
      },
    ];
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
      function: async () => ({
        response: `1_ ¿Como pedir?\n2_ ¿Cuales son los metodos de pago?\n3_ ¿Cuales son los horarios de atención?\nPara volver escriba *volver*`,
        messageId: 'add_event_calendar',
      }),
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
      function: async () => ({
        response: `Estos son los menus que tenemos para para hoy:\n1_ Milanesa con papas fritas $850\n\nSi deseas obtener informacion sobre algun menu escribe detalle <numero del menu>.\nSi deseas pedir un menu escribe pedir <numero del menu>.`,
        messageId: 'get_availability_calendar',
      }),
    };
  }

  private getAvailabilityDate2(): Answer {
    return {
      previousMessageId: 'get_availability_calendar',
      keywords: ['^pedir \\d{1,2}$'],
      messageId: 'get_availability_date2',
      fallback: () => ({
        messageId: 'get_availability_date2',
        nextAnswer: this.getAvailabilityDate2(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        return {
          response: `Gracias por su pedido`,
          messageId: 'get_availability_date2',
          resetConversation: true,
        };
      },
    };
  }

  private getAvailabilityDate(): Answer {
    return {
      previousMessageId: 'get_availability_calendar',
      keywords: ['^detalle \\d{1,2}$'],
      messageId: 'get_availability_date',
      fallback: () => ({
        messageId: 'get_availability_date',
        nextAnswer: this.getAvailabilityDate(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        return {
          response: `El menu milanesas con papas fritas incluye una milanesa de 350g junto con 150g de papas fritas, un trozo de pan. Tiene un valor de $850.\nSi quieres pedirlo escribe *pedir*\nPara volver al menu anterior escribe *volver*`,
          messageId: 'get_availability_date',
        };
      },
    };
  }

  private getAvailabilityTypeEvent(): Answer {
    return {
      previousMessageId: 'get_availability_date',
      keywords: ['^pedir$'],
      messageId: 'get_availability_type_event',
      fallback: () => ({
        messageId: 'get_availability_type_event',
        nextAnswer: this.getAvailabilityTypeEvent(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        return {
          response: `Gracias por su pedido`,
          messageId: 'get_availability_type_event',
          resetConversation: true,
        };
      },
    };
  }

  private getAvailabilityTypeEvent2(admin): Answer {
    return {
      previousMessageId: 'get_availability_date',
      keywords: ['^volver$'],
      messageId: 'get_availability_type_event2',
      fallback: () => ({
        messageId: 'get_availability_type_event2',
        nextAnswer: this.getAvailabilityTypeEvent(),
        response: 'Lo siento, no pude entenderte.',
      }),
      function: async ({ message, buffer, admin }) => {
        return {
          messageId: 'get_availability_type_event2',
          nextAnswer: this.getAvailabilityChooseCalendar(admin),
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

  private updateMemory(wppId: string, messageId: string, buffer: any): void {
    const memory = this.getUserMemory(wppId);
    memoryStatus = memoryStatus.filter(({ wppId }) => memory.wppId != wppId);
    memoryStatus.push({
      ...memory,
      messageIds: [...memory.messageIds, messageId],
      buffer: { ...memory.buffer, ...buffer },
    });
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
        response: `Bienvenido a Alcorta`,
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
          1_ Ver menus\n
          2_ Preguntas frecuentes\n
          3_ Ver pedidos\n
          4_ Comentarios y sugerencias`,
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
    const { answer } = await this.getUser(wppId, userMemory, admin);
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
