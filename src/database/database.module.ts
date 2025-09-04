import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        const pool = new Pool({
          host: process.env.SUPABASE_DB_HOST,
          port: Number(process.env.SUPABASE_DB_PORT),
          database: process.env.SUPABASE_DB_NAME,
          user: process.env.SUPABASE_DB_USER,
          password: process.env.SUPABASE_DB_PASSWORD,
          ssl:
            process.env.SUPABASE_DB_SSL === 'true'
              ? { rejectUnauthorized: false }
              : false,
        });

        pool.on('error', (err) => console.error('PG pool error', err));
        return pool;
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
