// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Wpp bot')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.enableCors();
  await app.listen(process.env.SERVER_PORT);
}
bootstrap();

// import { Client, LocalAuth } from 'whatsapp-web.js';
// import * as qrcode from 'qrcode-terminal';

// const SESSION_FILE_PATH = './session';

// const client = new Client({
//   authStrategy: new LocalAuth({ dataPath: SESSION_FILE_PATH }),
// });

// client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
// client.on('authenticated', () => console.log('Authenticated'));
// client.on('auth_failure', () => console.log('auth_failure'));
// client.on('message', (msg) => {
//   console.log('message', msg);
//   client.sendMessage(msg.from, 'Automatic message');
// });
// client.initialize();
