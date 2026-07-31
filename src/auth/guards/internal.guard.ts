
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class InternalGuard implements CanActivate {
    private readonly expected: Buffer;
   constructor(config: ConfigService) {
    this.expected = createHash('sha256').update(config.getOrThrow<string>('INTERNAL_SECRET')).digest();
  }

 canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-internal-secret'];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();

    const actual = createHash('sha256').update(token).digest();
    if (!timingSafeEqual(actual, this.expected)) throw new UnauthorizedException();

    return true;
 }
}
