import { Controller } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

const SESSION_FILE_PATH = '../../session';

@Controller('wpp-handler')
export class WppHandlerController {
  client: Client;
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_FILE_PATH }),
      puppeteer: {
        args: ['--no-sandbox'],
      },
    });
    this.client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
    this.client.on('authenticated', () => console.log('Authenticated'));
    this.client.on('auth_failure', () => console.log('auth_failure'));
    this.client.on('message', (msg) => {
      this.client.sendMessage(msg.from, 'Automatic message');
    });
    this.client.initialize();
  }
}
