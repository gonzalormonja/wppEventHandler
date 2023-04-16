import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

const SESSION_FILE_PATH = './session';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_FILE_PATH }),
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('Authenticated'));
client.on('auth_failure', () => console.log('auth_failure'));
client.on('message', (msg) => {
  console.log('message', msg);
  client.sendMessage(msg.from, 'Automatic message');
});
client.initialize();
