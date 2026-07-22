import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow('GOOGLE_CALLBACK_URL'), 
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    done(null, {
      googleId: profile.id,
      email: profile.emails[0].value,
      username: profile.displayName,
    });
  }
}