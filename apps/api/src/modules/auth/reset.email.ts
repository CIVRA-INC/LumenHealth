export interface PasswordResetEmailService {
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
}

class ConsolePasswordResetEmailService implements PasswordResetEmailService {
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    console.log("[MockEmailService] Password reset token generated", {
      email,
      resetToken,
    });
  }
}

export const passwordResetEmailService: PasswordResetEmailService =
  new ConsolePasswordResetEmailService();
