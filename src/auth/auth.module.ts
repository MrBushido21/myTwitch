import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { TokenService } from './token.service';
import { RefreshEntity } from './entities/refresh.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { PassportModule } from '@nestjs/passport';
import { ChannelModule } from 'src/channel/channel.module';
import { ChannelEntity } from 'src/channel/entities/chanel.entity';

@Module({
   imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, ChannelEntity, RefreshEntity]),
    JwtModule.register({global: true}),
    ChannelModule
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, GoogleStrategy],
})
export class AuthModule {}
