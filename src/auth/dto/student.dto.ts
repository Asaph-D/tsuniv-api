import {
  IsEmail,
  IsString,
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  ValidateNested,
  Length,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role, DocumentType, Kinship } from '@prisma/client';

// DTO pour les informations du profil parental (imbriqué)
export class ParentProfileDto {
  @IsString({ message: 'Le nom du parent doit être une chaîne de caractères.' })
  @Length(2, 50, {
    message: 'Le nom du parent doit contenir entre 2 et 50 caractères.',
  })
  name: string;

  @IsString({
    message: 'Le lien de parenté doit être une chaîne de caractères.',
  })
  @IsEnum(Kinship, { message: 'Le lien de parenté doit être valide.' })
  kinship: Kinship;

  @IsString({
    message:
      'Le numéro de téléphone du parent doit être une chaîne de caractères.',
  })
  @Length(10, 20, {
    message: 'Le téléphone du parent doit contenir entre 10 et 20 caractères.',
  })
  phone: string;
}

// DTO pour les préférences de notification (imbriqué)
export class NotificationPreferencesDto {
  @IsBoolean({
    message: 'Le statut de la notification email doit être un booléen.',
  })
  email: boolean;

  @IsBoolean({
    message: 'Le statut de la notification push doit être un booléen.',
  })
  push: boolean;

  @IsBoolean({ message: 'Le statut de la newsletter doit être un booléen.' })
  newsletter: boolean;

  @IsBoolean({ message: 'Le statut des alertes de prix doit être un booléen.' })
  priceAlerts: boolean;
}

// DTO pour les documents de l'étudiant (imbriqué)
export class StudentDocumentsDto {
  @IsOptional()
  @IsString({
    message: "L'URL de la photo d'identité doit être une chaîne de caractères.",
  })
  identityPhotoUrl?: string;

  @IsOptional()
  @IsString({
    message: "L'URL du document d'identité doit être une chaîne de caractères.",
  })
  identityDocUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Le statut de vérification doit être un booléen.' })
  isVerified?: boolean;

  @IsOptional()
  @IsDate({ message: 'La date de vérification doit être une date valide.' })
  @Type(() => Date)
  verifiedAt?: Date;
}

// DTO pour les informations spécifiques de l'étudiant (imbriqué)
export class StudentDto {
  @IsOptional()
  @IsString({ message: 'Le sexe doit être une chaîne de caractères.' })
  sexe?: string;

  @IsOptional()
  @IsDate({ message: 'La date de naissance doit être une date valide.' })
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsEnum(DocumentType, { message: 'Le type de document doit être valide.' })
  typeDocument?: DocumentType;

  @IsOptional()
  @IsString({ message: 'La ville d’étude doit être une chaîne de caractères.' })
  cityOfStudy?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de favoris doit être un nombre.' })
  favorites?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de recherches doit être un nombre.' })
  searches?: number;

  @IsOptional()
  @IsBoolean({ message: 'Le statut de vérification doit être un booléen.' })
  isVerified?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentProfileDto)
  parentProfile?: ParentProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudentDocumentsDto)
  studentDocuments?: StudentDocumentsDto;
}

// DTO principal pour l'inscription de l'étudiant
export class CreateStudentDto {
  @IsEmail({}, { message: 'L’adresse email doit être valide.' })
  email: string;

  @IsString({
    message:
      'Le mot de passe est requis et doit être une chaîne de caractères.',
  })
  @Length(8, 255, {
    message: 'Le mot de passe doit contenir entre 8 et 255 caractères.',
  })
  password: string;

  @IsString({
    message: 'Le prénom est requis et doit être une chaîne de caractères.',
  })
  @Length(2, 50, {
    message: 'Le prénom doit contenir entre 2 et 50 caractères.',
  })
  firstName: string;

  @IsString({
    message: 'Le nom est requis et doit être une chaîne de caractères.',
  })
  @Length(2, 50, { message: 'Le nom doit contenir entre 2 et 50 caractères.' })
  lastName: string;

  @IsOptional()
  @IsString({
    message: 'Le numéro de téléphone doit être une chaîne de caractères.',
  })
  @Length(10, 20, {
    message: 'Le numéro de téléphone doit contenir entre 10 et 20 caractères.',
  })
  phone?: string;

  @IsString({ message: 'Le rôle doit être une chaîne de caractères.' })
  @IsEnum(Role, { message: 'Le rôle doit être valide.' })
  role: Role;

  @IsBoolean({
    message: 'Le consentement aux CGU est requis et doit être un booléen.',
  })
  consentementCGU: boolean;

  @ValidateNested()
  @Type(() => StudentDto)
  student: StudentDto;
}
