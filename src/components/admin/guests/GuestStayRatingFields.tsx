"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import "@/app/admin/guest-stay-rating.css";
import { AdminTextarea } from "@/components/admin/ui/AdminInput";
import type { GuestStayReviewRow } from "@/domain/guest/types";

export type ReviewPolarity = "positive" | "negative";

export type GuestStayRatingValue = {
  polarity: ReviewPolarity | null;
  intensity: number;
  note: string;
};

type BaseProps = {
  disabled?: boolean;
  initialReview?: GuestStayReviewRow | null;
  formKey?: string;
};

type FormProps = BaseProps & {
  mode?: "form";
  textareaClassName?: string;
};

type ControlledProps = BaseProps & {
  mode: "controlled";
  value: GuestStayRatingValue;
  onChange: (value: GuestStayRatingValue) => void;
  textareaClassName?: string;
};

function initialFromReview(
  review: GuestStayReviewRow | null | undefined
): GuestStayRatingValue {
  if (!review?.note?.trim()) {
    return { polarity: null, intensity: 3, note: "" };
  }
  return {
    polarity: review.polarity,
    intensity: review.intensity,
    note: review.note,
  };
}

export function readGuestStayRatingFromForm(form: HTMLFormElement): {
  polarity: ReviewPolarity | null;
  note: string;
} {
  const polarityRaw = String(
    (form.elements.namedItem("review_polarity") as HTMLInputElement | null)
      ?.value ?? ""
  ).trim();
  const note = String(
    (form.elements.namedItem("review_note") as HTMLTextAreaElement | null)
      ?.value ?? ""
  ).trim();
  const polarity =
    polarityRaw === "positive" || polarityRaw === "negative" ? polarityRaw : null;
  return { polarity, note };
}

export function GuestStayRatingFields(props: FormProps | ControlledProps) {
  const tGuests = useTranslations("admin.guests.review");
  const isControlled = props.mode === "controlled";

  const [internal, setInternal] = useState<GuestStayRatingValue>(() =>
    initialFromReview(props.initialReview)
  );

  const state = isControlled ? props.value : internal;

  function patch(next: Partial<GuestStayRatingValue>) {
    const merged = { ...state, ...next };
    if (isControlled) props.onChange(merged);
    else setInternal(merged);
  }

  function selectPolarity(polarity: ReviewPolarity) {
    if (state.polarity === polarity) return;
    patch({ polarity, intensity: 3, note: "" });
  }

  function intensityLevelKey(level: number) {
    if (state.polarity === "positive") return `positiveLevel.${level}` as const;
    if (state.polarity === "negative") return `negativeLevel.${level}` as const;
    return null;
  }

  const levelKey = intensityLevelKey(state.intensity);

  const textareaTone =
    state.polarity === "positive"
      ? "border-emerald-200 bg-emerald-50/40"
      : state.polarity === "negative"
        ? "border-red-200 bg-red-50/40"
        : "";

  const textareaKey = `${props.formKey ?? "stay"}-${state.polarity ?? "none"}`;

  return (
    <div className="guest-stay-rating space-y-3">
      {!isControlled && state.polarity ? (
        <>
          <input type="hidden" name="review_polarity" value={state.polarity} />
          <input
            type="hidden"
            name="review_intensity"
            value={state.intensity}
            readOnly
          />
        </>
      ) : null}

      <p className="guest-stay-rating__intro text-xs text-zinc-500">
        {tGuests("intro")}
      </p>

      <div className="guest-stay-rating__polarity" role="group" aria-label={tGuests("chooseTone")}>
        <button
          type="button"
          disabled={props.disabled}
          className={[
            "guest-stay-rating__polarity-btn",
            "guest-stay-rating__polarity-btn--positive",
            state.polarity === "positive" && "guest-stay-rating__polarity-btn--active",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={state.polarity === "positive"}
          onClick={() => selectPolarity("positive")}
        >
          {tGuests("positiveTone")}
        </button>
        <button
          type="button"
          disabled={props.disabled}
          className={[
            "guest-stay-rating__polarity-btn",
            "guest-stay-rating__polarity-btn--negative",
            state.polarity === "negative" && "guest-stay-rating__polarity-btn--active",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={state.polarity === "negative"}
          onClick={() => selectPolarity("negative")}
        >
          {tGuests("negativeTone")}
        </button>
      </div>

      {state.polarity ? (
        <div className="guest-stay-rating__body space-y-3">
          <div className="guest-stay-rating__scale">
            <span className="guest-stay-rating__scale-label">{tGuests("intensity")}</span>
            <div
              className="guest-stay-rating__scale-options"
              role="group"
              aria-label={tGuests("intensity")}
            >
              {Array.from({ length: 5 }, (_, index) => {
                const level = index + 1;
                const active = level === state.intensity;
                const captionKey = intensityLevelKey(level);
                const caption = captionKey ? tGuests(captionKey) : String(level);
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={props.disabled}
                    className={[
                      "guest-stay-rating__scale-btn",
                      state.polarity === "positive"
                        ? "guest-stay-rating__scale-btn--positive"
                        : "guest-stay-rating__scale-btn--negative",
                      active && "guest-stay-rating__scale-btn--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`${level} — ${caption}`}
                    aria-pressed={active}
                    onClick={() => patch({ intensity: level })}
                  >
                    <span className="guest-stay-rating__scale-num">{level}</span>
                    <span className="guest-stay-rating__scale-caption" aria-hidden="true">
                      {caption}
                    </span>
                  </button>
                );
              })}
            </div>
            {levelKey ? (
              <span className="guest-stay-rating__level">{tGuests(levelKey)}</span>
            ) : null}
          </div>

          {isControlled ? (
            <textarea
              rows={3}
              disabled={props.disabled}
              value={state.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder={
                state.polarity === "positive"
                  ? tGuests("positiveNotePlaceholder")
                  : tGuests("negativeNotePlaceholder")
              }
              className={[
                "guest-stay-rating__textarea",
                props.textareaClassName,
                textareaTone,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ) : (
            <AdminTextarea
              key={textareaKey}
              name="review_note"
              rows={3}
              disabled={props.disabled}
              defaultValue={state.polarity === props.initialReview?.polarity ? props.initialReview.note : ""}
              required
              placeholder={
                state.polarity === "positive"
                  ? tGuests("positiveNotePlaceholder")
                  : tGuests("negativeNotePlaceholder")
              }
              className={[
                props.textareaClassName,
                textareaTone,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
