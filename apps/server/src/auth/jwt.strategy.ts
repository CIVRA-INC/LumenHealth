import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret-for-dev',
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.orgId) {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, orgId: payload.orgId, email: payload.email };
  }
}
