import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Express } from 'express';
import { CreateStudentDto } from './dto/student.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photoIdentite' },
      { name: 'pieceIdentite' },
    ]),
  )
  async registerStudent(
    @Body('userData') rawUserData: string,
    @UploadedFiles()
    files: {
      photoIdentite?: Express.Multer.File[];
      pieceIdentite?: Express.Multer.File[];
    },
  ) {
    let studentDto: CreateStudentDto;
    try {
      studentDto = JSON.parse(rawUserData);
    } catch (err) {
      this.logger.error('Failed to parse JSON for userData', err);
      throw new BadRequestException('The userData field must be valid JSON.');
    }

    const photo = files.photoIdentite?.[0];
    const piece = files.pieceIdentite?.[0];

    // File validation and existence check
    if (!photo || !piece) {
      throw new BadRequestException('Required files are missing.');
    }

    if (!photo.mimetype.startsWith('image/')) {
      throw new BadRequestException('The photo must be an image file.');
    }

    if (
      !piece.mimetype.startsWith('image/') &&
      piece.mimetype !== 'application/pdf'
    ) {
      throw new BadRequestException('The document must be an image or a PDF.');
    }

    // Log received data
    this.logger.log(`📨 Received data: ${JSON.stringify(studentDto)}`);
    this.logger.log(
      `📎 Received files: ${photo.originalname}, ${piece.originalname}`,
    );

    // Call the service with the parsed DTO and file objects
    return await this.authService.registerStudent(studentDto, {
      photoIdentite: photo,
      pieceIdentite: piece,
    });
  }
}
