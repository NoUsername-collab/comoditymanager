/** PostgreSQL / PostgREST errors when migration 048_checkin_system.sql was not applied. */
export function isCheckinMigrationMissing(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes("does not exist")) return false;

  return (
    lower.includes("checkin_doc_rule") ||
    lower.includes("checkin_cnp_rule") ||
    lower.includes("checkin_phone_rule") ||
    lower.includes("fisa_property_address") ||
    (lower.includes("national_id") && lower.includes("checkin_guests")) ||
    lower.includes("checkin_payment_rule") ||
    lower.includes("checkin_min_payment_pct") ||
    lower.includes("checkin_deposit") ||
    lower.includes("walkin_allowed") ||
    lower.includes("group_checkin_mode") ||
    /relation[^"]*checkins/.test(lower) ||
    /relation[^"]*checkin_guests/.test(lower)
  );
}
