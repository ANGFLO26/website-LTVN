import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import type * as schema from '../../database/schema.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admin and editor accounts' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user account' })
  create(@Body() data: schema.NewUser) {
    return this.usersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user account' })
  update(@Param('id') id: string, @Body() data: Partial<schema.NewUser>) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account' })
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
