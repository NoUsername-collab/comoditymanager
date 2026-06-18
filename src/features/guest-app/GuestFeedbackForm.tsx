"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitGuestFeedbackAction } from "@/app/[locale]/(guest-app)/stay/[code]/actions";

type Props = {
  accessCode: string;
  alreadySubmitted: boolean;
  existingStars?: number;
};

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="guest-feedback__stars" role="radiogroup">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`guest-feedback__star ${
            star <= (hover || value) ? "guest-feedback__star--active" : ""
          }`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          aria-label={`${star} / 5`}
        >
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={star <= (hover || value) ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function GuestFeedbackForm({
  accessCode,
  alreadySubmitted,
  existingStars,
}: Props) {
  const t = useTranslations("guestApp.feedback");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySubmitted);
  const [stars, setStars] = useState(existingStars ?? 0);
  const [comment, setComment] = useState("");

  if (done) {
    return (
      <div className="guest-app__success-box">
        <p>{t("thankYou")}</p>
        <p className="guest-app__muted text-sm mt-1">{t("thankYouDesc")}</p>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stars < 1) {
      setError(t("starsRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitGuestFeedbackAction({
        accessCode,
        stars,
        comment,
      });
      if (!result.ok) {
        setError(t("errorGeneric"));
        return;
      }
      setDone(true);
    });
  }

  return (
    <form className="guest-app__form space-y-4" onSubmit={handleSubmit}>
      <p className="guest-app__subtle text-sm leading-relaxed">
        {t("description")}
      </p>

      <div className="guest-app__field">
        <span className="guest-app__field__label">{t("rating")}</span>
        <StarInput value={stars} onChange={setStars} />
      </div>

      <label className="guest-app__field">
        <span className="guest-app__field__label">{t("comment")}</span>
        <textarea
          className="guest-app__field__input"
          rows={3}
          placeholder={t("commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      {error ? <p className="guest-app__form-error">{error}</p> : null}

      <button
        type="submit"
        className="guest-app__btn-primary"
        disabled={pending || stars < 1}
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
