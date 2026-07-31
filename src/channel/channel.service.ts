import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { UserEntity } from "src/auth/entities/user.entity";
import { EntityManager, ILike, IsNull, Repository } from "typeorm";
import { ChannelEntity } from "./entities/chanel.entity";
import { saveImageAndReturnFilename } from "src/lib/utils";
import { PresenceService } from "src/events/presence.service";
import { StreamService } from "src/stream/stream.service";

@Injectable()
export class ChannelService {
    private readonly logger = new Logger(ChannelService.name)
    constructor(
        @InjectRepository(ChannelEntity)
        private channelRepo: Repository<ChannelEntity>,
        private readonly presence: PresenceService,
        private readonly stream: StreamService,
    ) { }

    async createChannel(user: UserEntity, manager: EntityManager) {
        const stream_key = randomBytes(32).toString('hex');
        return manager.save(ChannelEntity, { user, stream_key });
    }

    async startStream(streamKey: string) {
        const channel = await this.channelRepo.findOne({ where: { stream_key: streamKey }, select: { id: true } })
        if (!channel) throw new NotFoundException("Channel not found")
        await this.setOnline(channel.id)
        await this.stream.createStream(channel.id)
        return { channel_id: channel.id }
    }

    async setOnline(id: string) {
        await this.channelRepo.update(
            { id },
            { online_status: 'online' },
        );
    }

    async endStream(streamKey: string) {
        const result = await this.channelRepo.update(
            { stream_key: streamKey },
            { online_status: 'offline' },
        );
        if (!result.affected) throw new NotFoundException("Channel not found")
        const channel = await this.channelRepo.findOne({ where: { stream_key: streamKey }, select: { id: true } })
        await this.stream.updateEndStream(channel!.id)
        return { channel_id: channel!.id }
    }

    async getChannelInfo(user_id: string, username: string) {
        const where = user_id
            ? { user: { id: user_id } }
            : { user: { username: ILike(username.trim()) } };
        const channel = await this.channelRepo.findOne({ where })
        if (!channel) {
            this.logger.warn(`Invalid ${user_id ? "user_id" : "username"}: ${user_id ? user_id : username}`)
            throw new NotFoundException("Channel undefined")
        }
        const { playback_url, thumbnail_url } = this.createPlaybackUrlAndThumbnailUrl(channel.id, channel.online_status)
        return { ...channel, stream_key: "", username, playback_url, thumbnail_url }

    }
    createPlaybackUrlAndThumbnailUrl(channel_id: string, online_status: "online" | "offline") {
        const base = process.env.MEDIA_PUBLIC_URL!
        const playback_url = online_status === 'online'
            ? `${base}/live/${channel_id}/index.m3u8`
            : null
        const thumbnail_url = online_status === 'online'
            ? `${base}/live/${channel_id}/thumb.jpg`
            : null
        return { playback_url, thumbnail_url }
    }
    async getChannelStreamKey(user_id: string) {
        const channel = await this.channelRepo.findOne({
            where: { user: { id: user_id } },
            select: { stream_key: true, id: true }
        })
        if (!channel) {
            this.logger.warn(`Invalid user_id: ${user_id}`)
            throw new NotFoundException("stream_key undefined")
        }

        return { stream_key: channel.stream_key, id: channel.id }
    }

    async getOnlineChannels() {
        const channels = await this.channelRepo.find({
            where: { online_status: "online", streams: { ended_at: IsNull() } },
            relations: { user: true, streams: true },
            select: {
                id: true, online_status: true, avatar_img_link: true, stream_title: true,
                user: { username: true },
                streams: { id: true}
            },
        })
        
        const fullChannelsInfo = channels.map(c => {
            const { playback_url, thumbnail_url } =
                this.createPlaybackUrlAndThumbnailUrl(c.id, c.online_status);
                // console.log(playback_url, thumbnail_url);
                
            return {
                channel: {
                    id: c.id,
                    online_status: c.online_status,
                    avatar_img_link: c.avatar_img_link
                },
                user: { username: c.user.username },
                stream: {
                    id: c.streams[0].id,
                    title: c.stream_title,
                    playback_url,
                    thumbnail_url,
                    viewers: this.presence.count(c.user.username),
                }
            }
        })
        return fullChannelsInfo
    }

    async updateAvatar(file: any, user_id: string, username: string,
        field: "description" | "baner_img_link" | "avatar_img_link", body?: { description: string }) {
        let filename: string | null = null
        if (field !== "description") filename = await saveImageAndReturnFilename(file)
        try {
            const newFieldData = field === "description" ? body!.description : filename
            console.log(newFieldData);

            const result = await this.channelRepo.update({ user: { id: user_id } }, { [field]: newFieldData })
            if (result.affected === 0) {
                this.logger.warn(`Invalid user_id: ${user_id}`)
                throw new NotFoundException("Channel undefined")
            }
            const channel = await this.channelRepo.findOne({ where: { user: { id: user_id } } })
            return { ...channel, stream_key: "", username }
        } catch (error) {
            if (error instanceof NotFoundException) throw error
            this.logger.error(`Error user_id: ${user_id}`, error);
            throw error;
        }
    }
}