import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export type UserPayload = { userId: string; email: string };
export type RequestAuthUser = { user: UserPayload };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => {
        // Extraction du token depuis le cookie nommé "authToken"
        return req?.cookies?.authToken || null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.jwtSecret,
    });
  }

  async validate(payload: any): Promise<UserPayload> {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
