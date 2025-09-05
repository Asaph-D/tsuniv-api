import { IsString, Length } from 'class-validator';

export class userAuthDto {
  @IsString({
    message: 'Le numéro de téléphone doit être une chaîne de caractères.',
  })
  @Length(8, 13, {
    message: 'Le numéro de téléphone doit contenir entre 8 et 13 caractères.',
  })
  phone: string;

  @IsString({
    message:
      'Le mot de passe est requis et doit être une chaîne de caractères.',
  })
  @Length(8, 255, {
    message: 'Le mot de passe doit contenir entre 8 et 255 caractères.',
  })
  password: string;
}
