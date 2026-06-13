export type GuestIdentityValues = {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
};

export function hasLookupIdentity(values: GuestIdentityValues): boolean {
  return (
    values.email.trim().length > 0 ||
    values.phone.trim().length > 0 ||
    (values.lastName.trim().length > 1 && values.firstName.trim().length > 1)
  );
}

export function allIdentityEmpty(values: GuestIdentityValues): boolean {
  return (
    !values.lastName.trim() &&
    !values.firstName.trim() &&
    !values.email.trim() &&
    !values.phone.trim()
  );
}
