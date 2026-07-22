import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { UserEntity } from "./user.entity"

@Entity()
export class ChannelEntity {
    @PrimaryGeneratedColumn("uuid")
    id!:string 
    
    @Column({unique:true})
    stream_key!: string

    @Column({ default: 'offline' })
    online_status!: "online" | "offline"

    @OneToOne(() => UserEntity, (user) => user.channel)
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity
}
