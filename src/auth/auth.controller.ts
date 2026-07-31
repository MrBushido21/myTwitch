import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleGuard } from './guards/google.guard';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,                         // ← JS на фронте не прочитает — защита от XSS
      secure: process.env.NODE_ENV === 'production',  // ← только по HTTPS на проде
      sameSite: 'strict',                     // ← защита от CSRF
      maxAge: 1000 * 60 * 60 * 24 * 7,        // ← 7 дней в МИЛЛИСЕКУНДАХ, как refresh
      path: '/auth',                          // ← кука шлётся только на /auth/* роуты
    });
  }
  @Post('/register')
  @ApiOperation({ summary: "Registration by password" })
  @ApiResponse({ status: 201, description: "User created and return access and refresh tokens" })
  @ApiResponse({ status: 409, description: "Username or email alrady taken" })
  async create(
    @Body() body: RegisterDto,
    @Res() res: Response
  ) {
    const { accessToken, refreshToken } = await this.authService.registration(body);
    this.setRefreshCookie(res, refreshToken)
    return res.status(201).json({ accessToken })
  }

  @Post('/login')
  @ApiOperation({ summary: "Login by password" })
  @ApiResponse({ status: 200, description: "Login acept, return access and refresh tokens" })
  @ApiResponse({ status: 401, description: "Uncorrect username or passwrod" })
  async login(
    @Body() body: LoginDto,
    @Res() res: Response
  ) {
    const { accessToken, refreshToken } = await this.authService.login(body);
    this.setRefreshCookie(res, refreshToken)
    return res.status(200).json({ accessToken })
  }

  @Get('google')
  @ApiOperation({ summary: "Redirect to Google consent screen" })
  @ApiExcludeEndpoint()
  @UseGuards(GoogleGuard)
  async googleAuth(@Req() req: Request) { }

  @Get('google/callback')
  @ApiOperation({ summary: "Login by google" })
  @ApiResponse({ status: 201, description: 'Returns access token, sets refresh cookie' })
  @ApiResponse({ status: 401, description: 'No user from Google' })
  @UseGuards(GoogleGuard)
  async googleAuthRedirect(
    @Req() req: Request,
    @Res() res: Response
  ) {
    const { accessToken, refreshToken } = await this.authService.googleLogin(req);
    this.setRefreshCookie(res, refreshToken)
    return res.status(200).json({ accessToken })
  }

}
