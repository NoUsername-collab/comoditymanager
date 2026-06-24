/** PostgreSQL / PostgREST errors when migration 048_checkin_system.sql was not applied. */
export function isCheckinMigrationMissing(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes("does not exist")) return false;

  return (
    lower.includes("checkin_doc_rule") ||
    lower.includes("checkin_cnp_rule") ||
    lower.includes("checkin_phone_rule") ||
    lower.includes("fisa_property_address") ||
    lower.includes("room_label") ||
    lower.includes("document_series") ||
    (lower.includes("national_id") && lower.includes("checkin_guests")) ||
    lower.includes("checkin_payment_rule") ||
    lower.includes("checkout_block_unpaid") ||
    lower.includes("checkin_min_payment_pct") ||
    lower.includes("checkin_deposit") ||
    lower.includes("walkin_allowed") ||
    lower.includes("group_checkin_mode") ||
    lower.includes("checkin_key_rule") ||
    lower.includes("checkin_ids_per_room") ||
    lower.includes("early_checkout_allowed") ||
    lower.includes("early_checkout_fee") ||
    /relation[^"]*checkins/.test(lower) ||
    /relation[^"]*checkin_guests/.test(lower)
  );
}
