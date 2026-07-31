import { InjectRepository } from "@nestjs/typeorm";
import { StreamEntity } from "./entities/stream.entity";
import { IsNull, LessThan, Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";

export class StreamService {
    constructor(
        @InjectRepository(StreamEntity)
        private streamRepo: Repository<StreamEntity>,
    ) {}
    async createStream(channel_id:string) {
        const result = await this.streamRepo.save({channel: {id: channel_id}})
        if (!result) throw new NotFoundException('channel for stream undefined')
        return true
    }
    async updateEndStream(channel_id:string) {
        const result = await this.streamRepo.update({channel: {id: channel_id}, ended_at: IsNull()}, {ended_at: new Date()})
        if (!result) throw new NotFoundException('channel for stream undefined')
        return true
    }
    async recordPeak(channel_id: string, viewers: number) {
        await this.streamRepo.update(
            {channel: {id: channel_id}, ended_at: IsNull(), peak_viewers: LessThan(viewers)},
            { peak_viewers: viewers },
        );
    }
}