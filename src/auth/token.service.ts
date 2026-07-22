import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TokenService {
    constructor(
        private jwt: JwtService,
        private config: ConfigService
    ) {}

    async generateTokens (payload: {sub:string, username:string}) {
        const  [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
                expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN')
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
                expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN')
            })
        ])
        return { accessToken, refreshToken }
    }

    async verifyRefresh(token:string) {
        return this.jwt.verifyAsync(token, {
            secret: this.config.getOrThrow('JWT_REFRESH_SECRET')
        }) 
    }
}