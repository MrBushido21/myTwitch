import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

import { Response } from 'supertest';

function expectRefreshCookie(res: Response) {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

  expect(refreshCookie).toBeDefined();
  expect(refreshCookie).toContain('HttpOnly');
  expect(refreshCookie).toContain('Path=/auth');
  expect(refreshCookie).toContain('SameSite=Strict');
}

let app: INestApplication<App>;
let dataSource: DataSource;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  dataSource = app.get(DataSource);
});


afterAll(async () => {
  // await dataSource.query('TRUNCATE TABLE "refresh_entity", "channel_entity", "user_entity" RESTART IDENTITY CASCADE');
  await app.close();
});

describe('Auth registration (e2e)', () => {

  it('Auth registration by password -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: "oleglis99", password: "123456", email: "example11@gmail.com" })

    expect(res.status).toBe(201);
    expect(typeof res.body.accessToken).toBe('string');
    expectRefreshCookie(res); 
  });


  it.each([
    { name: "registration with alrady username", body: { username: "oleglis99", password: "123456", email: "example112@gmail.com" }, status: 409 },
    { name: "registration with alrady email", body: { username: "oleglis999", password: "123456", email: "example11@gmail.com" }, status: 409 },
    { name: "registration with uncorrect username", body: { username: "ol", password: "123456", email: "example11@gmail.com" }, status: 400 },
    { name: "registration with uncorrect email", body: { username: "oleg55", password: "123456", email: "example11gmail.com" }, status: 400 },
    { name: "registration with uncorrect password", body: { username: "oleg556", password: "123", email: "example113gmail.com" }, status: 400 },
  ])('$name -> $status', async ({ body, status }) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(status)
  });
});

describe('Auth login (e2e)', () => {
  it('Auth login -> 200', async () => {
    const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({username: "oleglis99", password: "123456"})

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expectRefreshCookie(res);
  })

  it.each([
    { name: "login with uncorrect username", body: { username: "oleglis9", password: "123456"}, status: 401 },
    { name: "login with uncorrect password", body: { username: "oleglis99", password: "1234566"}, status: 401 },
    { name: "login without username", body: { username: "", password: "123456"}, status: 400 },
    { name: "login without password", body: { username: "oleglis99", password: "" }, status: 400},
    { name: "login unvalidate username", body: { username: "ol", password: "123456"}, status: 400 },
    { name: "login unvalidate password", body: { username: "oleglis99", password: "123" }, status: 400},
  ])('$name -> $status', async ({ body, status }) => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(body)
      .expect(status)
  });
})

describe('Auth login/registration (e2e)', () => {
  it('Auth login with google -> 200', async () => {
    const res = await request(app.getHttpServer())
    .get('/auth/google/callback')
  })
})
