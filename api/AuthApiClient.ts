import { BaseApiClient } from './BaseApiClient';
import { LoginResponse } from '../models/LoginResponse';
import { User } from '../models/User';

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register'
} as const;

export class AuthApiClient extends BaseApiClient {
  public async login(email: string, password: string): Promise<LoginResponse> {
    return this.post<LoginResponse>(AUTH_ENDPOINTS.login, {
      data: { email, password }
    });
  }

  public async register(user: User & { password: string }): Promise<User> {
    return this.post<User>(AUTH_ENDPOINTS.register, { data: user });
  }

  public extractToken(response: LoginResponse): string {
    if (!response.token) {
      throw new Error('Login response does not contain a token.');
    }

    return response.token;
  }
}
