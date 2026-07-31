import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelController } from "./channel.controller";
import { ChannelService } from "./channel.service";
import { ChannelEntity } from "./entities/chanel.entity";



@Module({
   imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChannelEntity,]),
  ],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService], 
})
export class ChannelModule {}
