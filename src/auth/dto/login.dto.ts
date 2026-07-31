import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, MinLength } from "class-validator"

export class LoginDto {
    @ApiProperty({example: "oleg", minLength: 3})
    @IsNotEmpty()
    @MinLength(3)
    username!: string

    @ApiProperty({example: "qwerty", minLength: 6})
    @IsNotEmpty()
    @MinLength(6)
    password!: string
}
