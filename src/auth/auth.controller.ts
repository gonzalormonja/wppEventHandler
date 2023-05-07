import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../interceptors/guards/accessToken.guard';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenOutput } from './models/token.output';
import { SignInInput } from './models/sign-in.input.ts';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  @Public()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: TokenOutput })
  @ApiResponse({ status: 404 })
  signIn(@Body() body: SignInInput) {
    return this.authService.signIn(body);
  }
}
