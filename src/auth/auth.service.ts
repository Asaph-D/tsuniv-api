import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateStudentDto } from './dto/student.dto';
import { Express } from 'express';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async registerStudent(
    dto: CreateStudentDto,
    files: {
      photoIdentite: Express.Multer.File;
      pieceIdentite: Express.Multer.File;
    },
  ) {
    const supabase = this.supabaseService.getClient();

    // 1. Vérification de l'existence de l'email
    const { data: existingUser } = await supabase
      .from('User')
      .select('email')
      .eq('email', dto.email)
      .single();

    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé.');
    }

    // 2. Hachage du mot de passe
    const hashedPassword = await argon2.hash(dto.password);

    // 3. Upload des fichiers vers Supabase Storage
    const bucketName = 'student';
    const folder = `${dto.email}`; // Supabase path does not start with a slash

    const photoExt = files.photoIdentite.originalname.split('.').pop();
    const photoPath = `${folder}/photoIdentite.${photoExt}`;

    const pieceExt = files.pieceIdentite.originalname.split('.').pop();
    const piecePath = `${folder}/pieceIdentite.${pieceExt}`;

    const uploadPhoto = await supabase.storage
      .from(bucketName)
      .upload(photoPath, files.photoIdentite.buffer, {
        contentType: files.photoIdentite.mimetype,
        upsert: true,
      });

    const uploadPiece = await supabase.storage
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

    const photoUrl = supabase.storage.from(bucketName).getPublicUrl(photoPath)
      .data.publicUrl;
    const pieceUrl = supabase.storage.from(bucketName).getPublicUrl(piecePath)
      .data.publicUrl;

    // 4. Insertion des données dans Supabase
    // Note: Supabase ne supporte pas les écritures imbriquées comme Prisma.
    // Chaque table doit être insérée séparément. Nous utilisons une transaction
    // pour garantir l'atomicité.

    // A. Insertion des préférences de notification
    const { data: notification, error: notifError } = await supabase
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
      const { data: parent, error: parentError } = await supabase
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
    const { data: student, error: studentError } = await supabase
      .from('Student')
      .insert([
        {
          sexe: dto.student.sexe,
          birthDate: dto.student.birthDate, // Supabase handles ISO-8601 strings
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
    const { error: documentsError } = await supabase
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
    const { error: userError } = await supabase.from('User').insert([
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
      await supabase.from('Student').delete().eq('id', studentId);
      await supabase
        .from('NotificationPreferences')
        .delete()
        .eq('id', notificationId);
      if (parentProfileId) {
        await supabase.from('ParentProfile').delete().eq('id', parentProfileId);
      }
      throw new BadRequestException(
        'Failed to create user.' + userError.message,
      );
    }

    this.logger.log(`✅ Étudiant inscrit : ${studentId}`);
    return { message: 'Inscription réussie', studentId: studentId };
  }
}
