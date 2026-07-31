import { ChildProcess, spawn } from 'node:child_process';
import { accessSync, constants, mkdirSync, rmSync } from 'node:fs';
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

const ffmpegPath = resolveFfmpeg();

/**
 * Абсолютный путь и только прямые слеши: этот же путь уходит в аргументы ffmpeg,
 * где обратный слеш в ряде мест трактуется как escape-символ.
 */
const mediaroot = resolve(process.cwd(), 'media').split(sep).join('/');

/**
 * Встроенный `trans` жёстко пишет HLS в mediaroot/<app>/<streamName>, а streamName —
 * это stream_key. Ключ на публикацию утекал бы в публичный URL плейлиста, поэтому
 * транскодером управляем сами и раскладываем по channel_id (см. startTranscoder).
 */
const config = {
    logType: 2,
    rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
    http: { port: 8000, mediaroot, allow_origin: '*' },
};

/** streamPath приходит как '/live/<ключ>' */
function streamKeyOf(streamPath: string): string | null {
    return streamPath.split('/')[2] || null;
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MediaService.name);
    private nms!: NodeMediaServer;

    /** streamPath -> channel_id, подтверждённый основным API в prePublish */
    private readonly channels = new Map<string, string>();
    /** streamPath -> наш ffmpeg, который тянет RTMP и пишет HLS */
    private readonly transcoders = new Map<string, ChildProcess>();

    onModuleDestroy() {
        for (const streamPath of [...this.transcoders.keys()]) this.stopTranscoder(streamPath);
        this.nms?.stop();
    }

    /**
     * Читает поток обратно с локального RTMP и пишет HLS в media/live/<channel_id>.
     * Видео и звук копируются как есть (транскодирования нет), поэтому нагрузка
     * минимальная; вторым выходом раз в 15 секунд перезаписывается превью.
     */
    private startTranscoder(streamPath: string, streamKey: string, channelId: string) {
        const out = `${mediaroot}/live/${channelId}`;
        rmSync(out, { recursive: true, force: true });
        mkdirSync(out, { recursive: true });

        const args = [
            '-loglevel', 'warning',
            '-y',
            '-i', `rtmp://127.0.0.1:${config.rtmp.port}/live/${streamKey}`,

            // плейлист; '0:a?' — вопрос делает аудиодорожку необязательной
            '-map', '0:v', '-map', '0:a?',
            '-c', 'copy',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '6',
            '-hls_flags', 'delete_segments+independent_segments',
            '-hls_segment_filename', `${out}/seg_%05d.ts`,
            `${out}/index.m3u8`,

            // превью для главной страницы
            '-map', '0:v',
            '-vf', 'fps=1/15,scale=480:-2',
            '-update', '1',
            `${out}/thumb.jpg`,
        ];

        const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
        this.transcoders.set(streamPath, proc);

        proc.stderr.on('data', (chunk: Buffer) =>
            this.logger.warn(`[ffmpeg ${channelId}] ${chunk.toString().trim()}`),
        );
        proc.on('error', (e) => this.logger.error(`ffmpeg failed to start for ${channelId}`, e));
        proc.on('exit', (code, signal) => {
            this.transcoders.delete(streamPath);
            this.logger.log(`ffmpeg exited for ${channelId} (code=${code} signal=${signal})`);
        });

        this.logger.log(`Transcoding ${channelId} -> /live/${channelId}/index.m3u8`);
    }

    /**
     * 'q' в stdin — штатный способ попросить ffmpeg закрыться: он дописывает
     * плейлист и выходит. На Windows сигналы не доставляются, поэтому kill — только
     * как страховка, если через 3 секунды процесс всё ещё жив.
     */
    private stopTranscoder(streamPath: string) {
        const proc = this.transcoders.get(streamPath);
        if (!proc) return;
        this.transcoders.delete(streamPath);
        proc.stdin?.write('q');
        setTimeout(() => {
            if (proc.exitCode === null && proc.signalCode === null) proc.kill();
        }, 3000).unref();
    }

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

            // postPublish уже отработал синхронно, пока шёл fetch, — публикация
            // зарегистрирована, и ffmpeg может подключаться игроком прямо сейчас.
            this.channels.set(streamPath, channel_id);
            this.startTranscoder(streamPath, streamKey, channel_id);

            } catch (error) {
                this.logger.error(`Rejected ${streamKey}: API unreachable`, error);
                session?.reject();
            }
            
        });

        this.nms.on('donePublish', async (_id, streamPath) => {
            const streamKey = streamKeyOf(streamPath);
            const channelId = this.channels.get(streamPath);
            this.channels.delete(streamPath);
            this.stopTranscoder(streamPath);

            // сессию отклонили в prePublish — в БД её никто не открывал
            if (!streamKey || !channelId) return;
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
