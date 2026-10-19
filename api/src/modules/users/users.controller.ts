import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import type { CreateUserDto, UpdateUserDto } from './dto/user-mutation.dto.js';
import type { AdminRequest } from '../auth/auth.types.js';

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
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user account' })
  create(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user account' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateUserDto,
    @Req() req: AdminRequest,
  ) {
    if (
      req.admin?.id === id &&
      ((data.role !== undefined && data.role !== 'admin') ||
        (data.status !== undefined && data.status !== 'active'))
    ) {
      throw new BadRequestException(
        'Không thể tự hạ quyền hoặc vô hiệu hóa tài khoản quản trị đang đăng nhập.',
      );
    }
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account' })
  delete(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AdminRequest) {
    if (req.admin?.id === id) {
      throw new BadRequestException('Không thể xóa tài khoản quản trị đang đăng nhập.');
    }
    return this.usersService.delete(id);
  }
}
