import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, MinLength } from "class-validator"

export class RegisterDto {
    @ApiProperty({ example: 'oleg', minLength: 3 })
    @IsNotEmpty()
    @MinLength(3)
    username!:string

    @ApiProperty({ example: 'qwerty', minLength: 6 })
    @IsNotEmpty()
    @MinLength(6)
    password!: string

    @ApiProperty({ example: 'oleg@.com'})
    @IsEmail()
    email!:string
}
