import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

interface Callback {
  message: string;
  fallback: () => Step;
}

interface Step {
  message: string[];
  callback?: (params: Callback) => Step;
  fallback?: () => Step;
}

interface MemoryStatus {
  wppId: string;
  buffer: any;
  currentStep: Step;
}

let memoriesStatus: MemoryStatus[] = [];

@Injectable()
export class WppHandlerFoodService {
  private memoryStatus: MemoryStatus = null;
  private categories = [
    {
      id: 1,
      name: 'Entrantes',
      menus: [
        { id: 1, name: 'Empanada', price: 4 },
        { id: 1, name: 'Jamón', price: 5 },
      ],
    },
    {
      id: 2,
      name: 'Platos principales',
      menus: [
        { id: 1, name: 'Paella', price: 20 },
        { id: 1, name: 'Pechuga de pollo a la parrilla', price: 10 },
      ],
    },
    {
      id: 3,
      name: 'Postres',
      menus: [
        { id: 1, name: 'Torta', price: 3 },
        { id: 1, name: 'Budin', price: 4 },
      ],
    },
  ];

  private principalFlow(): Step {
    return {
      message: [
        `¡Hola! ¿Cómo estás? Soy un asistente virtual, me pusieron a cargo de las conversaciones ya que el resto de mis compañeros humanos están trabajando en otras actividades. Te voy a ofrecer diferentes opciones para poder ayudarte mejor.`,
        ``,
        `1. Hacer un pedido`,
        `2. Hacer una reserva`,
        `3. Ver el menú`,
        `4. Soporte al cliente`,
        `5. Dejar un comentario o sugerencia`,
      ],
      callback: ({ message, fallback }) => {
        const steps = {
          '1': this.takeOrderCategory(),
          '2': this.bookingDate(),
          '3': this.getMenu(),
        };
        if (steps[message]) return steps[message];
        return fallback;
      },
    };
  }

  private takeOrderCategory(): Step {
    return {
      message: [
        `¡Excelente! Aquí tienes las categorías de nuestro menú, ¿qué te gustaría pedir hoy?`,
        ``,
        ...this.categories.map(
          (category, index) => `${index + 1}. ${category.name}`,
        ),
        `${this.categories.length + 1}. Volver al menú anterior`,
        `${this.categories.length + 2}. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const categories = this.categories.map((cat) => cat.id);
          if (parseInt(message) - categories.at(-1) === 2)
            return this.principalFlow();
          if (parseInt(message) - categories.at(-1) === 1)
            return this.principalFlow();
          const category = this.categories.find(
            (category) => category.id === parseInt(message),
          );
          if (!category) fallback();
          return this.takeOrderMenu(category);
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private takeOrderMenu(category): Step {
    this.updateMemory({
      ...this.memoryStatus,
      buffer: { ...this.memoryStatus.buffer, categoryId: category.id },
    });
    return {
      message: [
        `Aquí están nuestros platos de la categoria ${category.name} ¿Qué te gustaría pedir?:`,
        ``,
        ...category.menus.map(
          (menu, index) => `${index + 1}. ${menu.name} - $${menu.price}`,
        ),
        `${category.menus.length + 1}. Volver al menú anterior`,
        `${category.menus.length + 2}. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const { categoryId } = this.memoryStatus.buffer;
          const category = this.categories.find((cat) => cat.id === categoryId);
          const menus = category.menus.map((menu) => menu.id);
          if (parseInt(message) - menus.at(-1) === 2)
            return this.principalFlow();
          if (parseInt(message) - menus.at(-1) === 1)
            return this.principalFlow();
          const menu = category.menus.find(
            (menu) => menu.id === parseInt(message),
          );
          if (!menu) return fallback();
          return this.takeOrderAdd(menu);
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private takeOrderAdd(menu): Step {
    this.updateMemory({
      ...this.memoryStatus,
      buffer: {
        ...this.memoryStatus.buffer,
        orders: [...(this.memoryStatus.buffer.orders ?? []), menu],
      },
    });
    return {
      message: [
        `Perfecto, añadiremos una ${menu.name} a tu pedido. ¿Te gustaría agregar algo más a tu pedido?:`,
        ``,
        ...this.categories.map(
          (category, index) => `${index + 1}. ${category.name}`,
        ),
        `${this.categories.length + 1}. Finalizar pedido`,
        `${this.categories.length + 2}. Volver al menú anterior`,
        `${this.categories.length + 3}. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const categories = this.categories.map((cat) => cat.id);
          if (parseInt(message) - categories.at(-1) === 3)
            return this.principalFlow();
          if (parseInt(message) - categories.at(-1) === 2)
            return this.principalFlow();
          if (parseInt(message) - categories.at(-1) === 1)
            return this.takeOrderDelivery();
          const category = this.categories.find(
            (category) => category.id === parseInt(message),
          );
          if (!category) fallback();
          return this.takeOrderMenu(category);
        } catch (e) {
          return fallback();
        }
      },
    };
  }
  private takeOrderDelivery(): Step {
    return {
      message: [
        `¡Excelente! ¿Dónde te gustaría recibir tu pedido?`,
        ``,
        `1. Recoger en el local`,
        `2. Entrega a domicilio`,
        `3. Volver al menú anterior`,
        `4. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const steps = {
            '1': this.takeOrderLocalPickUp(),
            '2': this.takeOrderHomeDelivery(),
            '3': this.principalFlow(),
            '4': this.principalFlow(),
          };
          if (steps[message]) return steps[message];
          return fallback;
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private takeOrderHomeDelivery() {
    return {
      message: [
        `Perfecto, tu pedido será entregado a tu domicilio. Por favor, proporciona la siguiente información para completar tu pedido:`,
        `Dirección de entrega (nombre de calle, altura y número de dpto)`,
        ``,
        `1. Volver al menú anterior`,
        `2. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          return {
            message: [
              `¡Gracias! Tu pedido será entregado a *${message}, Paraná, Argentina*. ¿Hay algo más en lo que pueda ayudarte hoy?`,
              ``,
              `1. Hacer un pedido`,
              `2. Hacer una reserva`,
              `3. Ver el menú`,
              `4. Soporte al cliente`,
              `5. Dejar un comentario o sugerencia`,
            ],
            callback: ({ message, fallback }) => {
              const steps = {
                '1': this.takeOrderCategory(),
                '2': this.bookingDate(),
                '3': this.getMenu(),
              };
              if (steps[message]) return steps[message];
              return fallback;
            },
          };
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private takeOrderLocalPickUp() {
    return {
      message: [
        `Perfecto, te esperamos en nuestro local (San martin 420, Paraná, Argentina):`,
        ``,
        `1. Volver al menú anterior`,
        `2. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          return {
            message: [
              `¡Gracias! Tu pedido será entregado a ${message}, Paraná, Argentina. ¿Hay algo más en lo que pueda ayudarte hoy?`,
              ``,
              `1. Hacer otro pedido`,
              `2. Hacer una reserva`,
              `3. Ver el menú`,
              `4. Soporte al cliente`,
              `5. Dejar un comentario o sugerencia`,
            ],
            callback: ({ message, fallback }) => {
              const steps = {
                '1': this.takeOrderCategory(),
                '2': this.bookingDate(),
                '3': this.getMenu(),
              };
              if (steps[message]) return steps[message];
              return fallback;
            },
          };
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private bookingDate(): Step {
    return {
      message: [
        `¡Excelente! Estaré encantado de ayudarte a hacer una reserva. Por favor, proporciona la fecha y hora de la reserva (17/02/2022 15:30)`,
        ``,
        `1. Volver al menú anterior`,
        `2. Volver al menú principal`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const steps = {
            '1': this.principalFlow(),
            '2': this.principalFlow(),
          };
          if (steps[message]) return steps[message];
          return this.bookingNumerOfPeople(
            DateTime.fromFormat(message, 'dd/MM/yyyy HH:mm'),
          );
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private bookingNumerOfPeople(date: DateTime): Step {
    this.updateMemory({
      ...this.memoryStatus,
      buffer: {
        ...this.memoryStatus.buffer,
        date,
      },
    });
    return {
      message: [
        `¡Excelente! ¿Para cuantas personas es la reservación?`,
        ``,
        `0. Volver al menú anterior`,
      ],
      callback: ({ message, fallback }) => {
        try {
          const steps = {
            '0': this.principalFlow(),
          };
          if (steps[message]) return steps[message];
          return this.bookingSave(
            this.memoryStatus.buffer.date,
            parseInt(message),
          );
        } catch (e) {
          return fallback();
        }
      },
    };
  }

  private bookingSave(date: DateTime, numberOfPeople: number): Step {
    return {
      message: [
        `!Perfecto! Tengo tu reserva para el dia ${date.toFormat(
          'dd/MM/yyyy HH:mm',
        )} para ${numberOfPeople} persona${numberOfPeople > 1 && 's'}`,
        ``,
        `1. Hacer otro pedido`,
        `2. Hacer una reserva`,
        `3. Ver el menú`,
        `4. Soporte al cliente`,
        `5. Dejar un comentario o sugerencia`,
      ],
      callback: ({ message, fallback }) => {
        const steps = {
          '1': this.takeOrderCategory(),
          '2': this.bookingDate(),
          '3': this.getMenu(),
        };
        if (steps[message]) return steps[message];
        return fallback;
      },
    };
  }

  private getMenu(): Step {
    return {
      message: [
        `Este es nuestro menu:`,
        ...this.categories.map(
          (category) => `*${category.name}*:
        ${category.menus.map((menu) => `${menu.name} - $${menu.price}`)}`,
        ),
        ``,
        `1. Hacer otro pedido`,
        `2. Hacer una reserva`,
        `3. Ver el menú`,
        `4. Soporte al cliente`,
        `5. Dejar un comentario o sugerencia`,
      ],
      callback: ({ message, fallback }) => {
        const steps = {
          '1': this.takeOrderCategory(),
          '2': this.bookingDate(),
          '3': this.getMenu(),
        };
        if (steps[message]) return steps[message];
        return fallback;
      },
    };
  }

  private updateMemory(memory: MemoryStatus): void {
    this.removeMemory(memory);
    this.memoryStatus = memory;
    memoriesStatus.push(memory);
  }

  private removeMemory(memory: MemoryStatus): void {
    this.memoryStatus = null;
    memoriesStatus = memoriesStatus.filter(
      ({ wppId }) => memory.wppId != wppId,
    );
  }

  public messageHandler(wppId: string, message: string): string[] {
    this.memoryStatus = memoriesStatus.find(
      (memoryStatus) => wppId === memoryStatus.wppId,
    );
    if (!this.memoryStatus) {
      this.memoryStatus = {
        wppId,
        currentStep: null,
        buffer: {},
      };
      memoriesStatus.push(this.memoryStatus);
    }

    let step: Step = null;
    if (!this.memoryStatus.currentStep) {
      this.memoryStatus.currentStep = this.principalFlow();
      this.updateMemory(this.memoryStatus);
      step = this.principalFlow();
    } else {
      step = this.memoryStatus.currentStep.callback({
        fallback: this.memoryStatus.currentStep.fallback,
        message: message,
      });
      this.updateMemory({ ...this.memoryStatus, currentStep: step });
    }

    if (step) return [step.message.join('\n')];

    this.removeMemory(this.memoryStatus);
    return ['Algo salio mal'];
  }
}
