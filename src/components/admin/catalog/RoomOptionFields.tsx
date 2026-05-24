"use client";

import { useMemo } from "react";
import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { policyModeForOption, resolveOptionEnabled } from "@/lib/room-catalog-pricing";

type Props = {
  options: RoomOptionDefinition[];
  policies: { option_id: string; mode: OptionPolicyMode }[];
  selectedType: RoomTypeDefinition | null;
  selectedOptionIds: string[];
  onToggle?: (optionId: string, checked: boolean) => void;
  /** Controlled mode — pass state from parent */
  optionIds?: string[];
};

export function RoomOptionFields({
  options,
  policies,
  selectedType,
  selectedOptionIds,
  onToggle,
  optionIds,
}: Props) {
  const resolved = useMemo(() => {
    return options.map((option) => {
      const mode = policyModeForOption(policies, option.id);
      const typeDefault =
        selectedType?.default_option_ids.includes(option.id) ?? false;
      const roomSelected = (optionIds ?? selectedOptionIds).includes(option.id);
      const state = resolveOptionEnabled(mode, roomSelected, typeDefault);
      return { option, mode, ...state };
    });
  }, [options, policies, selectedType, selectedOptionIds, optionIds]);

  if (options.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nici o opțiune în catalog — adaugă din Administrare locație.
      </p>
    );
  }

  return (
    <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3">
      <legend className="px-1 text-sm font-medium">Opțiuni cameră</legend>
      {resolved.map(({ option, mode, enabled, editable, source }) => (
        <label
          key={option.id}
          className={`flex flex-wrap items-center gap-2 text-sm ${!editable ? "opacity-80" : ""}`}
        >
          {editable ? (
            <input
              type="checkbox"
              name="option_ids"
              value={option.id}
              defaultChecked={enabled}
              onChange={
                onToggle
                  ? (e) => onToggle(option.id, e.target.checked)
                  : undefined
              }
            />
          ) : enabled ? (
            <input type="hidden" name="option_ids" value={option.id} />
          ) : null}
          <span>
            {option.name}
            {option.price_per_night_addon > 0 && (
              <span className="text-zinc-500">
                {" "}
                (+{option.price_per_night_addon} RON/noapte)
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-400">
            {mode === "all_rooms"
              ? "· toate camerele clădirii"
              : mode === "none"
                ? "· indisponibil în clădire"
                : source === "type_default"
                  ? "· implicit din tip"
                  : "· per cameră"}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function HiddenOptionIdsFromPolicies({
  options,
  policies,
  selectedType,
}: {
  options: RoomOptionDefinition[];
  policies: { option_id: string; mode: OptionPolicyMode }[];
  selectedType: RoomTypeDefinition | null;
}) {
  const ids = options
    .filter((option) => {
      const mode = policyModeForOption(policies, option.id);
      const typeDefault =
        selectedType?.default_option_ids.includes(option.id) ?? false;
      return resolveOptionEnabled(mode, false, typeDefault).enabled;
    })
    .map((o) => o.id);

  return (
    <>
      {ids.map((id) => (
        <input key={id} type="hidden" name="option_ids" value={id} />
      ))}
    </>
  );
}
