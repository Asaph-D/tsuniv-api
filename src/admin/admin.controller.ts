import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
// import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import {
  DashboardQueryDto,
  UserQueryDto,
  VerificationQueryDto,
  VerificationActionDto,
  DashboardStatsDto,
  ActivityItemDto,
  UserListItemDto,
  VerificationItemDto,
  UserAnalyticsDto,
  VerificationAnalyticsDto,
  PaginatedResponseDto,
  AdminSettingsDto,
} from './dto/dashboard.dto';
import { Role } from 'src/auth/role.enum';

@Controller('admin')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============ DASHBOARD OVERVIEW ============
  @Get('dashboard/stats')
  async getDashboardStats(@Query() query: DashboardQueryDto): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats(query.period);
  }

  @Get('dashboard/activities')
  async getRecentActivities(@Query('limit') limit: number = 20): Promise<ActivityItemDto[]> {
    return this.adminService.getRecentActivities(limit);
  }

  // ============ USER MANAGEMENT ============
  @Get('users')
  async getUsers(@Query() query: UserQueryDto): Promise<PaginatedResponseDto<UserListItemDto>> {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<UserListItemDto> {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/status')
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @Request() req,
  ) {
    const adminId = req.user.userId;
    return this.adminService.updateUserStatus(id, isActive, adminId);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const adminId = req.user.userId;
    return this.adminService.deleteUser(id, adminId);
  }

  // ============ VERIFICATION MANAGEMENT ============
  @Get('verifications')
  async getVerifications(
    @Query() query: VerificationQueryDto,
  ): Promise<PaginatedResponseDto<VerificationItemDto>> {
    return this.adminService.getVerifications(query);
  }

  @Post('verifications/:id/action')
  async processVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() actionDto: VerificationActionDto,
    @Request() req,
  ) {
    const adminId = req.user.userId;
    return this.adminService.processVerification(id, actionDto, adminId);
  }

  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  async updateSettings(@Body() settingsDto: AdminSettingsDto) {
    return this.adminService.updateSettings(settingsDto);
  }
}
