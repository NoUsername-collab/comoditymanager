export type PensionContact = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  facebook: string | null;
  instagram: string | null;
};

export type PensionIdentity = {
  displayName: string;
  contact: PensionContact;
};

export const EMPTY_PENSION_CONTACT: PensionContact = {
  email: null,
  phone: null,
  whatsapp: null,
  telegram: null,
  facebook: null,
  instagram: null,
};

export function resolveContactWithPrimary(
  primary: PensionContact,
  override: Partial<PensionContact>,
  usePrimary: boolean,
): PensionContact {
  if (!usePrimary) {
    return {
      email: override.email ?? null,
      phone: override.phone ?? null,
      whatsapp: override.whatsapp ?? null,
      telegram: override.telegram ?? null,
      facebook: override.facebook ?? null,
      instagram: override.instagram ?? null,
    };
  }

  return {
    email: override.email ?? primary.email,
    phone: override.phone ?? primary.phone,
    whatsapp: override.whatsapp ?? primary.whatsapp,
    telegram: override.telegram ?? primary.telegram,
    facebook: override.facebook ?? primary.facebook,
    instagram: override.instagram ?? primary.instagram,
  };
}

export function resolveHotelContactWithPrimary(
  primary: PensionContact,
  hotel:
    | {
        phone?: string;
        email?: string;
        website?: string;
      }
    | undefined,
  usePrimary: boolean,
): {
  phone?: string;
  email?: string;
  website?: string;
} {
  if (!usePrimary || !hotel) {
    return hotel ?? {};
  }

  return {
    ...hotel,
    phone: hotel.phone?.trim() || primary.phone || undefined,
    email: hotel.email?.trim() || primary.email || undefined,
  };
}
