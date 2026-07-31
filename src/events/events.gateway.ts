import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway, WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChannelEntity } from "src/channel/entities/chanel.entity";
import { ILike, Repository } from "typeorm";

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect{
    constructor(
        private readonly jwtService: JwtService,
        private config: ConfigService,
        @InjectRepository(ChannelEntity)
        private chateRepo: Repository<ChannelEntity>
    ) { }
    private viewerCount(room: string): number {
        return this.server.sockets.adapter.rooms.get(room)?.size ?? 0;
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
        this.server.to(room).emit('viewers', this.viewerCount(room))
    }
    @SubscribeMessage('joinChannel')
    async handleJoin(client: Socket, clientChannelName: string) {
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
            this.server.to(prev).emit('viewers', this.viewerCount(prev))
        }
        client.join(room)
        client.data.channel = room
        this.server.to(room).emit('room', `${client.id} joined ${room}!`)
        this.server.to(room).emit('viewers', this.viewerCount(room))
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