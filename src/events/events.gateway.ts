import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway, WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChannelEntity } from "src/channel/entities/chanel.entity";
import { StreamService } from "src/stream/stream.service";
import { ILike, Repository } from "typeorm";
import { PresenceService } from "./presence.service";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly jwtService: JwtService,
        private readonly streamService: StreamService,
        private readonly presence: PresenceService,
        private config: ConfigService,
        @InjectRepository(ChannelEntity)
        private chateRepo: Repository<ChannelEntity>,
    ) { }
     afterInit(server: Server) {
        this.presence.setServer(server);
    }
    @WebSocketServer()
    server!: Server;
    async handleConnection(client: Socket) {
        const raw = client.handshake.headers.authorization;   // 'Bearer xxx'
        const token = raw?.split(' ')[1]
        if (!token) return;
        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string; username: string }>(
                token, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') },
            );
            client.data.user = payload;
        } catch { }
    }
    handleDisconnect(client: Socket) {
        const room = client.data.channel
        if (!room) return
        this.server.to(room).emit('viewers', this.presence.count(room))
    }
    @SubscribeMessage('joinChannel')
    async handleJoin(client: Socket, clientChannelName: string) {
        console.log('joinChannel:', clientChannelName);
        const channel = await this.chateRepo.findOne({
            where: { user: { username: ILike(clientChannelName.trim()) } },
            relations: { user: true },
            select: { user: { username: true } }
        })
        if (!channel) return { ok: false, error: 'channel not found' }
        const room = channel.user.username
        const prev = client.data.channel
        if (prev === room) return { ok: true }
        if (prev) {
            client.leave(prev)
            this.server.to(prev).emit('viewers', this.presence.count(prev))
        }
        client.join(room)
        client.data.channel = room
        this.server.to(room).emit('room', `${client.id} joined ${room}!`)
        this.server.to(room).emit('viewers', this.presence.count(room))
        console.log(this.presence.count(room));
        
        await this.streamService.recordPeak(channel.id, this.presence.count(room))
        return { ok: true }
    }
    @SubscribeMessage('sendMessage')
    handleSendMessage(client: Socket, message: string) {
        const channel = client.data.channel
        const user = client.data.user
        if (!channel || !user) return
        this.server.to(channel).emit('chat', `[${user.username}] ${message}`)
    }
}