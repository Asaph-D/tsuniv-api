import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';
import { CreateStudentDto } from './dto/student.dto';
import { Express } from 'express';
import * as argon2 from 'argon2';
import { userAuthDto } from './dto/userAuth.dto';
import { ResetCodeService } from 'src/sqlite/resetCode.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly resetCodeService: ResetCodeService,
  ) {}

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  private async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await argon2.verify(hashedPassword, password);
  }

  private async autenticateUserCookies(userId: string, email: string) {
    const payload = { sub: userId, email: email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  private supabase = this.supabaseService.getClient();

  async loginUser(user: userAuthDto) {
    const { data: userData, error } = await this.supabase
      .from('User')
      .select('phone, password, id, firstName, email')
      .eq('phone', user.phone)
      .single();

    if (error) {
      throw new BadRequestException(
        "L'un de vos identifiants n'est pas correcte. Reessayez encore !" +
          error.message,
      );
    }

    const isValidPassword = await this.comparePassword(
      user.password,
      userData.password,
    );

    if (!isValidPassword) {
      throw new BadRequestException(
        "L'un de vos identifiants n'est pas correcte. Reessayez encore !",
      );
    }

    return this.autenticateUserCookies(userData.id, userData.email);
  }

  async registerStudent(
    dto: CreateStudentDto,
    files: {
      photoIdentite: Express.Multer.File;
      pieceIdentite: Express.Multer.File;
    },
  ) {
    // 1. Vérification de l'existence de l'email
    const { data: existingUser } = await this.supabase
      .from('User')
      .select('email')
      .eq('email', dto.email)
      .single();

    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé.');
    }

    // 2. Hachage du mot de passe
    const hashedPassword = await this.hashPassword(dto.password);

    // 3. Upload des fichiers vers Supabase Storage
    const bucketName = 'student';
    const folder = `${dto.email}`; // Supabase path does not start with a slash

    const photoExt = files.photoIdentite.originalname.split('.').pop();
    const photoPath = `${folder}/photoIdentite.${photoExt}`;

    const pieceExt = files.pieceIdentite.originalname.split('.').pop();
    const piecePath = `${folder}/pieceIdentite.${pieceExt}`;

    const uploadPhoto = await this.supabase.storage
      .from(bucketName)
      .upload(photoPath, files.photoIdentite.buffer, {
        contentType: files.photoIdentite.mimetype,
        upsert: true,
      });

    const uploadPiece = await this.supabase.storage
      .from(bucketName)
      .upload(piecePath, files.pieceIdentite.buffer, {
        contentType: files.pieceIdentite.mimetype,
        upsert: true,
      });

    if (uploadPhoto.error || uploadPiece.error) {
      throw new BadRequestException(
        'Échec de l’upload des fichiers.' + uploadPhoto.error.message,
      );
    }

    const photoUrl = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(photoPath).data.publicUrl;
    const pieceUrl = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(piecePath).data.publicUrl;

    // 4. Insertion des données dans Supabase
    // Note: Supabase ne supporte pas les écritures imbriquées comme Prisma.
    // Chaque table doit être insérée séparément. Nous utilisons une transaction
    // pour garantir l'atomicité.

    // A. Insertion des préférences de notification
    const { data: notification, error: notifError } = await this.supabase
      .from('NotificationPreferences')
      .insert([
        {
          email: dto.student.notificationPreferences?.email ?? true,
          push: dto.student.notificationPreferences?.push ?? true,
          newsletter: dto.student.notificationPreferences?.newsletter ?? false,
          priceAlerts: dto.student.notificationPreferences?.priceAlerts ?? true,
        },
      ])
      .select('id')
      .single();

    if (notifError) {
      throw new BadRequestException(
        'Failed to create notification preferences.' + notifError.message,
      );
    }
    const notificationId = notification.id;

    // B. Insertion du profil parental (si applicable)
    let parentProfileId = null;
    if (dto.student.parentProfile) {
      const { data: parent, error: parentError } = await this.supabase
        .from('ParentProfile')
        .insert([
          {
            name: dto.student.parentProfile.name,
            kinship: dto.student.parentProfile.kinship,
            phone: dto.student.parentProfile.phone,
          },
        ])
        .select('id')
        .single();
      if (parentError) {
        throw new BadRequestException(
          'Failed to create parent profile.' + parentError.message,
        );
      }
      parentProfileId = parent.id;
    }

    // C. Insertion des données de l'étudiant
    const { data: student, error: studentError } = await this.supabase
      .from('Student')
      .insert([
        {
          sexe: dto.student.sexe,
          birthDate: dto.student.birthDate, //  ISO-8601 : pour permettre a supabase de stocker une date
          typeDocument: dto.student.typeDocument,
          cityOfStudy: dto.student.cityOfStudy,
          favorites: dto.student.favorites ?? 0,
          searches: dto.student.searches ?? 0,
          isVerified: dto.student.isVerified ?? false,
          parentProfileId: parentProfileId,
          notificationId: notificationId,
        },
      ])
      .select('id')
      .single();

    if (studentError) {
      throw new BadRequestException(
        'Failed to create student data.' + studentError.message,
      );
    }
    const studentId = student.id;

    // D. Insertion des documents de l'étudiant
    const { error: documentsError } = await this.supabase
      .from('StudentDocuments')
      .insert([
        {
          studentId: studentId,
          identityPhotoUrl: photoUrl,
          identityDocUrl: pieceUrl,
          isVerified: dto.student.studentDocuments?.isVerified ?? false,
          verifiedAt: dto.student.studentDocuments?.verifiedAt ?? undefined,
        },
      ]);

    if (documentsError) {
      throw new BadRequestException(
        'Failed to create student documents.' + documentsError.message,
      );
    }

    // E. Insertion des données de l'utilisateur principal (lié à l'étudiant)
    const { error: userError } = await this.supabase.from('User').insert([
      {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        consentementCGU: dto.consentementCGU,
        studentId: studentId,
      },
    ]);

    if (userError) {
      // Nettoyer les enregistrements précédents si la création de l'utilisateur échoue
      await this.supabase.from('Student').delete().eq('id', studentId);
      await this.supabase
        .from('NotificationPreferences')
        .delete()
        .eq('id', notificationId);
      if (parentProfileId) {
        await this.supabase
          .from('ParentProfile')
          .delete()
          .eq('id', parentProfileId);
      }
      throw new BadRequestException(
        'Failed to create user.' + userError.message,
      );
    }

    this.logger.log(`✅ Étudiant inscrit : ${studentId}`);
    return { message: 'Inscription réussie' };
  }

  async sendOtp(phone: string) {
    if (!phone.match(/^\+2376\d{8}$/)) {
      throw new BadRequestException('Format de numéro invalide.');
    }

    const supabase = this.supabaseService.getClient();
    const { data: user, error } = await supabase
      .from('User')
      .select('id')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      throw new BadRequestException("Ce numéro n'est pas associé à un compte.");
    }

    const code = await this.resetCodeService.createCode(phone);

    // Envoie du code par SMS (à intégrer selon ton service SMS)
    console.log(`Code envoyé à ${phone} : ${code}`);

    return { message: 'Code envoyé avec succès.' };
  }

  async verifyOtp(phone: string, code: string) {
    console.log(code, phone);
    const isValid = await this.resetCodeService.verifyCode(phone, code);
    console.log(isValid);
    if (!isValid) {
      throw new BadRequestException('Code invalide ou expiré.');
    }

    return { message: 'Code vérifié avec succès.' };
  }
  async resetPassword(phone: string, newPassword: string) {
    const supabase = this.supabaseService.getClient();

    const { data: user, error } = await supabase
      .from('User')
      .select('id')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    const hashedPassword = await argon2.hash(newPassword);

    const { error: updateError } = await supabase
      .from('User')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      throw new BadRequestException('Échec de la mise à jour du mot de passe.');
    }

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
