import { Module } from "@nestjs/common";
import { ChannelModule } from "src/channel/channel.module";
import { InternalController } from "./internal.controller";

@Module({
  imports: [ChannelModule],
  controllers: [InternalController],
})
export class InternalModule {}