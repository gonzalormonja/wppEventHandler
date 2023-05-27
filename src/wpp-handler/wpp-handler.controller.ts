import { Controller, Get, Param } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { WppHandlerService } from './wpp-handler.service';
import { AdminService } from '../admin/admin.service';
import * as uuid from 'uuid';
import { Public } from '../interceptors/guards/accessToken.guard';
import { ApiTags } from '@nestjs/swagger';
import { WppHandlerFoodService } from './wpp-handler-food.service';

const SESSION_FILE_PATH = __dirname + '/../../session';

@ApiTags('WppHandler')
@Controller('wpp-handler')
export class WppHandlerController {
  wppAdmins: {
    adminId: uuid;
    client: Client;
  }[] = [];
  constructor(
    private readonly wppHandlerService: WppHandlerFoodService,
    private readonly adminService: AdminService,
  ) {}

  public async startWpp() {
    const admins = await this.adminService.getAdmins();
    const promises = admins.map((admin) => {
      let wppAdmin = this.wppAdmins.find(
        (client) => client.adminId == admin.id,
      );
      if (!wppAdmin) {
        wppAdmin = {
          adminId: admin.id,
          client: new Client({
            authStrategy: new LocalAuth({
              dataPath: `${SESSION_FILE_PATH}/${admin.sessionPath}`,
            }),
            puppeteer: {
              args: ['--no-sandbox'],
            },
          }),
        };
        this.wppAdmins.push(wppAdmin);
      }
      const { client } = wppAdmin;
      client.on(`qr`, (qr) => {
        console.log(qrcode.generate(qr, { small: true }));
        console.log(`QR para ${admin.name}`);
      });
      client.on(`authenticated`, () =>
        console.log(`Authenticated ${admin.name}`),
      );
      client.on(`auth_failure`, () =>
        console.log(`auth_failure ${admin.name}`),
      );
      client.on(`message`, async (msg) => {
        const response = await this.wppHandlerService.messageHandler(
          `1`,
          msg.body,
        );
        response
          .filter((response) => response.length > 0)
          .forEach((response) => client.sendMessage(msg.from, response));
      });
      client.initialize();
    });
    await Promise.all(promises);
  }

  @Public()
  @Get(':message')
  public async messageHandler(
    @Param('message') message: string,
  ): Promise<string[]> {
    return this.wppHandlerService.messageHandler('1', message);
  }
}
