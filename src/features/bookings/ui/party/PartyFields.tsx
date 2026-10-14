"use client";

import { useTranslations } from "next-intl";
import {
  MAX_MINOR_AGE,
  MAX_PARTY_ADULTS,
  MAX_PARTY_CHILDREN,
  PARTY_FORM_FIELDS,
  storableChildAges,
  type Party,
} from "@/domain/availability/party";

type Appearance = "admin" | "reception" | "public";

const AGE_OPTIONS = Array.from({ length: MAX_MINOR_AGE + 1 }, (_, age) => age);

function styles(appearance: Appearance) {
  if (appearance === "public") {
    return {
      label: "site-field",
      control: "mt-1 w-full",
      select: "mt-1 w-full",
      hint: "text-xs text-[var(--site-muted)]",
      check: "flex items-start gap-2 text-sm text-[var(--site-fg)]",
    };
  }
  if (appearance === "reception") {
    return {
      label: "block text-sm",
      control: "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5",
      select: "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5",
      hint: "text-xs text-zinc-500",
      check: "flex items-start gap-2 text-sm",
    };
  }
  return {
    label: "admin-field__label block uppercase tracking-[0.08em]",
    control: "admin-field__input admin-field__input--md mt-1",
    select: "admin-field__select admin-field__select--md mt-1",
    hint: "admin-settings-hint text-xs",
    check: "flex items-start gap-2 text-sm",
  };
}

/**
 * Adults plus one age per child. Ages decide who needs a bed of their own,
 * so a family is never split across rooms only because it has children.
 */
export function PartyFields({
  value,
  onChange,
  appearance,
}: {
  value: Party;
  onChange: (next: Party) => void;
  appearance: Appearance;
}) {
  const t = useTranslations("party");
  const s = styles(appearance);
  const childCount = value.childAges.length;

  function setAdults(raw: string) {
    const n = Number(raw);
    onChange({
      ...value,
      adults: Number.isFinite(n) ? Math.min(MAX_PARTY_ADULTS, Math.max(1, Math.floor(n))) : 1,
    });
  }

  function setChildCount(raw: string) {
    const n = Number(raw);
    const count = Number.isFinite(n)
      ? Math.min(MAX_PARTY_CHILDREN, Math.max(0, Math.floor(n)))
      : 0;
    const childAges = value.childAges.slice(0, count);
    while (childAges.length < count) childAges.push(null);
    onChange({
      ...value,
      childAges,
      childrenSeparateRoom: count > 0 && value.childrenSeparateRoom,
    });
  }

  function setAge(index: number, raw: string) {
    const childAges = [...value.childAges];
    childAges[index] = raw === "" ? null : Number(raw);
    onChange({ ...value, childAges });
  }

  return (
    <div className="party-fields space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <label className={s.label}>
          {t("adults")}
          <input
            type="number"
            min={1}
            max={MAX_PARTY_ADULTS}
            required
            value={value.adults}
            onChange={(e) => setAdults(e.target.value)}
            className={s.control}
          />
        </label>
        <label className={s.label}>
          {t("children")}
          <input
            type="number"
            min={0}
            max={MAX_PARTY_CHILDREN}
            value={childCount}
            onChange={(e) => setChildCount(e.target.value)}
            className={s.control}
          />
        </label>
      </div>

      {childCount > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {value.childAges.map((age, index) => (
              <label key={index} className={s.label}>
                {t("childAge", { number: index + 1 })}
                <select
                  required
                  value={age ?? ""}
                  onChange={(e) => setAge(index, e.target.value)}
                  className={s.select}
                  aria-invalid={age == null}
                >
                  <option value="" disabled>
                    {t("agePlaceholder")}
                  </option>
                  {AGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t("ageOption", { age: option })}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className={s.hint}>{t("agesHint")}</p>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={value.childrenSeparateRoom}
              onChange={(e) =>
                onChange({ ...value, childrenSeparateRoom: e.target.checked })
              }
              className="mt-0.5 rounded"
            />
            <span>
              {t("separateRoom")}
              <span className={`block ${s.hint}`}>{t("separateRoomHint")}</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/** The party as plain form fields, read back on the server with partyFromFormData. */
export function PartyHiddenInputs({ party }: { party: Party }) {
  return (
    <>
      <input type="hidden" name={PARTY_FORM_FIELDS.adults} value={party.adults} />
      <input
        type="hidden"
        name={PARTY_FORM_FIELDS.childAges}
        value={JSON.stringify(storableChildAges(party) ?? party.childAges)}
      />
      <input
        type="hidden"
        name={PARTY_FORM_FIELDS.childrenSeparateRoom}
        value={party.childrenSeparateRoom ? "1" : "0"}
      />
    </>
  );
}
