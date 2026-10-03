import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandardsService } from './standards.service.js';
import { CreateStandardDto, UpdateStandardDto } from './dto/standard-mutation.dto.js';

const validationOptions = {
  transform: true,
  whitelist: true,
  forbidUnknownValues: true,
  transformOptions: { enableImplicitConversion: false },
};
const createValidation = new ValidationPipe({ ...validationOptions, expectedType: CreateStandardDto });
const updateValidation = new ValidationPipe({ ...validationOptions, expectedType: UpdateStandardDto });

@ApiTags('Standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all international standards' })
  @ApiResponse({ status: 200, description: 'List of standards' })
  findAll() {
    return this.standardsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single standard by ID' })
  findOne(@Param('id') id: string) {
    return this.standardsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new standard' })
  create(@Body(createValidation) data: CreateStandardDto) {
    return this.standardsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing standard' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body(updateValidation) data: UpdateStandardDto) {
    return this.standardsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a standard' })
  delete(@Param('id') id: string) {
    return this.standardsService.delete(id);
  }
}
