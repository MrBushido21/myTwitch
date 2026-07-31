import { UserEntity } from "src/auth/entities/user.entity"
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class ChannelEntity {
    @PrimaryGeneratedColumn("uuid")
    id!:string 
    
    @Column({unique:true})
    stream_key!: string

    @Column({ default: 'offline' })
    online_status!: "online" | "offline"

    @Column({type:'varchar', nullable: true})
    description!:string | null

    @Column({type:'varchar', nullable: true})
    baner_img_link!: string | null

    @Column({type:'varchar', nullable: true})
    avatar_img_link!: string | null

    @OneToOne(() => UserEntity, (user) => user.channel)
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity
}
