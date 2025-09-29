import { TypeOrmModule } from '@nestjs/typeorm';
import { ResetCodeService } from './resetCode.service';
import { ResetCode } from './entities/cache.entities';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'local.db',
      entities: [ResetCode],
      synchronize: true,
      logging: true,
    }),
    TypeOrmModule.forFeature([ResetCode]), // ← nécessaire pour InjectRepository
  ],
  providers: [ResetCodeService],
  exports: [ResetCodeService],
})
export class SqliteModule {}
