import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Logger,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { Express, Request, Response } from 'express';
import { CreateStudentDto } from './dto/student.dto';
import { userAuthDto } from './dto/userAuth.dto';
import { JwtAuthGuard } from './jwt.auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async Login(
    @Body('authBody') authBody: userAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log(authBody);
    const { access_token } = await this.authService.loginUser(authBody);
    response.cookie('authToken', access_token, {
      httpOnly: true,
      secure: true,
      maxAge: 3600000 * 24 * 7, // 7Jours
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('/get')
  async getInfo(@Req() request: Request) {
    return request.user;
  }

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
 