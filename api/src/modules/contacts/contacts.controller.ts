import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service.js';
import { Public } from '../auth/public.decorator.js';
import { PublicContactDto } from './dto/public-contact.dto.js';
import type * as schema from '../../database/schema.js';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contact requests and leads' })
  @ApiResponse({ status: 200, description: 'List of contacts with assigned user' })
  findAll() {
    return this.contactsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single contact by ID' })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit a new contact request' })
  @ApiResponse({ status: 202, description: 'Yêu cầu liên hệ đã được tiếp nhận và đưa vào hàng đợi xử lý' })
  @ApiResponse({ status: 400, description: 'Invalid visitor data or a non-whitelisted property' })
  create(@Body(new ValidationPipe({
    expectedType: PublicContactDto,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
  })) data: PublicContactDto) {
    return this.contactsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact status and admin note' })
  update(@Param('id') id: string, @Body() data: Partial<schema.NewContact>) {
    return this.contactsService.update(id, data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contact status specifically' })
  updateStatus(@Param('id') id: string, @Body() data: Partial<schema.NewContact>) {
    return this.contactsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact submission' })
  delete(@Param('id') id: string) {
    return this.contactsService.delete(id);
  }
}
