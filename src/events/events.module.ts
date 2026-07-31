import { Module } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelEntity } from "src/channel/entities/chanel.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelEntity]),
  ],
  providers: [EventsGateway]
})
export class EventsModule {}
