import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API Health Check / Root Greeting' })
  @ApiResponse({ status: 200, description: 'Welcome greeting string', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
