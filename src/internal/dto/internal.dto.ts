import { IsNotEmpty, IsString } from "class-validator";

export class InternalDto {
    @IsString()
    @IsNotEmpty()
    streamKey!: string
}