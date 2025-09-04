import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SqliteModule } from './sqlite/sqlite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // rend le module accessible partout
      envFilePath: '.env', // chemin personnalisé si nécessaire
    }),
    SqliteModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
