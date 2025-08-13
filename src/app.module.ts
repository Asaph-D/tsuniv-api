import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // rend le module accessible partout
      envFilePath: '.env', // chemin personnalisé si nécessaire
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
