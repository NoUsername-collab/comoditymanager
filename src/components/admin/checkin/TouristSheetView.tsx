"use client";

import { useTranslations } from "next-intl";
import type { TouristSheetData } from "@/domain/checkin/fisa-turist";

type Props = {
  data: TouristSheetData;
  onClose?: () => void;
};

export function TouristSheetView({ data, onClose }: Props) {
  const t = useTranslations("admin.checkIn.fisa");

  function printSheet() {
    window.print();
  }

  return (
    <div className="tourist-sheet-root">
      <div className="tourist-sheet-actions no-print">
        <button
          type="button"
          className="checkin-stepper__btn checkin-stepper__btn--primary"
          onClick={printSheet}
        >
          {t("savePdf")}
        </button>
        {onClose && (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary"
            onClick={onClose}
          >
            {t("close")}
          </button>
        )}
      </div>

      <article className="tourist-sheet" aria-label={t("title")}>
        <header className="tourist-sheet__header">
          <p className="tourist-sheet__form-code">{t("formRef")}</p>
          <h1 className="tourist-sheet__title">{t("title")}</h1>
          <p className="tourist-sheet__year">
            {t("year")}: <strong>{data.year}</strong>
          </p>
        </header>

        <section className="tourist-sheet__section">
          <h2 className="tourist-sheet__section-title">{t("sectionProperty")}</h2>
          <p className="tourist-sheet__line">
            <span className="tourist-sheet__label">{t("pensionName")}:</span>{" "}
            {data.pensionName}
          </p>
          <p className="tourist-sheet__line">
            <span className="tourist-sheet__label">{t("propertyAddress")}:</span>{" "}
            {data.propertyAddress}
          </p>
          {data.ownerCui && (
            <p className="tourist-sheet__line">
              <span className="tourist-sheet__label">{t("ownerCui")}:</span>{" "}
              {data.ownerCui}
            </p>
          )}
          {data.tourismLicense && (
            <p className="tourist-sheet__line">
              <span className="tourist-sheet__label">{t("tourismLicense")}:</span>{" "}
              {data.tourismLicense}
            </p>
          )}
        </section>

        <section className="tourist-sheet__section">
          <h2 className="tourist-sheet__section-title">{t("sectionGuests")}</h2>
          <p className="tourist-sheet__line">
            <span className="tourist-sheet__label">{t("roomLabel")}:</span>{" "}
            {data.roomLabel}
          </p>

          <table className="tourist-sheet__table">
            <thead>
              <tr>
                <th>{t("colName")}</th>
                <th>{t("colCnp")}</th>
                <th>{t("colDocument")}</th>
                <th>{t("colCheckIn")}</th>
                <th>{t("colCheckOut")}</th>
              </tr>
            </thead>
            <tbody>
              {data.guests.map((g, i) => (
                <tr key={i}>
                  <td>{g.fullName}</td>
                  <td>{g.cnp || "—"}</td>
                  <td>{g.documentId || "—"}</td>
                  <td>{g.checkIn}</td>
                  <td>{g.checkOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="tourist-sheet__footer">
          <p>{t("legalNote")}</p>
          <p className="tourist-sheet__signature">
            <span>{t("guestSignature")}</span>
            <span>{t("receptionSignature")}</span>
          </p>
        </footer>
      </article>
    </div>
  );
}
