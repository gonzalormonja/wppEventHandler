import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { SignInInput } from './models/sign-in.input.ts';
import { TokenOutput } from './models/token.output.js';
import { comparePassword } from '../utils/compare-password.js';
import { JwtService } from '@nestjs/jwt';
import { Admin } from '../entities/admin.entity.js';
import { hashPassword } from '../utils/hash-password.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminService: AdminService,
    private jwtService: JwtService,
  ) {}

  public async signIn({ email, password }: SignInInput): Promise<TokenOutput> {
    // Check if user exists
    const admin = await this.adminService.getOneBy('email', email);
    if (!admin)
      throw new BadRequestException('error.INCORRECT_EMAIL_OR_PASSWORD');
    const passwordMatches = comparePassword(password, admin.password);
    if (!passwordMatches)
      throw new BadRequestException('error.INCORRECT_EMAIL_OR_PASSWORD');
    const [accessToken, refreshToken] = this.getToken(admin);
    await this.updateRefreshToken(admin.id, refreshToken);
    return {
      adminId: admin.id,
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(
    adminId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = refreshToken ? hashPassword(refreshToken) : null;
    await this.adminService.updateRefreshToken(adminId, hashedRefreshToken);
  }

  private getToken(admin: Admin): [string, string] {
    const accessToken = this.jwtService.sign({
      id: admin.id,
      email: admin.email,
      name: admin.name,
    });
    const refreshToken = this.jwtService.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isRefreshToken: true,
      },
      { expiresIn: '7d' },
    );
    return [accessToken, refreshToken];
  }
}
