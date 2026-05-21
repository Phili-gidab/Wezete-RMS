import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const ROLE_LEVEL: Record<Role, number> = {
  CUSTOMER: 1,
  BARISTA: 2,
  CHEF: 3,
  WAITER: 4,
  CASHIER: 5,
  INVENTORY_MANAGER: 6,
  ADMIN: 7,
  SUPER_ADMIN: 8,
};

const LEVEL_TO_ROLE: Record<number, Role> = Object.fromEntries(
  Object.entries(ROLE_LEVEL).map(([k, v]) => [v, k as Role]),
) as Record<number, Role>;

export interface JwtPayload {
  sub: string;
  email: string;
  role: number; // integer 1-8
}

export interface RequestUser {
  id: string;
  email: string;
  role: number; // integer 1-8
  roleName: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'greenmark-secret-change-me'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const roleLevel = ROLE_LEVEL[user.role];

    return {
      id: user.id,
      email: user.email,
      role: roleLevel,
      roleName: user.role,
    };
  }
}
