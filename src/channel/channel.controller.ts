import { Body, Controller, Get, Param, Patch, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import type { Request, Response } from "express";
import { join } from "node:path";
import { AuthGuard } from "src/auth/guards/auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";



@Controller('/channels')
export class ChannelController {
    constructor(private readonly channelService: ChannelService) { }

    @UseGuards(AuthGuard)
    @Get('me')
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

    @Get('/:username/info')
    async getChannel(
        @Param('username') username: string
    ) {
        return this.channelService.getChannelInfo("", username)
    }

    @Get('/online')
    getOnlineChannels() {
        return this.channelService.getOnlineChannels()
    }

    /** Главная: список эфиров. Данные забирает сама, запросом на /channels/online. */
    @Get('/')
    getIndexPage(
        @Res() res: Response
    ) {
        res.sendFile(join(process.cwd(), 'src', 'client', 'index.html'))
    }

    /**
     * Отдаёт страницу канала. Данные она забирает сама, запросом на /channels/:username/info,
     * поэтому роут должен оставаться последним в классе: ':username' матчит и 'stream_key'.
     */
    @Get('/:username')
    getChannelPage(
        @Res() res: Response
    ) {
        res.sendFile(join(process.cwd(), 'src', 'client', 'stream.html'))
    }
}