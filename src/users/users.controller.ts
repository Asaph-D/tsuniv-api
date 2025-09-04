import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './dto/user';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  async getUsers() {
    const Users = await this.userService.getUsers();
    return Users;
  }
  @Post()
  createUser(@Body() User: User) {
    this.userService.createUser(User);
  }
}
