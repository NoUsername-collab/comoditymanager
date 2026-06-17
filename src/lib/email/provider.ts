/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Email Provider Abstraction                           ║
 * ║                                                                ║
 * ║  Supports: Resend (recommended), SMTP, or no-op (dev).        ║
 * ║  Configure via RESEND_API_KEY env var.                         ║
 * ║  Free tier: 3,000 emails/month — enough for ~100 bookings/day ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { PLATFORM_EMAIL_FROM } from "@/lib/platform/branding";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Reply-to address (defaults to FROM) */
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

export type EmailProviderKind = "resend" | "noop";

export type EmailDeliveryConfig = {
  configured: boolean;
  provider: EmailProviderKind;
  fromAddress: string;
};

export function getEmailFromAddress(): string {
  return process.env.EMAIL_FROM ?? PLATFORM_EMAIL_FROM;
}

/** True when a real outbound provider (Resend) is configured. */
export function getEmailDeliveryConfig(): EmailDeliveryConfig {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  return {
    configured: Boolean(resendKey),
    provider: resendKey ? "resend" : "noop",
    fromAddress: getEmailFromAddress(),
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailDeliveryConfig().configured;
}

// ─── Resend Provider ─────────────────────────────────────────────
class ResendProvider implements IEmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Resend API error: ${response.status} ${error}` };
      }

      const data = await response.json() as { id?: string };
      return { success: true, messageId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }
}

// ─── No-op Provider (dev/test) ──────────────────────────────────
class NoopProvider implements IEmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL-NOOP] Subject: ${message.subject}`);
    }
    return { success: true, messageId: `noop-${Date.now()}` };
  }
}

// ─── Provider Factory ────────────────────────────────────────────
export function getEmailProvider(): IEmailProvider {
  const { configured, fromAddress } = getEmailDeliveryConfig();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (configured && resendKey) {
    return new ResendProvider(resendKey, fromAddress);
  }
  return new NoopProvider();
}

/**
 * Send an email (convenience wrapper).
 * Returns result without throwing — callers decide how to handle failure.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return getEmailProvider().send(message);
}
