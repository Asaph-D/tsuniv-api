import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { plainToInstance } from 'class-transformer';
import { UserProfileResponseDto } from './dto/user';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private supabase = this.supabaseService.getClient();

  async getFullUserProfile(userId: string): Promise<UserProfileResponseDto> {
    // 1. Récupérer l'utilisateur principal
    const { data: user, error: userError } = await this.supabase
      .from('User')
      .select('*, studentId')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // 2. Récupérer les données de l'étudiant
    const { data: student, error: studentError } = await this.supabase
      .from('Student')
      .select('*')
      .eq('id', user.studentId)
      .single();

    if (studentError || !student) {
      throw new NotFoundException('Profil étudiant introuvable');
    }

    // 3. Récupérer les préférences de notification
    const { data: notificationPreferences } = await this.supabase
      .from('NotificationPreferences')
      .select('*')
      .eq('id', student.notificationId)
      .single();

    // 4. Récupérer le profil parental (si présent)
    let parentProfile = null;
    if (student.parentProfileId) {
      const { data: parent } = await this.supabase
        .from('ParentProfile')
        .select('*')
        .eq('id', student.parentProfileId)
        .single();

      if (parent) {
        parentProfile = parent;
      }
    }

    // 5. Récupérer les documents
    const { data: studentDocuments } = await this.supabase
      .from('StudentDocuments')
      .select('*')
      .eq('studentId', student.id)
      .single();

    // 6. Assembler et transformer le profil complet
    const rawData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        consentementCGU: user.consentementCGU,
      },
      student,
      notificationPreferences: notificationPreferences ?? undefined,
      parentProfile: parentProfile ?? undefined,
      studentDocuments: studentDocuments ?? undefined,
    };

    return plainToInstance(UserProfileResponseDto, rawData, {
      excludeExtraneousValues: true,
    });
  }
}
