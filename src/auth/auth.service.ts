import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import * as bcrypt from 'bcrypt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { ChannelEntity } from './entities/chanel.entity';
import { randomBytes } from 'crypto';
import { TokenService } from './token.service';
import { RefreshEntity } from './entities/refresh.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: TokenService,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(UserEntity)
    private channelRepo: Repository<ChannelEntity>,
    @InjectRepository(RefreshEntity)
    private refreshRepo: Repository<RefreshEntity>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) { }
  async registration(body: { username: string, password: string, email: string }) {
    const existing = await this.userRepo.findOne({ where:  [
    { username: body.username },
    { email: body.email },
  ] })
    if (existing) throw new ConflictException('Username or email already taken')
    const hash = await this.hashed(body.password)
    const stream_key = randomBytes(32).toString('hex')
    const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(UserEntity,
          { username: body.username, email: body.email, password: hash })
        await manager.save(ChannelEntity, { user, stream_key })
        return user
      })
      const { accessToken, refreshToken, hashToken } = await this.jwtCreate(user)
      await this.refreshRepo.save({ token: hashToken, expires_at: refreshExpiresAt, user })
      return { accessToken, refreshToken }
    } catch (e: any) {
      console.log(e.code);
      
      if (e.code === '23505') {              // Postgres: unique_violation
        throw new ConflictException('Username or email already taken');
      }
      throw e;                               // остальное — пробрасываем как есть
    }
  }

  async login(body: { username: string, password: string }) {
    const user = await this.userRepo.findOne({
      where: { username: body.username },
      select: { id: true, username: true, password: true }
    })
    if (!user) throw new UnauthorizedException("username or password uncorrect")
    const compare = await this.compareed(body.password, user.password!)
    if (!compare) throw new UnauthorizedException("username or password uncorrect")

    const { accessToken, refreshToken, hashToken } = await this.jwtCreate(user)
    await this.jwtTransaction(user, hashToken)
    return { id: user.id, username: user.username, accessToken, refreshToken }
  }

  async googleLogin(req) { 
    
    if (!req.user) {
      return 'No user from google';
    }
    const user = await this.userRepo.findOne({ where: { google_id: req.user.googleId } })
    if (user) {
      const { accessToken, refreshToken, hashToken } = await this.jwtCreate(user)
      await this.jwtTransaction(user, hashToken)
      return { accessToken, refreshToken }
    } else {
      const userByEmail = await this.userRepo.findOne({ where: { email: req.user.email } })
      if (userByEmail) {
        await this.userRepo.update({ id: userByEmail.id }, { google_id: req.user.googleId })
        userByEmail.google_id = req.user.googleId
        const { accessToken, refreshToken, hashToken } = await this.jwtCreate(userByEmail)
        await this.jwtTransaction(userByEmail, hashToken)
        return { accessToken, refreshToken }
      }
      const stream_key = randomBytes(32).toString('hex')
      const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      const user = await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(UserEntity,
          { username: req.user.username, email: req.user.email, google_id: req.user.googleId })
        await manager.save(ChannelEntity, { user, stream_key })
        return user
      })
      const { accessToken, refreshToken, hashToken } = await this.jwtCreate(user)
      await this.refreshRepo.save({ token: hashToken, expires_at: refreshExpiresAt, user })
      return { accessToken, refreshToken }
    }
  }

  async hashed(password: string) {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  compareed(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async jwtCreate(user: UserEntity) {
    const { accessToken, refreshToken } = await this.jwtService.generateTokens({ sub: user.id, username: user.username })
    const hashToken = await this.hashed(refreshToken)
    return { accessToken, refreshToken, hashToken }
  }

  async jwtTransaction(user:UserEntity, hashToken:string) {
    const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await this.dataSource.transaction(async (manager) => {
        await manager.delete(RefreshEntity, { user: { id: user.id } })
        await manager.save(RefreshEntity, { user, token: hashToken, expires_at: refreshExpiresAt })
      })
  }
}
