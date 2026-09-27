import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  public cleanupExpiredSessions(): number {
    const now = Date.now();
    this.logger.log(`Running session cleanup task at ${new Date(now).toISOString()}`);
    // Mock cleanup count
    return 0;
  }
}

@Injectable()
export class AccountStatusService {
  public validateAccountStatus(account: { isActive: boolean; isLocked: boolean }): boolean {
    if (!account.isActive) {
      throw new Error('ACCOUNT_INACTIVE');
    }
    if (account.isLocked) {
      throw new Error('ACCOUNT_LOCKED');
    }
    return true;
  }
}
