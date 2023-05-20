import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('/healthcheck')
  public async health() {
    return 'OK';
  }
}
