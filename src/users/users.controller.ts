import {
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { RedirectOnAuthFailInterceptor } from 'src/common/interceptors/RedirectOnAuthFailInterceptor';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @UseInterceptors(RedirectOnAuthFailInterceptor)
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async getUser(@Request() req) {
    const userId = req.user.userId;
    const userProfile = await this.userService.getFullUserProfile(userId);
    return userProfile;
  }
}
