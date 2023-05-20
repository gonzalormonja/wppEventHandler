import { Controller, Get } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('./../package.json');
@Controller('')
export class AppController {
  @Get('/health')
  public async health() {
    return 'OK';
  }
  @Get('/version')
  public async version() {
    return version;
  }
}
