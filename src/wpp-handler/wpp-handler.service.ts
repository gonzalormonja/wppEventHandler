import { Injectable } from '@nestjs/common';

interface Answer {
  messageId: string;
  message: string;
  keyword: string[];
  nested?: Answer[];
}

const answers: Answer[] = [
  {
    messageId: 'welcome_answer',
    message: `Buenos dias! ¿En que podemos ayudarte?\n
    1_ Ver disponibilidad\n
    2_ Reservar\n
    1_ Cancelar reserva`,
    keyword: [],
    nested: [
      {
        keyword: ['1'],
        messageId: 'get_availability_calendar',
        message:
          '¿De cual calendario te interesaria conocer la disponibilidad?\n',
        //add calendars dynamically and
        nested: [
          {
            keyword: [],
            messageId: 'get_availability_date',
            message: '¿Para que fecha?\n',
            nested: [
              {
                keyword: [],
                messageId: 'get_availability_response',
                message: 'La disponibilidad es\n',
              },
            ],
          },
        ],
      },
      {
        keyword: ['2'],
        messageId: 'add_event_calendar',
        message: '¿En cual calendario te gustaria reservar?\n',
        //add calendars dynamically and
        nested: [
          {
            keyword: [],
            messageId: 'add_event_date',
            message: '¿Para que fecha?\n',
            nested: [
              {
                keyword: [],
                messageId: 'add_event_time',
                message: '¿Desde que horario a que horario?\n',
                //add event
              },
            ],
          },
        ],
      },
      {
        keyword: ['3'],
        messageId: 'remove_event',
        message: '¿Cual de las siguientes reservas te gustaria cancelar?\n',
        //add events dynamically and
        nested: [
          {
            keyword: [],
            messageId: 'remove_event_confirm',
            message:
              '¿Confirmas que deseas cancelar la reserva para del dia xxx desde las xxx hasta las xxx?\n',
            nested: [
              {
                keyword: ['si'],
                messageId: 'remove_event_yes',
                message: 'Reserva cancelada\n',
                //add event
              },
              {
                keyword: ['no'],
                messageId: 'remove_event_yes',
                message: 'Entonces no cancelo la reserva\n',
                //add event
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
const memoryStatus: MemoryStatus[] = [];

@Injectable()
export class WppHandlerService {
  private processMessage(
    userMessage: string,
    answer: Answer,
    wppId: string,
  ): string {
    const answerFunctions = {
      welcome_answer: (answer: Answer) => {
        return { message: answer.message };
      },
      get_availability_calendar: (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        return {
          message: `1_ Calendario de pedro\n2_ Calendario de juan`,
          buffer: {},
        };
      },
      get_availability_date: (answer: Answer, message: string, buffer: any) => {
        //save in buffer calendarName =message
        return { message: '', buffer: { calendarName: message } };
      },
      get_availability_response: (
        answer: Answer,
        message: string,
        buffer: any,
      ) => {
        //return availability for calendarName in buffer and date = message
        return {
          message: `La disponibilidad para la fecha ${message} del calendario ${buffer.calendarName} es`,
        };
      },
    };
    const memoryIndex = memoryStatus.findIndex((m) => m.wppId == wppId);
    const memory = memoryStatus[memoryIndex];
    const { message, buffer } = answerFunctions[answer.messageId](
      answer,
      userMessage,
      memory.buffer,
    );
    memoryStatus.splice(memoryIndex, 1, {
      wppId,
      messageIds: [...memory.messageIds, answer.messageId],
      buffer: { ...memory.buffer, ...buffer },
    });
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
