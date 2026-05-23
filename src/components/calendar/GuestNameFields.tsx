type Props = {
  /** Formular recepție (inputuri mai mici) */
  compact?: boolean;
};

export function GuestNameFields({ compact }: Props) {
  const inputClass = compact
    ? "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
    : "mt-1 w-full";
  const labelClass = compact
    ? "block text-sm"
    : "site-field text-[var(--site-fg)]";

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
      <label className={labelClass}>
        Nume (familie) *
        <input
          name="guest_last_name"
          required
          autoComplete="family-name"
          placeholder="ex. Popescu"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Prenume *
        <input
          name="guest_first_name"
          required
          autoComplete="given-name"
          placeholder="ex. Maria"
          className={inputClass}
        />
      </label>
    </div>
  );
}
