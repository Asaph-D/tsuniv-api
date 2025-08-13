import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Connexion réussie avec le serveur NestJS !';
  }
}
