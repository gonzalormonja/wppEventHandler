import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AvailabilityService } from 'src/availability/availability.service';
import { CalendarService } from 'src/calendar/calendar.service';
import { EventService } from 'src/event/event.service';
import { UserService } from 'src/user/user.service';
import convertMinuteToHour from 'src/utils/convert-minute-to-hour';

interface AnswerFunction {
  message: string;
  buffer: any;
  wppId: string;
  messageId: string;
}
interface AnswerFunctionOutput {
  buffer?: any;
  response?: string;
  resetConversation?: boolean;
  nextMessageId?: string;
}
interface Answer {
  messageId: string;
  keyword: string[];
  nested?: Answer[];
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

  private welcomeAnswer(): AnswerFunctionOutput {
    return {
      response: `Buenos dias! ¿En que podemos ayudarte?\n
      1_ Ver disponibilidad\n
      2_ Reservar\n
      1_ Cancelar reserva`,
    };
  }

  private async chooseCalendar(): Promise<AnswerFunctionOutput> {
    const [calendars] = await this.calendarService.get();
    const calendarString = calendars
      .reduce((acc, el, index) => `${acc}\n${index + 1}_ ${el.name}`, '')
      .slice(1);
    return {
      response: `¿En cual calendario te gustaria reservar?\n${calendarString}\nSi queres cancelar escribi *cancelar*`,
    };
  }

  private getAnswers(): Answer[] {
    return [
      {
        messageId: 'reset',
        keyword: ['reset', 'resetear', 'reiniciar'],
        function: () => {
          return {
            response: 'Reiniciando',
            resetConversation: true,
            nextMessageId: 'welcome_answer',
          };
        },
      },
      {
        messageId: 'welcome_answer',
        keyword: [],
        function: () => {
          return this.welcomeAnswer();
        },
        nested: [
          {
            keyword: ['1'],
            messageId: 'get_availability_calendar',
            function: async () => this.chooseCalendar(),
            nested: [
              {
                keyword: [],
                messageId: 'get_availability_date',
                function: async ({ message }) => {
                  if (message == 'cancelar') {
                    return {
                      resetConversation: true,
                      nextMessageId: 'welcome_answer',
                    };
                  }
                  const [calendars] = await this.calendarService.get();
                  const calendar = calendars[parseInt(message) - 1];

                  //todo if doesn't understand calendar question against
                  if (!calendar) {
                    return {
                      resetConversation: true,
                      response: 'Calendario no encontrado',
                      nextMessageId: 'welcome_answer',
                    };
                  }

                  return {
                    response: `¿Para que fecha?`,
                    buffer: {
                      calendarId: calendar.id,
                      calendarName: calendar.name,
                    },
                  };
                },
                nested: [
                  {
                    keyword: [],
                    messageId: 'get_availability_response',
                    function: async ({ message, buffer }) => {
                      const availabilityString = await this.getAvailability(
                        buffer.calendarId,
                        message,
                      );
                      return {
                        response: `La disponibilidad para la fecha ${message} del calendario ${buffer.calendarName} es\n${availabilityString}`,
                        nextMessageId: 'welcome_answer',
                        resetConversation: true,
                      };
                    },
                  },
                ],
              },
            ],
          },
          {
            keyword: ['2'],
            messageId: 'add_event_calendar',
            function: () => this.chooseCalendar(),
            nested: [
              {
                keyword: [],
                messageId: 'add_event_date',
                function: async ({ message }) => {
                  const [calendars] = await this.calendarService.get();
                  const calendar = calendars[parseInt(message) - 1];
                  //todo if doesn't understand calendar question against
                  if (!calendar) {
                    return {
                      response: 'Calendario no encontrado',
                      nextMessageId: 'welcome_answer',
                      resetConversation: true,
                    };
                  }
                  return {
                    response: '¿Para que fecha?',
                    buffer: {
                      calendarId: calendar.id,
                      calendarName: calendar.name,
                    },
                  };
                },
                nested: [
                  {
                    keyword: [],
                    messageId: 'add_event_time',
                    function: ({ message }) => {
                      return {
                        response: `¿Desde que horario a que horario?\n`,
                        buffer: { date: message },
                      };
                    },
                    nested: [
                      {
                        keyword: [],
                        messageId: 'add_event_response',
                        function: async ({ wppId, buffer, message }) => {
                          const user = await this.userService.getOneBy(
                            'wppId',
                            wppId,
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
                            nextMessageId: 'welcome_answer',
                            resetConversation: true,
                          };
                        },
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
            function: () => ({ response: 'todo' }),
            nested: [
              {
                keyword: [],
                messageId: 'remove_event_confirm',
                function: () => ({ response: 'todo' }),
                nested: [
                  {
                    keyword: ['si'],
                    messageId: 'remove_event_yes',
                    function: () => ({ response: 'todo' }),
                  },
                  {
                    keyword: ['no'],
                    messageId: 'remove_event_yes',
                    function: () => ({ response: 'todo' }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
  }

  private async processResponse(
    response: AnswerFunctionOutput,
    wppId: string,
    messageId: string,
  ): Promise<string[]> {
    let responses: string[] = [];
    if (response) {
      if (!response.resetConversation) {
        this.updateMemory(wppId, messageId, response.buffer);
      } else {
        this.resetConversation(wppId);
      }
      responses.push(response.response);
      if (response.nextMessageId) {
        const nextResponses = await this.messageHandler(
          '',
          wppId,
          response.nextMessageId,
        );
        responses = [...responses, ...nextResponses];
      }
      return responses.filter((r) => !!r);
    }
    return ['Lo siento no pude entenderte'];
  }

  public async messageHandler(
    message: string,
    wppId: string,
    messageId?: string,
  ): Promise<string[]> {
    let userMemoryStatus = memoryStatus.find((m) => m.wppId == wppId);
    let possibleAnswers = this.getAnswers();
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
    let matchAnswer: Answer = null;
    let alternativeAnswer: Answer = null;
    if (possibleAnswers) {
      matchAnswer = possibleAnswers.find(
        (answer) =>
          answer.keyword.includes(message) || answer.messageId == messageId,
      );
      alternativeAnswer = possibleAnswers.find(
        (answer) => answer.keyword.length == 0,
      );
    }

    let response: AnswerFunctionOutput = null;
    if (matchAnswer) {
      response = await matchAnswer.function({
        buffer: userMemoryStatus.buffer,
        message,
        messageId: matchAnswer.messageId,
        wppId,
      });
    }
    if (alternativeAnswer) {
      response = await alternativeAnswer.function({
        buffer: userMemoryStatus.buffer,
        message,
        messageId: alternativeAnswer.messageId,
        wppId,
      });
    }
    return this.processResponse(
      response,
      wppId,
      matchAnswer ? matchAnswer.messageId : alternativeAnswer.messageId,
    );
  }
}
