/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Email Templates                                      ║
 * ║                                                                ║
 * ║  Inline HTML emails (no external CSS dependencies).            ║
 * ║  Each template returns { subject, html, text }.                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { platformPoweredByLabel } from "@/lib/platform/branding";

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// ─── Shared layout ──────────────────────────────────────────────
function wrap(pensionName: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
        <tr><td style="background:#18181b;padding:20px 28px">
          <span style="color:#ffffff;font-size:18px;font-weight:600">${pensionName}</span>
        </td></tr>
        <tr><td style="padding:28px">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center">
          <span style="color:#a1a1aa;font-size:12px">${platformPoweredByLabel()}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:20px;color:#18181b">${text}</h2>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;color:#3f3f46;line-height:1.6">${text}</p>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#18181b;font-weight:500;border-bottom:1px solid #f4f4f5">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
    ${rows}
  </table>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${href}" style="display:inline-block;padding:12px 28px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
      ${label}
    </a>
  </div>`;
}

// ─── Template: New booking request (to pension owner) ────────────
export function newBookingRequestToOwner(data: {
  pensionName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: string[];
  adminUrl: string;
}): EmailContent {
  const roomList = data.rooms.join(", ");
  const nights = Math.max(1, Math.round(
    (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
  ));

  return {
    subject: `Cerere nouă: ${data.guestName} · ${data.checkIn} → ${data.checkOut}`,
    html: wrap(data.pensionName, `
      ${h2("Cerere nouă de rezervare")}
      ${p(`<strong>${data.guestName}</strong> a trimis o cerere de rezervare.`)}
      ${infoTable(`
        ${infoRow("Oaspete", data.guestName)}
        ${infoRow("Email", data.guestEmail)}
        ${data.guestPhone ? infoRow("Telefon", data.guestPhone) : ""}
        ${infoRow("Check-in", data.checkIn)}
        ${infoRow("Check-out", data.checkOut)}
        ${infoRow("Nopți", String(nights))}
        ${infoRow("Adulți / Copii", `${data.adults} / ${data.children}`)}
        ${infoRow("Camere solicitate", roomList || "Nespecificat")}
      `)}
      <div style="text-align:center;margin:24px 0">
        <a href="${data.adminUrl}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          Deschide în admin
        </a>
      </div>
    `),
    text: `Cerere nouă: ${data.guestName}\nCheck-in: ${data.checkIn}\nCheck-out: ${data.checkOut}\nAdulți: ${data.adults}, Copii: ${data.children}\nCamere: ${roomList}\n\nDeschide: ${data.adminUrl}`,
  };
}

// ─── Template: Booking confirmed (to guest) ──────────────────────
export function bookingConfirmedToGuest(data: {
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  rooms: string[];
  totalPrice: number;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
  pensionPhone?: string;
  pensionEmail?: string;
  guestAppUrl?: string;
}): EmailContent {
  const roomList = data.rooms.join(", ");
  const nights = Math.max(1, Math.round(
    (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
  ));

  return {
    subject: `Rezervare confirmată — ${data.pensionName} · ${data.checkIn}`,
    html: wrap(data.pensionName, `
      ${h2("Rezervare confirmată!")}
      ${p(`Bună, <strong>${data.guestName}</strong>! Rezervarea ta a fost confirmată.`)}
      ${infoTable(`
        ${infoRow("Check-in", `${data.checkIn} după ${data.checkInTime}`)}
        ${infoRow("Check-out", `${data.checkOut} până la ${data.checkOutTime}`)}
        ${infoRow("Nopți", String(nights))}
        ${infoRow("Camere", roomList)}
        ${infoRow("Total", `${data.totalPrice} ${data.currency}`)}
      `)}
      ${data.guestAppUrl ? p("Accesează aplicația pentru oaspeți — Wi-Fi, informații utile și multe altele:") : ""}
      ${data.guestAppUrl ? ctaButton(data.guestAppUrl, "Deschide aplicația oaspete") : ""}
      ${p("Te așteptăm cu drag!")}
      ${data.pensionPhone ? p(`Telefon: ${data.pensionPhone}`) : ""}
      ${data.pensionEmail ? p(`Email: ${data.pensionEmail}`) : ""}
    `),
    text: `Rezervare confirmată — ${data.pensionName}\n\nBună, ${data.guestName}!\nCheck-in: ${data.checkIn} după ${data.checkInTime}\nCheck-out: ${data.checkOut} până la ${data.checkOutTime}\nCamere: ${roomList}\nTotal: ${data.totalPrice} ${data.currency}${data.guestAppUrl ? `\n\nAplicație oaspete: ${data.guestAppUrl}` : ""}\n\nTe așteptăm!`,
  };
}

// ─── Template: Guest app link (standalone resend) ───────────────
export function guestAppLinkToGuest(data: {
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guestAppUrl: string;
  checkInTime?: string;
  checkOutTime?: string;
}): EmailContent {
  return {
    subject: `Aplicația ta de oaspete — ${data.pensionName}`,
    html: wrap(data.pensionName, `
      ${h2("Aplicația pentru oaspeți")}
      ${p(`Bună, <strong>${data.guestName}</strong>! Iată linkul personal pentru șederea ta (${data.checkIn} → ${data.checkOut}).`)}
      ${data.checkInTime ? p(`Check-in de la ${data.checkInTime}, check-out până la ${data.checkOutTime ?? "11:00"}.`) : ""}
      ${ctaButton(data.guestAppUrl, "Deschide aplicația")}
      ${p("Linkul este valabil pe durata șederii. Nu îl distribui altor persoane.")}
    `),
    text: `Aplicație oaspete — ${data.pensionName}\n\nBună, ${data.guestName}!\n${data.checkIn} → ${data.checkOut}\n\n${data.guestAppUrl}`,
  };
}

// ─── Template: Booking cancelled (to guest) ──────────────────────
export function bookingCancelledToGuest(data: {
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}): EmailContent {
  return {
    subject: `Rezervare anulată — ${data.pensionName} · ${data.checkIn}`,
    html: wrap(data.pensionName, `
      ${h2("Rezervare anulată")}
      ${p(`Bună, <strong>${data.guestName}</strong>. Rezervarea ta pentru ${data.checkIn} → ${data.checkOut} a fost anulată.`)}
      ${data.reason ? p(`Motiv: ${data.reason}`) : ""}
      ${p("Dacă ai întrebări, nu ezita să ne contactezi.")}
    `),
    text: `Rezervare anulată — ${data.pensionName}\n\n${data.guestName}, rezervarea pentru ${data.checkIn} → ${data.checkOut} a fost anulată.${data.reason ? `\nMotiv: ${data.reason}` : ""}`,
  };
}

// ─── Template: Daily summary (to pension owner) ──────────────────
export function dailySummaryToOwner(data: {
  pensionName: string;
  date: string;
  checkInsToday: { guestName: string; rooms: string[] }[];
  checkOutsToday: { guestName: string; rooms: string[] }[];
  pendingRequests: number;
  occupancyPercent: number;
}): EmailContent {
  const checkInRows = data.checkInsToday.map(
    (c) => `<li style="margin:4px 0;font-size:13px;color:#3f3f46">${c.guestName} — ${c.rooms.join(", ")}</li>`
  ).join("");
  const checkOutRows = data.checkOutsToday.map(
    (c) => `<li style="margin:4px 0;font-size:13px;color:#3f3f46">${c.guestName} — ${c.rooms.join(", ")}</li>`
  ).join("");

  return {
    subject: `Rezumat ${data.date} — ${data.pensionName}`,
    html: wrap(data.pensionName, `
      ${h2(`Rezumat zilnic — ${data.date}`)}
      ${infoTable(`
        ${infoRow("Ocupare", `${data.occupancyPercent}%`)}
        ${infoRow("Cereri în așteptare", String(data.pendingRequests))}
        ${infoRow("Check-in-uri azi", String(data.checkInsToday.length))}
        ${infoRow("Check-out-uri azi", String(data.checkOutsToday.length))}
      `)}
      ${data.checkInsToday.length > 0 ? `
        <h3 style="margin:16px 0 8px;font-size:15px;color:#18181b">Sosiri</h3>
        <ul style="margin:0;padding-left:20px">${checkInRows}</ul>
      ` : ""}
      ${data.checkOutsToday.length > 0 ? `
        <h3 style="margin:16px 0 8px;font-size:15px;color:#18181b">Plecări</h3>
        <ul style="margin:0;padding-left:20px">${checkOutRows}</ul>
      ` : ""}
    `),
    text: `Rezumat ${data.date} — ${data.pensionName}\nOcupare: ${data.occupancyPercent}%\nCereri: ${data.pendingRequests}\nCheck-in: ${data.checkInsToday.length}\nCheck-out: ${data.checkOutsToday.length}`,
  };
}
