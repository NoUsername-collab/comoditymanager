"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  saveOnboardingInventoryAction,
  saveOnboardingStep1Action,
} from "@/features/onboarding/actions";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

type RoomTypeOption = { id: string; name: string };

type RoomRow = {
  key: string;
  name: string;
  typeId: string;
  price: string;
};

type Props = {
  initialName: string;
  initialCheckIn: string;
  initialCheckOut: string;
  building: { id: string; name: string } | null;
  roomTypes: RoomTypeOption[];
  roomCount: number;
};

function newRow(typeId: string, name = ""): RoomRow {
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    typeId,
    price: "",
  };
}

export function OnboardingWizard({
  initialName,
  initialCheckIn,
  initialCheckOut,
  building,
  roomTypes,
  roomCount,
}: Props) {
  const t = useTranslations("admin.onboarding");
  const router = useRouter();
  const defaultTypeId = roomTypes[0]?.id ?? "";
  const [step, setStep] = useState(initialName.trim().length >= 2 ? 2 : 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState(initialName);
  const [buildingName, setBuildingName] = useState(
    building?.name || initialName
  );
  const [rows, setRows] = useState<RoomRow[]>([
    newRow(defaultTypeId, "1"),
    newRow(defaultTypeId, "2"),
  ]);

  const steps = [t("stepProperty"), t("stepRooms")];
  const alreadyHasRooms = roomCount >= 1;

  async function handleStep1(fd: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await saveOnboardingStep1Action(fd);
      if (result.ok) {
        const nextName = String(fd.get("display_name") ?? "").trim();
        setPropertyName(nextName);
        if (!building && !buildingName.trim()) {
          setBuildingName(nextName);
        }
        setStep(2);
      } else {
        setError(result.error);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  async function handleInventory(fd: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await saveOnboardingInventoryAction(fd);
      if (result.ok) {
        router.push("/admin");
      } else {
        setError(result.error);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  function finishWithoutRooms() {
    router.push("/admin");
  }

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-stepper" role="list" aria-label="Progress">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div
              key={label}
              className={[
                "onboarding-stepper__step",
                done ? "onboarding-stepper__step--done" : "",
                active ? "onboarding-stepper__step--active" : "",
              ].join(" ")}
              role="listitem"
              aria-current={active ? "step" : undefined}
            >
              <span className="onboarding-stepper__num">
                {done ? "✓" : num}
              </span>
              <span className="onboarding-stepper__label">{label}</span>
              {i < steps.length - 1 && (
                <span className="onboarding-stepper__line" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="onboarding-card">
        {step === 1 && (
          <>
            <h2 className="onboarding-card__title">{t("step1Title")}</h2>
            <p className="onboarding-card__lead">{t("step1Lead")}</p>
            <form
              className="onboarding-card__form"
              action={async (fd) => {
                await handleStep1(fd);
              }}
            >
              <fieldset disabled={pending} className="onboarding-card__fieldset">
                <label className="onboarding-field">
                  <span className="onboarding-field__label">
                    {t("propertyNameLabel")}
                  </span>
                  <input
                    name="display_name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={initialName}
                    placeholder={t("propertyNamePlaceholder")}
                    className="onboarding-field__input"
                    autoFocus
                  />
                </label>
                <div className="onboarding-field-row">
                  <label className="onboarding-field">
                    <span className="onboarding-field__label">
                      {t("checkInLabel")}
                    </span>
                    <input
                      name="default_check_in_time"
                      type="time"
                      defaultValue={initialCheckIn}
                      className="onboarding-field__input"
                    />
                  </label>
                  <label className="onboarding-field">
                    <span className="onboarding-field__label">
                      {t("checkOutLabel")}
                    </span>
                    <input
                      name="default_check_out_time"
                      type="time"
                      defaultValue={initialCheckOut}
                      className="onboarding-field__input"
                    />
                  </label>
                </div>
                {error && (
                  <p className="onboarding-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="onboarding-btn onboarding-btn--primary"
                >
                  {pending ? (
                    <>
                      <LocaleFlagSpinner label={t("saving")} size="md" />
                      <span>{t("saving")}</span>
                    </>
                  ) : (
                    t("nextBtn")
                  )}
                </button>
              </fieldset>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="onboarding-card__title">{t("step2Title")}</h2>
            <p className="onboarding-card__lead">{t("step2Lead")}</p>

            {alreadyHasRooms ? (
              <>
                <p className="onboarding-card__lead">{t("alreadyHasRooms")}</p>
                <button
                  type="button"
                  className="onboarding-btn onboarding-btn--primary"
                  onClick={finishWithoutRooms}
                >
                  {t("finishBtn")}
                </button>
              </>
            ) : roomTypes.length === 0 ? (
              <p className="onboarding-error" role="alert">
                {t("noRoomTypes")}
              </p>
            ) : (
              <form
                className="onboarding-card__form"
                action={async (fd) => {
                  await handleInventory(fd);
                }}
              >
                <fieldset disabled={pending} className="onboarding-card__fieldset">
                  {building ? (
                    <input type="hidden" name="building_id" value={building.id} />
                  ) : null}
                  <label className="onboarding-field">
                    <span className="onboarding-field__label">
                      {t("buildingNameLabel")}
                    </span>
                    <input
                      name="building_name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={buildingName}
                      onChange={(e) => setBuildingName(e.target.value)}
                      placeholder={
                        propertyName || t("buildingNamePlaceholder")
                      }
                      className="onboarding-field__input"
                    />
                  </label>

                  <div className="onboarding-rooms">
                    {rows.map((row, index) => (
                      <div key={row.key} className="onboarding-room-row">
                        <label className="onboarding-field">
                          <span className="onboarding-field__label">
                            {t("roomNameLabel")}
                          </span>
                          <input
                            name="room_name"
                            type="text"
                            required={index === 0}
                            maxLength={40}
                            value={row.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? { ...item, name: value }
                                    : item
                                )
                              );
                            }}
                            placeholder={t("roomNamePlaceholder")}
                            className="onboarding-field__input"
                          />
                        </label>
                        <label className="onboarding-field">
                          <span className="onboarding-field__label">
                            {t("roomTypeLabel")}
                          </span>
                          <select
                            name="room_type_id"
                            value={row.typeId}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? { ...item, typeId: value }
                                    : item
                                )
                              );
                            }}
                            className="onboarding-field__input"
                          >
                            {roomTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="onboarding-field">
                          <span className="onboarding-field__label">
                            {t("roomPriceLabel")}
                          </span>
                          <input
                            name="room_price"
                            type="number"
                            min="0"
                            step="1"
                            value={row.price}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? { ...item, price: value }
                                    : item
                                )
                              );
                            }}
                            placeholder={t("roomPricePlaceholder")}
                            className="onboarding-field__input"
                          />
                        </label>
                        {rows.length > 1 ? (
                          <button
                            type="button"
                            className="onboarding-btn onboarding-btn--ghost onboarding-room-row__remove"
                            onClick={() =>
                              setRows((current) =>
                                current.filter((item) => item.key !== row.key)
                              )
                            }
                          >
                            {t("removeRoomBtn")}
                          </button>
                        ) : (
                          <span className="onboarding-room-row__remove" />
                        )}
                      </div>
                    ))}
                  </div>

                  {rows.length < 12 ? (
                    <button
                      type="button"
                      className="onboarding-btn onboarding-btn--ghost"
                      onClick={() =>
                        setRows((current) => [
                          ...current,
                          newRow(defaultTypeId, String(current.length + 1)),
                        ])
                      }
                    >
                      {t("addRoomBtn")}
                    </button>
                  ) : null}

                  {error && (
                    <p className="onboarding-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={pending}
                    className="onboarding-btn onboarding-btn--primary"
                  >
                    {pending ? (
                      <>
                        <LocaleFlagSpinner label={t("saving")} size="md" />
                        <span>{t("saving")}</span>
                      </>
                    ) : (
                      t("finishBtn")
                    )}
                  </button>
                </fieldset>
              </form>
            )}

            <Link href="/admin" className="onboarding-skip">
              {t("skipToAdmin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
