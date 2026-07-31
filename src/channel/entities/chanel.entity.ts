import { UserEntity } from "src/auth/entities/user.entity"
import { StreamEntity } from "src/stream/entities/stream.entity"
import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm"

@Entity()
@Index('idx_channel_online', ['online_status'], { where: `"online_status" = 'online'` })
export class ChannelEntity {
    @PrimaryGeneratedColumn("uuid")
    id!:string 
    
    @Column({unique:true})
    stream_key!: string

    @Column({ default: 'offline' })
    online_status!: "online" | "offline"

    @Column({type:'varchar', nullable: true})
    description!:string | null

    @Column({default: "stream"})
    stream_title!:string

    @Column({type:'varchar', nullable: true})
    baner_img_link!: string | null

    @Column({type:'varchar', nullable: true})
    avatar_img_link!: string | null

    @OneToOne(() => UserEntity, (user) => user.channel)
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @OneToMany(() => StreamEntity, (stream) => stream.channel)
    streams!: StreamEntity[]
}
