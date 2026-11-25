import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type DeliveryResult = { ok: true } | { ok: false; reason: string };

/** Messages held by the `memory` driver. Tests read invitation links from here; production never uses it. */
export const sentMessages: EmailMessage[] = [];

/**
 * Delivers email through the configured driver and reports the truth: a failure is returned, never hidden,
 * so callers can show "invitation created, but the email could not be sent".
 *
 * Message bodies carry single-use tokens. They are never written to logs, except by the `log` driver,
 * which exists for local development and is rejected by configuration in production.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transport: Transporter | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get canDeliver(): boolean {
    return this.config.EMAIL_DRIVER !== 'disabled';
  }

  async send(message: EmailMessage): Promise<DeliveryResult> {
    switch (this.config.EMAIL_DRIVER) {
      case 'disabled':
        return { ok: false, reason: 'Email delivery is not configured on this server' };
      case 'memory':
        sentMessages.push(message);
        return { ok: true };
      case 'log':
        this.logger.warn(
          `[dev email] to=${message.to} subject="${message.subject}"\n${message.text}`,
        );
        return { ok: true };
      case 'smtp':
        return this.sendSmtp(message);
    }
  }

  private async sendSmtp(message: EmailMessage): Promise<DeliveryResult> {
    try {
      this.transport ??= createTransport({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_SECURE,
        auth: this.config.SMTP_USER
          ? { user: this.config.SMTP_USER, pass: this.config.SMTP_PASSWORD }
          : undefined,
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      });
      await this.transport.sendMail({ from: this.config.EMAIL_FROM, ...message });
      return { ok: true };
    } catch (error) {
      // Log the error class and code only: provider responses can echo recipient addresses and message content.
      const code = (error as { code?: string }).code ?? (error as Error).name;
      this.logger.error(`SMTP delivery failed (${code})`);
      return { ok: false, reason: `The mail server rejected or could not be reached (${code})` };
    }
  }
}
