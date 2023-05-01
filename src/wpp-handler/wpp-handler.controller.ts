import { Controller, Get, Param } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { WppHandlerService } from './wpp-handler.service';

const SESSION_FILE_PATH = '../../session';

@Controller('wpp-handler')
export class WppHandlerController {
  client: Client;
  constructor(private readonly wppHandlerService: WppHandlerService) {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_FILE_PATH }),
      puppeteer: {
        args: ['--no-sandbox'],
      },
    });
    this.client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
    this.client.on('authenticated', () => console.log('Authenticated'));
    this.client.on('auth_failure', () => console.log('auth_failure'));
    this.client.on('message', async (msg) => {
      const response = await this.wppHandlerService.messageHandler(
        msg.body,
        '1',
      );
      this.client.sendMessage(msg.from, response);
    });
    this.client.initialize();
  }

  @Get(':message')
  public async messageHandler(
    @Param('message') message: string,
  ): Promise<string> {
    return this.wppHandlerService.messageHandler(message, '1');
  }
}
