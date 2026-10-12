export function isIdentityConfigured(
  displayName: string | null | undefined,
): boolean {
  const name = displayName?.trim() ?? "";
  return name.length >= 2;
}

export function isEmailChannelConfigured(opts: {
  emailReplyTo?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
}): boolean {
  return Boolean(
    opts.emailReplyTo?.trim() ||
      opts.emailFromName?.trim() ||
      opts.emailFromAddress?.trim(),
  );
}
