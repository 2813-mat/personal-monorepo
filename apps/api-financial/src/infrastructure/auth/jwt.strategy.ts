import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';
import { resolveMember, ResolvedTenant } from './member-resolver';

export interface JwtPayload {
  sub: string;
  preferred_username: string;
  name?: string;
  realm_access?: { roles: string[] };
}

export type AuthenticatedUser = JwtPayload & ResolvedTenant;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    const base = `${config.get('KEYCLOAK_URL')}/realms/${config.get('KEYCLOAK_REALM')}`;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer: base,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${base}/protocol/openid-connect/certs`,
      }),
    });
  }

  // Runs inside the guard (via passport), so req.user is fully resolved
  // — including tenant info — before any request-scoped provider or handler.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const tenant = await resolveMember(this.prisma, payload);
    return { ...payload, ...tenant };
  }
}
