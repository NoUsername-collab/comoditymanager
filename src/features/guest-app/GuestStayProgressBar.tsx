import { stayProgressRatio } from "@/lib/guest-app/stay-dates";

type Props = {
  today: string;
  checkIn: string;
  checkOut: string;
};

export function GuestStayProgressBar({ today, checkIn, checkOut }: Props) {
  const ratio = stayProgressRatio({ today, checkIn, checkOut });

  return (
    <div
      className="guest-app__stay-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <span
        className="guest-app__stay-progress__fill"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  );
}
