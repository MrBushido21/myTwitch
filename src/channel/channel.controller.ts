import { Body, Controller, Get, Param, Patch, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import type { Request } from "express";
import { AuthGuard } from "src/auth/guards/auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";



@Controller('/channel')
export class ChannelController {
    constructor(private readonly channelService: ChannelService) { }

    @UseGuards(AuthGuard)
    @Get()
    getChannelInfo(
        @Req() req: Request
    ) {
        const user_id = req.user!.sub
        const username = req.user!.username
        return this.channelService.getChannelInfo(user_id, username)
    }
    @UseGuards(AuthGuard)
    @Get('stream_key')
    getChannelStreamKey(
        @Req() req: Request
    ) {
        const user_id = req.user!.sub
        return this.channelService.getChannelStreamKey(user_id)
    }

    @UseGuards(AuthGuard)
    @Patch()
    @UseInterceptors(FileInterceptor('image'))
    async updateAvatar(
        @UploadedFile() file: any,
        @Req() req: Request,
        @Query('field') field: "description" | "baner_img_link" | "avatar_img_link",
        @Body() body?: { description: string }
    ) {
        const user_id = req.user!.sub
        const username = req.user!.username
        
        return this.channelService.updateAvatar(file, user_id, username, field, body)
    }
}