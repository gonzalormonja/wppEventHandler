import { Controller, Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get('/health')
  public async health() {
    return 'OK';
  }
}
