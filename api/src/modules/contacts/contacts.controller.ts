import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service.js';
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
  @ApiOperation({ summary: 'Submit a new contact request' })
  create(@Body() data: schema.NewContact) {
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
