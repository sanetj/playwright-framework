export interface RoleCredentials {
  roleId: string;
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  localStorage?: Record<string, string>;
  headers?: Record<string, string>;
}

export class CredentialVault {
  private vault = new Map<string, RoleCredentials>();

  public storeCredentials(creds: RoleCredentials): void {
    this.vault.set(creds.roleId, creds);
  }

  public getCredentials(roleId: string): RoleCredentials | undefined {
    return this.vault.get(roleId);
  }

  public removeCredentials(roleId: string): void {
    this.vault.delete(roleId);
  }
}
