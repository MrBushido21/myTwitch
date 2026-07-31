import { accessSync, constants } from 'node:fs';
import { delimiter, join, resolve, sep } from 'node:path';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';

/**
 * node-media-server проверяет ffmpeg через fs.access(X_OK), поэтому ему нужен
 * путь к файлу, а не имя команды: голое 'ffmpeg' на Windows не проходит проверку
 * и транскодер молча не стартует (а значит, нет и HLS).
 */
function resolveFfmpeg(): string {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;

    const exts = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
    for (const dir of (process.env.PATH || '').split(delimiter)) {
        if (!dir) continue;
        for (const ext of exts) {
            const candidate = join(dir, `ffmpeg${ext}`);
            try {
                accessSync(candidate, constants.X_OK);
                return candidate;
            } catch {

            }
        }
    }
    return 'ffmpeg'; 
}

/**
 * HLS пишется через ffmpeg `-f tee`, где обратный слеш — escape-символ: путь вида
 * D:\projects\... приходит в ffmpeg как D:projects... и запись падает. Поэтому
 * mediaroot всегда абсолютный и только с прямыми слешами (двоеточие диска tee не мешает).
 */
const mediaroot = resolve(process.cwd(), 'media').split(sep).join('/');

const config = {
    logType: 2,
    rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
    http: { port: 8000, mediaroot, allow_origin: '*' }, 
    trans: {
        ffmpeg: resolveFfmpeg(),
        tasks: [{ app: 'live', hls: true, hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]' }],
    },
};

/** streamPath приходит как '/live/<ключ>' */
function streamKeyOf(streamPath: string): string | null {
    return streamPath.split('/')[2] || null;
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MediaService.name);
    private nms!: NodeMediaServer;
    onModuleDestroy() { this.nms?.stop() }

    onModuleInit() {
        this.nms = new NodeMediaServer(config);

        this.nms.on('prePublish', async (id, streamPath) => {
            const streamKey = streamKeyOf(streamPath);
            const session = this.nms.getSession(id) as any;

            if (!streamKey) return session?.reject();

            try {
                const response = await fetch(process.env.PUBLISH_URL!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-secret': process.env.INTERNAL_SECRET!,
                },
                body: JSON.stringify({streamKey}),
                signal: AbortSignal.timeout(2000)
            });
            if (!response.ok) {
                this.logger.warn(`Rejected ${streamKey}: API status ${response.status}`);
                return session?.reject();
            }
            const {channel_id} = await response.json()

            this.logger.log(`Stream live: channel ${channel_id}`);

            } catch (error) {
                this.logger.error(`Rejected ${streamKey}: API unreachable`, error);
                session?.reject();
            }
            
        });

        this.nms.on('donePublish', async (_id, streamPath) => {
            const streamKey = streamKeyOf(streamPath);
            if (!streamKey) return;
            try {
                const response = await fetch(process.env.DONE_URL!, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-secret':process.env.INTERNAL_SECRET!
                    },
                    body: JSON.stringify({streamKey}),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const {channel_id} = await response.json()
 
                this.logger.log(`Stream ended: ${channel_id}`);
            } catch (e) {
                this.logger.error(`Failed to set offline for ${streamKey}`, e);
            }
        });

        this.nms.run();
    }
}
