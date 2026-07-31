import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { typeOrmConfig } from './config/typeorm.config';
import { ChannelModule } from './channel/channel.module';
import { EventsModule } from './events/events.module';
import { InternalModule } from './internal/internal.module';
import { StreamModule } from './stream/stream.module';

@Module({
  imports: [
      ConfigModule.forRoot({ 
        isGlobal: true,
        envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      }),
      TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    ChannelModule,
    EventsModule,
    InternalModule,
    StreamModule
  ],
})
export class AppModule {}
