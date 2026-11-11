import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { can, type Actor, type Permission } from '@saudi-shield/core';
import { PlatformService } from './platform.service';

/**
 * DEMO authentication: pick a fictional user and receive an HMAC-signed session token.
 * The target deployment replaces this with authority SSO (OIDC/SAML) and phishing-resistant MFA.
 */
const SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');
const TTL_MS = 8 * 3600_000;

export function issueToken(userId: string): string {
  const body = `${userId}.${Date.now() + TTL_MS}`;
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  const [userId, exp, sig] = parts;
  const expected = createHmac('sha256', SECRET).update(`${userId}.${exp}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  if (Number(exp) < Date.now()) return undefined;
  return userId;
}

export const PERMISSION_KEY = 'permission';
export const PUBLIC_KEY = 'public';
export const RequirePermission = (p: Permission) => SetMetadata(PERMISSION_KEY, p);
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => ctx.switchToHttp().getRequest().actor);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly svc: PlatformService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const userId = readToken(header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    const actor = userId ? this.svc.user(userId) : undefined;
    if (!actor) throw new UnauthorizedException('Sign in required.');
    req.actor = actor;
    const perm = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (perm && !can(actor, perm)) {
      this.svc.platform.audit.append({
        at: this.svc.platform.now().toISOString(),
        actor: actor.id,
        action: 'access.denied',
        subject: `${req.method} ${req.path}`,
        detail: { permission: perm },
      });
      throw new ForbiddenException(`${actor.name} lacks permission ${perm}.`);
    }
    return true;
  }
}
