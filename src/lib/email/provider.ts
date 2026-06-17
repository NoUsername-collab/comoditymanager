/**
 * Email provider abstraction — Resend when RESEND_API_KEY is set, noop otherwise.
 * From/reply-to identity comes from tenant settings (see services/email-identity).
 */

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  /** Plain text fallback */
  text?: string;
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
};

/** True when a real outbound provider (Resend) is configured. */
export function getEmailDeliveryConfig(): EmailDeliveryConfig {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  return {
    configured: Boolean(resendKey),
    provider: resendKey ? "resend" : "noop",
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailDeliveryConfig().configured;
}

class ResendProvider implements IEmailProvider {
  constructor(private apiKey: string) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Resend API error: ${response.status} ${error}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }
}

class NoopProvider implements IEmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL-NOOP] From: ${message.from} → ${message.to}`);
      console.log(`[EMAIL-NOOP] Subject: ${message.subject}`);
    }
    return { success: true, messageId: `noop-${Date.now()}` };
  }
}

export function getEmailProvider(): IEmailProvider {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    return new ResendProvider(resendKey);
  }
  return new NoopProvider();
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return getEmailProvider().send(message);
}
