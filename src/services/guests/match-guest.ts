import { formatGuestFullName } from "@/domain/guest-name";
import {
  isPlaceholderEmail,
  normalizeEmail,
  normalizePhone,
  assertValidGuestPhone,
} from "@/domain/guest/normalize";
import type {
  GuestContactMatchInput,
  GuestContactMatchResult,
} from "@/domain/guest/match-guest";
import { pickGuestContactMatch } from "@/domain/guest/match-guest";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { ensureGuestProfiles } from "@/services/guest-profiles";
import { findGuestByNationalId, getGuestBaseById } from "./lookup";

type ContactCandidate = {
  id: string;
  last_name: string;
  first_name: string;
  phone_normalized: string | null;
  email_normalized: string | null;
};

async function loadContactCandidates(args: {
  phoneNormalized: string | null;
  emailNormalized: string | null;
  lastName: string;
  firstName: string;
}): Promise<ContactCandidate[]> {
  const { tenantId, supabase } = await getTenantScope();
  const byId = new Map<string, ContactCandidate>();

  const addRows = (rows: ContactCandidate[]) => {
    for (const row of rows) {
      byId.set(row.id, row);
    }
  };

  if (args.phoneNormalized) {
    const { data, error } = await supabase
      .from("guests")
      .select("id, last_name, first_name, phone_normalized, email_normalized")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", args.phoneNormalized)
      .limit(5);
    if (error) throw new Error(error.message);
    addRows((data ?? []) as ContactCandidate[]);
  }

  if (args.emailNormalized) {
    const { data, error } = await supabase
      .from("guests")
      .select("id, last_name, first_name, phone_normalized, email_normalized")
      .eq("tenant_id", tenantId)
      .eq("email_normalized", args.emailNormalized)
      .limit(5);
    if (error) throw new Error(error.message);
    addRows((data ?? []) as ContactCandidate[]);
  }

  if (args.lastName.length >= 2 && args.firstName.length >= 2) {
    const { data, error } = await supabase
      .from("guests")
      .select("id, last_name, first_name, phone_normalized, email_normalized")
      .eq("tenant_id", tenantId)
      .ilike("last_name", args.lastName)
      .ilike("first_name", args.firstName)
      .limit(5);
    if (error) throw new Error(error.message);
    addRows((data ?? []) as ContactCandidate[]);
  }

  return [...byId.values()];
}

export async function matchGuestByContact(
  input: GuestContactMatchInput
): Promise<GuestContactMatchResult> {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const phoneNormalized = normalizePhone(input.phone ?? "");
  const emailNormalized = normalizeEmail(input.email ?? "");
  const usableEmail =
    emailNormalized && !isPlaceholderEmail(emailNormalized)
      ? emailNormalized
      : null;

  if (!phoneNormalized && !usableEmail && (lastName.length < 2 || firstName.length < 2)) {
    return { status: "none" };
  }

  const candidates = await loadContactCandidates({
    phoneNormalized,
    emailNormalized: usableEmail,
    lastName,
    firstName,
  });

  return pickGuestContactMatch({
    input: { ...input, lastName, firstName },
    candidates,
    phoneNormalized,
    emailNormalized: usableEmail,
  });
}

export async function resolveGuestIdForIdentity(input: {
  guestId?: string | null;
  nationalId?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  phone?: string | null;
  email?: string | null;
  bookingGuestId?: string | null;
  isRepresentative?: boolean;
}): Promise<
  | { status: "matched"; guestId: string }
  | { status: "ambiguous"; message: string }
  | { status: "none" }
> {
  if (input.guestId) {
    return { status: "matched", guestId: input.guestId };
  }

  const nationalId = input.nationalId?.trim();
  if (nationalId) {
    const byNationalId = await findGuestByNationalId(nationalId);
    if (byNationalId) {
      return { status: "matched", guestId: byNationalId.id };
    }
  }

  const lastName = String(input.lastName ?? "").trim();
  const firstName = String(input.firstName ?? "").trim();
  const contactMatch = await matchGuestByContact({
    lastName,
    firstName,
    phone: input.phone,
    email: input.email,
  });

  if (contactMatch.status === "matched") {
    return { status: "matched", guestId: contactMatch.guestId };
  }

  if (contactMatch.status === "ambiguous") {
    return {
      status: "ambiguous",
      message:
        "Există mai mulți clienți cu aceleași date de contact (nume/telefon/email). Deschide profilul clientului și unifică duplicatele.",
    };
  }

  if (input.isRepresentative && input.bookingGuestId) {
    return { status: "matched", guestId: input.bookingGuestId };
  }

  return { status: "none" };
}

export async function createGuestFromContact(input: {
  lastName: string;
  firstName: string;
  phone?: string | null;
  email?: string | null;
}): Promise<string> {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  if (lastName.length < 1 || firstName.length < 1) {
    throw new Error("guest.name_required");
  }

  const duplicate = await matchGuestByContact({
    lastName,
    firstName,
    phone: input.phone,
    email: input.email,
  });
  if (duplicate.status === "matched") {
    return duplicate.guestId;
  }
  if (duplicate.status === "ambiguous") {
    throw new Error("guest.contact_ambiguous");
  }

  const emailNorm = normalizeEmail(input.email ?? "");
  const phoneNorm = normalizePhone(input.phone ?? "");
  const email =
    emailNorm && !isPlaceholderEmail(emailNorm) ? input.email!.trim() : null;
  let phone: string | null = null;
  if (phoneNorm) {
    assertValidGuestPhone(input.phone ?? "");
    phone = input.phone!.trim();
  }

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .insert(
      withTenantId(tenantId, {
        last_name: lastName,
        first_name: firstName,
        display_name: formatGuestFullName(lastName, firstName),
        email,
        email_normalized:
          emailNorm && !isPlaceholderEmail(emailNorm) ? emailNorm : null,
        phone,
        phone_normalized: phoneNorm || null,
      })
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await ensureGuestProfiles([data.id]);
  return String(data.id);
}

export async function touchGuestContactFields(
  guestId: string,
  input: {
    lastName?: string | null;
    firstName?: string | null;
    phone?: string | null;
    email?: string | null;
  }
): Promise<void> {
  const current = await getGuestBaseById(guestId);
  if (!current) return;

  const patch: Record<string, unknown> = {};
  const last = input.lastName?.trim();
  const first = input.firstName?.trim();
  if (last && first) {
    patch.last_name = last;
    patch.first_name = first;
    patch.display_name = formatGuestFullName(last, first);
  }

  const phoneNorm = normalizePhone(input.phone ?? "");
  if (phoneNorm) {
    assertValidGuestPhone(input.phone ?? "");
    patch.phone = input.phone!.trim();
    patch.phone_normalized = phoneNorm;
  }

  const emailNorm = normalizeEmail(input.email ?? "");
  if (emailNorm && !isPlaceholderEmail(emailNorm)) {
    patch.email = input.email!.trim();
    patch.email_normalized = emailNorm;
  }

  if (Object.keys(patch).length === 0) return;

  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("guests")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", guestId);
  if (error) throw new Error(error.message);
}
