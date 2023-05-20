import { Controller, Get, Post } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('/health')
  public async health() {
    return 'OK';
  }
}
