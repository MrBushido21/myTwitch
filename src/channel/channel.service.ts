import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { UserEntity } from "src/auth/entities/user.entity";
import { EntityManager, Repository } from "typeorm";
import { ChannelEntity } from "./entities/chanel.entity";
import { saveImageAndReturnFilename } from "src/lib/utils";

@Injectable()
export class ChannelService {
    private readonly logger = new Logger(ChannelService.name) 
    constructor(
        @InjectRepository(ChannelEntity)
        private channelRepo: Repository<ChannelEntity>,
    ) { }

    async createChannel(user: UserEntity, manager: EntityManager) {
        const stream_key = randomBytes(32).toString('hex');
        return manager.save(ChannelEntity, { user, stream_key });
    }

    async startStream(streamKey: string) {
        const channel= await this.channelRepo.findOne({ where: { stream_key: streamKey }, select: {id:true} })
        if (!channel) throw new NotFoundException("Channel not found")
        await this.setOnline(channel.id)
        return {channel_id: channel.id}
    }

    async setOnline(id: string) {
        await this.channelRepo.update(
            { id },
            { online_status: 'online' },
        );
    }

    async endStream(streamKey: string) { 
         const result = await this.channelRepo.update(
            {stream_key: streamKey},
            { online_status: 'offline' },
        );
        if (!result.affected) throw new NotFoundException("Channel not found")
        const channel = await this.channelRepo.findOne({where: {stream_key: streamKey}, select: {id:true}})
        return {channel_id: channel!.id}
        }

    async getChannelInfo(user_id:string, username:string) {
        const channel = await this.channelRepo.findOne({where: {user: {id: user_id}}})
        if(!channel) {
            this.logger.warn(`Invalid user_id: ${user_id}`)
            throw new NotFoundException("Channel undefined")
        }

       return {...channel, stream_key: "", username} 
    }
    async getChannelStreamKey(user_id:string) {
        const channel = await this.channelRepo.findOne({
            where: {user: {id: user_id}},
            select: {stream_key: true, id: true}
        })
        if(!channel) {
            this.logger.warn(`Invalid user_id: ${user_id}`)
            throw new NotFoundException("stream_key undefined")
        }

       return {stream_key: channel.stream_key, id: channel.id}
    }

    async updateAvatar(file:any, user_id:string, username:string, 
        field: "description" | "baner_img_link" | "avatar_img_link", body?: {description:string}) {
        let filename:string | null = null
        if (field !== "description") filename = await saveImageAndReturnFilename(file)
        try {
            const newFieldData = field === "description" ? body!.description : filename
            console.log(newFieldData);
            
            const result = await this.channelRepo.update({user: {id: user_id}}, {[field]: newFieldData})
            if (result.affected === 0) { 
                this.logger.warn(`Invalid user_id: ${user_id}`)
                throw new NotFoundException("Channel undefined")
            }
            const channel = await this.channelRepo.findOne({where: {user: {id:user_id}}})
            return {...channel, stream_key: "", username}
        } catch (error) {
            if (error instanceof NotFoundException) throw error
            this.logger.error(`Error user_id: ${user_id}`, error);
            throw error;
        }
    }
}