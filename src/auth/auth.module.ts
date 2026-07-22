import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ChannelEntity } from './entities/chanel.entity';
import { TokenService } from './token.service';
import { RefreshEntity } from './entities/refresh.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
   imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, ChannelEntity, RefreshEntity]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, GoogleStrategy],
})
export class AuthModule {}
