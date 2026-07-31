import { Module } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelEntity } from "src/channel/entities/chanel.entity";
import { StreamService } from "src/stream/stream.service";
import { StreamModule } from "src/stream/stream.module";
import { PresenceService } from "./presence.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelEntity]),
    StreamModule
  ],
  providers: [EventsGateway, PresenceService],
  exports: [PresenceService],
})
export class EventsModule {}
