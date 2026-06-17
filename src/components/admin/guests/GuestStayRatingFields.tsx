"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
};

type FormProps = BaseProps & {
  mode?: "form";
  positiveNoteName?: string;
  negativeNoteName?: string;
  positiveStarsName?: string;
  negativeStarsName?: string;
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
  if (!review) {
    return { polarity: null, intensity: 3, note: "" };
  }
  if (review.positive_note?.trim()) {
    return {
      polarity: "positive",
      intensity: review.positive_stars ?? 3,
      note: review.positive_note,
    };
  }
  if (review.negative_note?.trim()) {
    return {
      polarity: "negative",
      intensity: review.negative_stars ?? 3,
      note: review.negative_note,
    };
  }
  return { polarity: null, intensity: 3, note: "" };
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

  const levelKey =
    state.polarity === "positive"
      ? (`positiveLevel.${state.intensity}` as const)
      : state.polarity === "negative"
        ? (`negativeLevel.${state.intensity}` as const)
        : null;

  const textareaTone =
    state.polarity === "positive"
      ? "border-emerald-200 bg-emerald-50/40"
      : state.polarity === "negative"
        ? "border-red-200 bg-red-50/40"
        : "";

  const positiveNote =
    state.polarity === "positive" ? state.note : "";
  const negativeNote =
    state.polarity === "negative" ? state.note : "";
  const positiveStars =
    state.polarity === "positive" ? state.intensity : "";
  const negativeStars =
    state.polarity === "negative" ? state.intensity : "";

  return (
    <div className="guest-stay-rating space-y-3">
      {!isControlled ? (
        <>
          <input
            type="hidden"
            name={props.positiveNoteName ?? "positive_note"}
            value={positiveNote}
          />
          <input
            type="hidden"
            name={props.negativeNoteName ?? "negative_note"}
            value={negativeNote}
          />
          <input
            type="hidden"
            name={props.positiveStarsName ?? "positive_stars"}
            value={positiveStars}
          />
          <input
            type="hidden"
            name={props.negativeStarsName ?? "negative_stars"}
            value={negativeStars}
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
                    aria-pressed={active}
                    onClick={() => patch({ intensity: level })}
                  >
                    {level}
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
