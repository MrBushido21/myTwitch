import { ChannelEntity } from "src/channel/entities/chanel.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class StreamEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @CreateDateColumn({type: "timestamptz"})
    started_at!: Date

    @Column({type: "timestamptz", nullable: true})
    ended_at!: Date | null   // null = идёт сейчас

    @Column({ default: 0 })
    peak_viewers!: number

    @ManyToOne(() => ChannelEntity, (channel) => channel.streams, {onDelete: "CASCADE"})
    @JoinColumn({ name: 'channel_id' })
    channel!: ChannelEntity
}