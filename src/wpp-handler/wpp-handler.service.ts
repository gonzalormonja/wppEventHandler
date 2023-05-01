import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AvailabilityService } from 'src/availability/availability.service';
import { CalendarService } from 'src/calendar/calendar.service';
import { EventService } from 'src/event/event.service';
import { UserService } from 'src/user/user.service';
import convertMinuteToHour from 'src/utils/convert-minute-to-hour';

interface Answer {
  messageId: string;
  keyword: string[];
  nested?: Answer[];
}

const answers: Answer[] = [
  {
    messageId: 'welcome_answer',
    keyword: [],
    nested: [
      {
        keyword: ['1'],
        messageId: 'get_availability_calendar',
        nested: [
          {
            keyword: [],
            messageId: 'get_availability_date',
            nested: [
              {
                keyword: [],
                messageId: 'get_availability_response',
              },
            ],
          },
        ],
      },
      {
        keyword: ['2'],
        messageId: 'add_event_calendar',
        nested: [
          {
            keyword: [],
            messageId: 'add_event_date',
            nested: [
              {
                keyword: [],
                messageId: 'add_event_time',
                nested: [
                  {
                    keyword: [],
                    messageId: 'add_event_response',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        keyword: ['3'],
        messageId: 'remove_event',
        nested: [
          {
            keyword: [],
            messageId: 'remove_event_confirm',
            nested: [
              {
                keyword: ['si'],
                messageId: 'remove_event_yes',
              },
              {
                keyword: ['no'],
                messageId: 'remove_event_yes',
              },
            ],
          },
        ],
      },
    ],
  },
];
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
  ) {}

  private async getCalendars(): Promise<string> {
    const [calendars] = await this.calendarService.get();
    return calendars
      .reduce((acc, el, index) => `${acc}\n${index + 1}_ ${el.name}`, '')
      .slice(1);
  }

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

  private async processMessage(
    userMessage: string,
    answer: Answer,
    wppId: string,
  ): Promise<string> {
    const answerFunctions = {
      welcome_answer: (answer: Answer) => {
        return {
          message: `Buenos dias! ¿En que podemos ayudarte?\n
        1_ Ver disponibilidad\n
        2_ Reservar\n
        1_ Cancelar reserva`,
        };
      },
      get_availability_calendar: async (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        const calendarString = await this.getCalendars();
        return {
          message: `¿De cual calendario te interesaria conocer la disponibilidad?\n${calendarString}`,
          buffer: {},
        };
      },
      get_availability_date: async (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        const [calendars] = await this.calendarService.get();
        const calendar = calendars[parseInt(message) - 1];

        //todo if doesn't understand calendar question against
        if (!calendar)
          return {
            message: 'Calendario no encontrado',
            resetConversation: true,
          };

        return {
          message: '¿Para que fecha?',
          buffer: {
            calendarId: calendar.id,
            calendarName: calendar.name,
          },
        };
      },
      get_availability_response: async (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        const availabilityString = await this.getAvailability(
          buffer.calendarId,
          message,
        );
        return {
          message: `La disponibilidad para la fecha ${message} del calendario ${buffer.calendarName} es\n${availabilityString}`,
          resetConversation: true,
        };
      },
      add_event_calendar: async (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        const calendarString = await this.getCalendars();
        return {
          message: `¿En cual calendario te gustaria reservar?\n${calendarString}`,
          buffer: {},
        };
      },
      add_event_date: async (answer: Answer, message: string, buffer: any) => {
        const [calendars] = await this.calendarService.get();
        const calendar = calendars[parseInt(message) - 1];
        //todo if doesn't understand calendar question against
        if (!calendar)
          return {
            message: 'Calendario no encontrado',
            resetConversation: true,
          };

        return {
          message: '¿Para que fecha?',
          buffer: {
            calendarId: calendar.id,
            calendarName: calendar.name,
          },
        };
      },
      add_event_time: async (answer: Answer, message: string, buffer: any) => {
        return {
          message: `¿Desde que horario a que horario?\n`,
          buffer: { date: message },
        };
      },
      add_event_response: async (
        answer: Answer,
        message: string,
        buffer: any,
        wppId: string,
      ) => {
        const user = await this.userService.getOneBy('wppId', wppId);
        const isCreated = await this.addEvent(
          'New event',
          buffer.calendarId,
          buffer.date,
          message,
          user.id,
        );
        return {
          message: `Evento agregado.\n`,
          resetConversation: true,
        };
      },
    };
    const memoryIndex = memoryStatus.findIndex((m) => m.wppId == wppId);
    const memory = memoryStatus[memoryIndex];
    const { message, buffer, resetConversation } = await answerFunctions[
      answer.messageId
    ](answer, userMessage, memory.buffer, wppId);
    if (resetConversation) {
      this.resetConversation(wppId);
    } else {
      memoryStatus.splice(memoryIndex, 1, {
        wppId,
        messageIds: [...memory.messageIds, answer.messageId],
        buffer: { ...memory.buffer, ...buffer },
      });
    }
    return message;
  }

  public async messageHandler(message: string, wppId: string): Promise<string> {
    let userMemoryStatus = memoryStatus.find((m) => m.wppId == wppId);
    let possibleAnswers = answers;
    if (!userMemoryStatus) {
      userMemoryStatus = {
        wppId,
        messageIds: [],
        buffer: {},
      };
      memoryStatus.push(userMemoryStatus);
    }
    const { messageIds } = userMemoryStatus;
    messageIds.forEach((messageId) => {
      possibleAnswers = possibleAnswers.find(
        (answer) => answer.messageId == messageId,
      ).nested;
    });
    const matchAnswer = possibleAnswers.find((answer) =>
      answer.keyword.includes(message),
    );
    const alternativeAnswer = possibleAnswers.find(
      (answer) => answer.keyword.length == 0,
    );

    if (matchAnswer) {
      return this.processMessage(message, matchAnswer, wppId);
    }
    if (alternativeAnswer) {
      return this.processMessage(message, alternativeAnswer, wppId);
    }
    return 'Lo siento no pude entenderte';
  }
}
