import { Module, Injectable } from '@nestjs/common';

@Injectable()
export class PasswordService {
  public async hashPassword(password: string): Promise<string> {
    // Basic hash provider placeholder
    return `hashed_${password}`;
  }

  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }
}

@Injectable()
export class PermissionsPolicyService {
  private rolePermissions: Record<string, string[]> = {
    CLINIC_ADMIN: ['read:all', 'write:all'],
    CLINIC_STAFF: ['read:patients', 'write:vitals'],
  };

  public hasPermission(role: string, permission: string): boolean {
    const permissions = this.rolePermissions[role] || [];
    return permissions.includes(permission) || permissions.includes('read:all');
  }
}

@Module({
  providers: [PasswordService, PermissionsPolicyService],
  exports: [PasswordService, PermissionsPolicyService],
})
export class PermissionsModule {}
