"use client";

import { useTranslations } from "next-intl";
import type { TouristSheetData } from "@/domain/checkin/fisa-turist";
import { formatRoDate } from "@/lib/stay-dates";

type Props = {
  data: TouristSheetData;
  onClose?: () => void;
};

function formatSheetDate(iso: string): string {
  try {
    return formatRoDate(iso);
  } catch {
    return iso;
  }
}

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

      <article className="tourist-sheet tourist-sheet--official" aria-label={t("title")}>
        <div className="tourist-sheet__paper">
          <div className="tourist-sheet__watermark" aria-hidden>
            {t("exemplar")}
          </div>

          <header className="tourist-sheet__header">
            <div className="tourist-sheet__masthead">
              <p className="tourist-sheet__ministry">{t("ministryLine")}</p>
              <p className="tourist-sheet__anaf">{t("anafLine")}</p>
            </div>

            <div className="tourist-sheet__form-meta">
              <div className="tourist-sheet__form-box">
                <span className="tourist-sheet__form-box-label">{t("formLabel")}</span>
                <strong className="tourist-sheet__form-box-code">{t("formRef")}</strong>
              </div>
              <div className="tourist-sheet__registry">
                <span>{t("registryNr")}</span>
                <strong>{data.registryRef}</strong>
              </div>
            </div>

            <h1 className="tourist-sheet__title">{t("title")}</h1>
            <p className="tourist-sheet__subtitle">{t("subtitleOfficial")}</p>

            <div className="tourist-sheet__year-row">
              <span>
                {t("year")}: <strong>{data.year}</strong>
              </span>
              <span>
                {t("issuedAt")}: <strong>{formatSheetDate(data.issuedAt)}</strong>
              </span>
            </div>
          </header>

          <section className="tourist-sheet__section">
            <h2 className="tourist-sheet__section-title">{t("sectionProperty")}</h2>
            <div className="tourist-sheet__fields">
              <SheetField label={t("pensionName")} value={data.pensionName} />
              <SheetField label={t("propertyAddress")} value={data.propertyAddress} wide />
              {data.ownerCui ? (
                <SheetField label={t("ownerCui")} value={data.ownerCui} />
              ) : null}
              {data.tourismLicense ? (
                <SheetField label={t("tourismLicense")} value={data.tourismLicense} />
              ) : null}
            </div>
          </section>

          <section className="tourist-sheet__section">
            <h2 className="tourist-sheet__section-title">{t("sectionGuests")}</h2>
            <SheetField label={t("roomLabel")} value={data.roomLabel} />

            <div className="tourist-sheet__table-wrap">
              <table className="tourist-sheet__table">
                <thead>
                  <tr>
                    <th className="tourist-sheet__col-idx">Nr.</th>
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
                      <td className="tourist-sheet__col-idx">{i + 1}</td>
                      <td>{g.fullName}</td>
                      <td className="tourist-sheet__mono">{g.cnp || "—"}</td>
                      <td className="tourist-sheet__mono">{g.documentId || "—"}</td>
                      <td>{formatSheetDate(g.checkIn)}</td>
                      <td>{formatSheetDate(g.checkOut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="tourist-sheet__footer">
            <p className="tourist-sheet__legal">{t("legalNote")}</p>
            <div className="tourist-sheet__stamp" aria-hidden>
              {t("stampReceived")}
            </div>
            <div className="tourist-sheet__signatures">
              <div className="tourist-sheet__signature">
                <span className="tourist-sheet__signature-line" />
                <span className="tourist-sheet__signature-label">{t("guestSignature")}</span>
              </div>
              <div className="tourist-sheet__signature">
                <span className="tourist-sheet__signature-line" />
                <span className="tourist-sheet__signature-label">{t("receptionSignature")}</span>
              </div>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

function SheetField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        "tourist-sheet__field",
        wide && "tourist-sheet__field--wide",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="tourist-sheet__field-label">{label}</span>
      <span className="tourist-sheet__field-value">{value}</span>
    </div>
  );
}
