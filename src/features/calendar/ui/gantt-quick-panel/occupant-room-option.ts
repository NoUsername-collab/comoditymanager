import { formatGuestFullName } from "@/domain/guest-name";

export function occupantRoomOptionLabel(args: {
  roomName: string;
  isTitular: boolean;
  titularLabel: string;
  lastName?: string;
  firstName?: string;
  incompleteLabel: string;
}): string {
  const parts = [args.roomName.trim()].filter(Boolean);
  if (args.isTitular) parts.push(args.titularLabel);
  const guestName = formatGuestFullName(
    args.lastName ?? "",
    args.firstName ?? "",
  );
  parts.push(guestName || args.incompleteLabel);
  return parts.join(" · ");
}
