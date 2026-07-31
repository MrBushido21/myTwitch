import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../app.module';
import { UserEntity } from './entities/user.entity';

describe('googleLogin', () => {
  let app: INestApplication;
  let authService: AuthService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    authService = app.get(AuthService);
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE "refresh_entity", "channel_entity", "user_entity" RESTART IDENTITY CASCADE');
  });

  afterAll(async () => { await app.close(); });

  // ветка 1: новый юзер
  it('new google user → creates user + channel without password', async () => {
    const res = await authService.googleLogin({user: { googleId: 'g-1', email: 'a@gmail.com', username: 'A' }});

    expect(res.accessToken).toBeDefined();
    const user = await dataSource.getRepository(UserEntity).findOne({ where: { google_id: 'g-1' } });
    expect(user).toBeTruthy();
    expect(user!.password).toBeNull();
  });

  // ветка 2: существующий google-юзер → не дублируется
  it('existing google user → no duplicate', async () => {
    const profile = {user: { googleId: 'g-2', email: 'b@gmail.com', username: 'B' }};
    await authService.googleLogin(profile);
    await authService.googleLogin(profile);
    expect(await dataSource.getRepository(UserEntity).count()).toBe(1);
  });

  // ветка 3: linking по email
  it('password user with same email → links google_id', async () => {
    await authService.registration({ username: 'oleg', password: '123456', email: 'oleg@gmail.com' });
    await authService.googleLogin({user: { googleId: 'g-3', email: 'oleg@gmail.com', username: 'Oleg' }});

    const user = await dataSource.getRepository(UserEntity).findOne({ where: { email: 'oleg@gmail.com' } });
    expect(user!.google_id).toBe('g-3');
    expect(user!.password).not.toBeNull();   // пароль остался — один аккаунт, два входа
  });
});
