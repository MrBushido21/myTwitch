import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { UserEntity } from "./user.entity"

@Entity()
export class RefreshEntity {
    @PrimaryGeneratedColumn("uuid")
    id!:string 
    
    @Column()
    token!: string
    
    @Column() 
    expires_at!: Date

    @ManyToOne(() => UserEntity, {onDelete: "CASCADE"})
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity
}
