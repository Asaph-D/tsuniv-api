import { Expose, Transform, Type } from 'class-transformer';
import { Role, DocumentType, Kinship } from '@prisma/client';

export class UserDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() firstName: string;
  @Expose() lastName: string;
  @Expose() phone: string;
  @Expose() role: Role;
  @Expose() consentementCGU: boolean;
}

export class StudentDto {
  @Expose() sexe: string;
  @Expose() birthDate: string;
  @Expose() typeDocument: DocumentType;
  @Expose() cityOfStudy: string;
  @Expose() Institut: string;
  @Expose() favorites: number;
  @Expose() searches: number;
  @Expose() isVerified: boolean;
}

export class ParentProfileDto {
  @Expose() name: string;
  @Expose() kinship: Kinship;
  @Expose() phone: string;
}

export class NotificationPreferencesDto {
  @Expose() email: boolean;
  @Expose() push: boolean;
  @Expose() newsletter: boolean;
  @Expose() priceAlerts: boolean;
}

export class StudentDocumentsDto {
  @Expose() identityPhotoUrl: string;

  @Expose()
  @Transform(({ obj }) => (obj.isVerified ? obj.identityDocUrl : undefined))
  identityDocUrl?: string;

  @Expose() isVerified: boolean;
  @Expose() verifiedAt?: string | null;
}

export class UserProfileResponseDto {
  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  @Type(() => StudentDto)
  @Expose()
  student: StudentDto;

  @Type(() => ParentProfileDto)
  @Expose()
  parentProfile?: ParentProfileDto;

  @Type(() => NotificationPreferencesDto)
  @Expose()
  notificationPreferences?: NotificationPreferencesDto;

  @Type(() => StudentDocumentsDto)
  @Expose()
  studentDocuments?: StudentDocumentsDto;
}
