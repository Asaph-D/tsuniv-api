import {
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums (à adapter selon ton schéma Prisma)
export enum DocumentType {
  CNI = 'CNI',
  PASSPORT = 'PASSPORT',
  PERMIS = 'PERMIS',
}

export enum Kinship {
  PERE = 'PERE',
  MERE = 'MERE',
  TUTEUR = 'TUTEUR',
}

// ✅ ParentProfile
export class UpdateParentProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Kinship)
  kinship?: Kinship;

  @IsOptional()
  @IsString()
  phone?: string;
}

// ✅ NotificationPreferences
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;

  @IsOptional()
  @IsBoolean()
  priceAlerts?: boolean;
}

// ✅ StudentDocuments
export class UpdateStudentDocumentsDto {
  @IsOptional()
  @IsUrl()
  identityPhotoUrl?: string;

  @IsOptional()
  @IsUrl()
  identityDocUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;
}

// ✅ DTO principal
export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  sexe?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  typeDocument?: DocumentType;

  @IsOptional()
  @IsString()
  cityOfStudy?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsUUID()
  parentProfileId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateParentProfileDto)
  parentProfile?: UpdateParentProfileDto;

  @IsOptional()
  @IsUUID()
  notificationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  notificationPreferences?: UpdateNotificationPreferencesDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateStudentDocumentsDto)
  StudentDocuments?: UpdateStudentDocumentsDto[];
}
