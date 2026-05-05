import LoginPage from '@ui/pages/login.page';
import RegisterPage from '@ui/pages/register.page';

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export class AuthService {
  public constructor(
    private readonly loginPage: LoginPage,
    private readonly registerPage: RegisterPage
  ) {}

  public async loginUser(email: string, password: string): Promise<void> {
    await this.loginPage.login(email, password);
  }

  public async registerUser(payload: RegisterUserPayload): Promise<void> {
    await this.registerPage.registerNewUser({ ...payload, confirmPassword: payload.password });
  }
}
