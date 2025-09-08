import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class RedirectOnAuthFailInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof UnauthorizedException) {
          const response = context.switchToHttp().getResponse();
          response.redirect('/login');
          return throwError(() => err);
        }
        return throwError(() => err);
      }),
    );
  }
}
