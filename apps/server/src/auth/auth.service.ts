import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DB_CLIENT } from '../db/db.provider';
import { eq } from 'drizzle-orm';
import { users, orgs } from '../db/schema';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: any,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Create org
    const [newOrg] = await this.db
      .insert(orgs)
      .values({
        name: dto.orgName,
      })
      .returning();

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. Create user
    try {
      const [newUser] = await this.db
        .insert(users)
        .values({
          orgId: newOrg.id,
          email: dto.email,
          passwordHash,
        })
        .returning();

      return this.generateTokens(newUser);
    } catch (e: any) {
      if (e.code === '23505') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const userRes = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email));
    if (!userRes.length) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = userRes[0];

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, orgId: user.orgId, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
