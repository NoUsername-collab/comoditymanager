import type { GuestFeedbackRow } from "@/services/guest-feedback";

type Props = {
  feedback: GuestFeedbackRow;
};

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="bd-feedback__stars" aria-label={`${stars}/5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden
          className={s <= stars ? "bd-feedback__star--filled" : "bd-feedback__star--empty"}
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={s <= stars ? "#f59e0b" : "none"}
            stroke={s <= stars ? "#f59e0b" : "#d1d5db"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export function GuestFeedbackBadge({ feedback }: Props) {
  return (
    <div className="bd-feedback">
      <div className="bd-feedback__header">
        <StarDisplay stars={feedback.stars} />
        <span className="bd-feedback__date">
          {new Date(feedback.submitted_at).toLocaleDateString("ro-RO")}
        </span>
      </div>
      {feedback.comment.trim() ? (
        <p className="bd-feedback__comment">{feedback.comment}</p>
      ) : null}
    </div>
  );
}
