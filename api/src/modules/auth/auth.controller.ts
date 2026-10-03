import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import type { AdminRequest } from './auth.types.js';
import { Public } from './public.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiBody({ schema: { type: 'object', required: ['email', 'password'], properties: {
    email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' },
  } } })
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Get('me')
  @ApiBearerAuth()
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AdminRequest) {
    return request.admin;
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @Header('Cache-Control', 'no-store')
  @ApiBody({ schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: {
    currentPassword: { type: 'string', format: 'password' },
    newPassword: { type: 'string', format: 'password' },
  } } })
  changePassword(@Req() request: AdminRequest, @Body() body: unknown) {
    return this.auth.changePassword(request.admin.id, body);
  }
}

