import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import {
  UpdateEmailSettingsDto,
  type EmailSettingsResponseDto,
} from './dto/email-settings.dto.js';
import type { SendTestEmailResponseDto } from './dto/test-email.dto.js';

interface AuthenticatedRequest {
  user?: { id: string; email: string; role: string };
}

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  @ApiOperation({ summary: 'Lấy cấu hình email SMTP và thông báo hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Cấu hình email an toàn (không bao gồm mật khẩu plaintext)',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  getEmailSettings(): Promise<EmailSettingsResponseDto> {
    return this.settingsService.getEmailSettings();
  }

  @Put('email')
  @ApiOperation({ summary: 'Cập nhật cấu hình email SMTP và thông báo' })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu cấu hình không hợp lệ hoặc thiếu trường bắt buộc',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  updateEmailSettings(
    @Body(
      new ValidationPipe({
        expectedType: UpdateEmailSettingsDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: UpdateEmailSettingsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<EmailSettingsResponseDto> {
    return this.settingsService.updateEmailSettings(dto, req.user?.id);
  }

  @Post('email/test')
  @ApiOperation({
    summary: 'Gửi email kiểm tra kết nối SMTP tới email nhận thông báo',
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi email kiểm tra thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Cấu hình SMTP chưa hoàn chỉnh hoặc gửi email thất bại',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  sendTestEmail(
    @Req() req: AuthenticatedRequest,
  ): Promise<SendTestEmailResponseDto> {
    return this.settingsService.sendTestEmail(req.user?.email);
  }
}
