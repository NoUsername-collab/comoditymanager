"use client";

import { useEffect, useRef, useState } from "react";
import {
  NATIONAL_ID_COUNTRY,
  NATIONAL_ID_TYPES,
  type NationalIdType,
} from "@/domain/guest/national-id";

type Props = {
  value: NationalIdType;
  onChange: (type: NationalIdType) => void;
  disabled?: boolean;
  labelForType: (type: NationalIdType) => string;
  triggerClassName?: string;
};

export function NationalIdTypePicker({
  value,
  onChange,
  disabled,
  labelForType,
  triggerClassName = "guest-identity-form__select",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="guest-id-type-picker">
      <button
        type="button"
        className={`guest-id-type-picker__trigger ${triggerClassName}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={labelForType(value)}
        title={labelForType(value)}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="guest-id-type-picker__code">{NATIONAL_ID_COUNTRY[value]}</span>
        <span className="guest-id-type-picker__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="guest-id-type-picker__menu"
          role="listbox"
          aria-label={labelForType(value)}
        >
          {NATIONAL_ID_TYPES.map((type) => (
            <li key={type} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === type}
                className={[
                  "guest-id-type-picker__option",
                  value === type && "guest-id-type-picker__option--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onChange(type);
                  setOpen(false);
                }}
              >
                {labelForType(type)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
