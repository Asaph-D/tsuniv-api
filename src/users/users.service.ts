import { Injectable } from '@nestjs/common';
import { User } from './dto/user';
import { SqliteService } from 'src/sqlite/sqlite.service';

@Injectable()
export class UsersService {
  constructor(private readonly sqlite: SqliteService) {}

  async getUsers() {
    const response = await this.sqlite.all();
    return response;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.sqlite.get(id);
    return response;
  }

  async createUser(User: User) {
    console.log('Utilisateur insere dans la base de donnees avec success');
    const response = await this.sqlite.set(User.nom, User.email);
    console.log(response);
  }
}
