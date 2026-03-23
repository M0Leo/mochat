import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.getOrThrow('JWT_ACCESS_PRIVATE_KEY'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    return {
      ...payload,
      // @ts-ignore
      //TODO: EDIT THIS RIGHT AFTER ADDING REDIS
      refreshToken: req.body.refreshToken,
    };
  }
}
