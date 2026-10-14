"use client";

import { useTranslations } from "next-intl";
import { SettingRow } from "@/components/admin/settings/SettingRow";
import {
  MAX_MINOR_AGE,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";
import {
  canRoomsHostParty,
  type RoomCapacity,
} from "@/domain/availability/stay-capacity";

const DOUBLE: RoomCapacity = {
  capacity_base: 2,
  allows_extra_beds: false,
  max_extra_beds_per_room: 0,
};
const DOUBLE_EXTRA_BED: RoomCapacity = { ...DOUBLE, allows_extra_beds: true, max_extra_beds_per_room: 1 };

/** Families the owner can check the rules against, room by room. */
const EXAMPLES: { key: string; party: Party; room: RoomCapacity }[] = [
  { key: "exampleOneChild", party: family([6]), room: DOUBLE },
  { key: "exampleTeen", party: family([16]), room: DOUBLE },
  { key: "exampleBabyAndChild", party: family([1, 4]), room: DOUBLE },
  { key: "exampleTwoChildren", party: family([5, 8]), room: DOUBLE_EXTRA_BED },
  { key: "exampleTwoTeens", party: family([15, 17]), room: DOUBLE_EXTRA_BED },
];

function family(childAges: number[]): Party {
  return { adults: 2, childAges, childrenSeparateRoom: false };
}

type FeeKey = "extraBedFeePerNight" | "cotFeePerNight";

export function ChildPolicySettings({
  policy,
  onChange,
  extraBedFee,
  cotFee,
  onFeeChange,
}: {
  policy: ChildPolicy;
  onChange: (next: ChildPolicy) => void;
  extraBedFee: number;
  cotFee: number;
  onFeeChange: (key: FeeKey, value: number) => void;
}) {
  const t = useTranslations("admin.pages.settings.booking.children");

  function fee(key: FeeKey, value: number) {
    return (
      <div className="settings-percent-field">
        <input
          type="number"
          min={0}
          max={10000}
          step={1}
          className="checkin-field__input checkin-field__input--narrow"
          value={value}
          onChange={(e) =>
            onFeeChange(key, Math.min(10000, Math.max(0, Number(e.target.value) || 0)))
          }
        />
        <span>{t("ronPerNight")}</span>
      </div>
    );
  }

  function toggle(
    key: "childrenShareBed" | "childWithParents" | "loneTeenWithParents" | "infantsWithParents",
  ) {
    return (
      <label className="checkin-toggle">
        <input
          type="checkbox"
          checked={policy[key]}
          onChange={(e) => onChange({ ...policy, [key]: e.target.checked })}
        />
        <span>{policy[key] ? t("on") : t("off")}</span>
      </label>
    );
  }

  return (
    <>
      <h3 className="checkin-settings__title">{t("title")}</h3>
      <p className="settings-season-block__desc">{t("intro")}</p>

      <SettingRow label={t("childMaxAge")} description={t("childMaxAgeDesc")}>
        <select
          className="checkin-field__input"
          value={policy.childMaxAge}
          onChange={(e) => {
            const childMaxAge = Number(e.target.value);
            onChange({
              ...policy,
              childMaxAge,
              infantMaxAge:
                policy.infantMaxAge != null && policy.infantMaxAge >= childMaxAge
                  ? null
                  : policy.infantMaxAge,
            });
          }}
        >
          {Array.from({ length: MAX_MINOR_AGE }, (_, i) => i + 1).map((age) => (
            <option key={age} value={age}>
              {t("upToAge", { age })}
            </option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label={t("infantMaxAge")} description={t("infantMaxAgeDesc")}>
        <select
          className="checkin-field__input"
          value={policy.infantMaxAge ?? ""}
          onChange={(e) =>
            onChange({
              ...policy,
              infantMaxAge: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        >
          <option value="">{t("noInfantRule")}</option>
          {[0, 1, 2, 3, 4, 5]
            .filter((age) => age < policy.childMaxAge)
            .map((age) => (
              <option key={age} value={age}>
                {t("upToAge", { age })}
              </option>
            ))}
        </select>
      </SettingRow>

      {policy.infantMaxAge != null ? (
        <SettingRow label={t("infantsWithParents")} description={t("infantsWithParentsDesc")}>
          {toggle("infantsWithParents")}
        </SettingRow>
      ) : null}

      <SettingRow label={t("childWithParents")} description={t("childWithParentsDesc")}>
        {toggle("childWithParents")}
      </SettingRow>

      {policy.childWithParents ? (
        <SettingRow label={t("loneTeen")} description={t("loneTeenDesc")}>
          {toggle("loneTeenWithParents")}
        </SettingRow>
      ) : null}

      <SettingRow label={t("shareBed")} description={t("shareBedDesc")}>
        {toggle("childrenShareBed")}
      </SettingRow>

      <SettingRow label={t("extraBedFee")} description={t("extraBedFeeDesc")}>
        {fee("extraBedFeePerNight", extraBedFee)}
      </SettingRow>

      <SettingRow label={t("cotFee")} description={t("cotFeeDesc")}>
        {fee("cotFeePerNight", cotFee)}
      </SettingRow>

      <div className="settings-policy-preview" role="note">
        <p className="m-0 font-semibold">{t("examplesTitle")}</p>
        <ul className="m-0 mt-1 list-none pl-0">
          {EXAMPLES.map((example) => {
            const fits = canRoomsHostParty(example.party, [example.room], policy);
            return (
              <li key={example.key}>
                {fits ? "✓" : "✗"} {t(example.key)} — {fits ? t("fitsOneRoom") : t("needsMoreRoom")}
              </li>
            );
          })}
        </ul>
        <p className="m-0 mt-1">{t("stockNote")}</p>
      </div>
    </>
  );
}
