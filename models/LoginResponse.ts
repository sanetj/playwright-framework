export interface LoginResponse {
  token: string;
  expiresIn?: number;
  refreshToken?: string;
  userId?: number;
}
