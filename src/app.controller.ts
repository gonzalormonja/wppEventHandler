import { Controller, Get } from '@nestjs/common';
import { Public } from './interceptors/guards/accessToken.guard';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('./../package.json');
@Controller('')
export class AppController {
  @Get('/health')
  @Public()
  public async health() {
    return 'OK';
  }
  @Get('/version')
  @Public()
  public async version() {
    return version;
  }
}
