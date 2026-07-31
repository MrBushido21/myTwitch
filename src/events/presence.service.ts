import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class PresenceService {
    private server: Server | null = null;

    setServer(server: Server) {
        this.server = server;
    }

    count(room: string): number {
        return this.server?.sockets.adapter.rooms.get(room)?.size ?? 0;
    }
}