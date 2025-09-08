// src/sqlite/sqlite.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/cache.entities';
import { Repository } from 'typeorm';

@Injectable()
export class SqliteService {
  constructor(
    @InjectRepository(User)
    private readonly cacheRepo: Repository<User>,
  ) {}

  async set(nom: string, email: string): Promise<User> {
    const entry = this.cacheRepo.create({ nom, email });
    return this.cacheRepo.save(entry);
  }

  async get(nom: string): Promise<User | null> {
    return this.cacheRepo.findOne({ where: { nom } });
  }

  async all(): Promise<User[]> {
    const response = this.cacheRepo.find();
    console.log(response);
    return response;
  }
}
