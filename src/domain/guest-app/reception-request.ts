export const GUEST_RECEPTION_REQUEST_MAX = 400;
export const GUEST_RECEPTION_REQUEST_LIMIT = 20;

export type GuestReceptionRequestStatus = "pending" | "seen";

export type GuestReceptionRequestSnapshot = {
  id: string;
  message: string;
  status: GuestReceptionRequestStatus;
  createdAt: string;
};
