import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResetCode } from './entities/cache.entities';
import { Injectable } from '@nestjs/common';

// reset-code.service.ts
@Injectable()
export class ResetCodeService {
  constructor(
    @InjectRepository(ResetCode)
    private readonly repo: Repository<ResetCode>,
  ) {}

  async createCode(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await this.repo.save({ phone, code, expiresAt });
    // Envoie le code par SMS ici
    return code;
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const record = await this.repo.findOne({ where: { phone, code } });
    if (!record) {
      console.warn(
        `Tentative de vérification échouée pour ${phone} avec code ${code}`,
      );
      return false;
    }

    const createdAt = new Date(record.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 1000); // 2 minutes après création
    const now = new Date();

    if (now > expiresAt) {
      await this.repo.delete({ id: record.id }); // Nettoyage même si expiré
      return false;
    }

    await this.repo.delete({ id: record.id }); // Nettoyage après succès
    return true;
  }
}
