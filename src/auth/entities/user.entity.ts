import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { ChannelEntity } from "./chanel.entity"

@Entity()
export class UserEntity {
    @PrimaryGeneratedColumn("uuid")
    id!:string 

    @Column({unique:true})
    username!:string
    
    @Column({unique: true})
    email!: string

    @Column({type:'varchar', nullable: true})
    password!: string | null   // null у OAuth-юзеров

    @Column({type: 'varchar', nullable: true})
    google_id!: string | null   // либо отдельная таблица providers

    @OneToOne(() => ChannelEntity, (channel) => channel.user)
    channel!: ChannelEntity
}
