import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../db/db.provider';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(DB_CLIENT) private readonly db: any,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'fallback-secret-for-dev',
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.orgId) {
      throw new UnauthorizedException();
    }
    const userRes = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub));
    if (!userRes.length || !userRes[0].isActive) {
      throw new UnauthorizedException('User is inactive or revoked');
    }
    return { userId: payload.sub, orgId: payload.orgId, email: payload.email };
  }
}
