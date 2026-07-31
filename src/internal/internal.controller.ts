import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { InternalGuard } from "src/auth/guards/internal.guard";
import { ChannelService } from "src/channel/channel.service";
import { InternalDto } from "./dto/internal.dto";

@Controller('internal')
export class InternalController {
    constructor (private channelService: ChannelService) {}

    @UseGuards(InternalGuard)
    @Post('/streams/publish')
    @ApiExcludeEndpoint()
    async publish(
        @Body() body: InternalDto
    ) {
        return this.channelService.startStream(body.streamKey)
    }

    @UseGuards(InternalGuard)
    @Post('/streams/done')
    @ApiExcludeEndpoint()
    async done(
        @Body() body: InternalDto
    ) {
        return this.channelService.endStream(body.streamKey)
    }
}