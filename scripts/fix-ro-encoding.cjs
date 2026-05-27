const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "messages", "ro.json");
let raw = fs.readFileSync(file, "utf8");

const replacements = [
  ['"home": "AcasĒ"', '"home": "Acasă"'],
  ['"stays": "CazĒri"', '"stays": "Cazări"'],
  ['"clients": "Clien:i"', '"clients": "Clienți"'],
  ['"settings": "SetĒri"', '"settings": "Setări"'],
  ['"password": "ParolĒ"', '"password": "Parolă"'],
  ['"submitting": "Se conecteazĒ⬦"', '"submitting": "Se conectează…"'],
  ['"submit": "IntrĒ în panou"', '"submit": "Intră în panou"'],
  ['"backToSite": "}napoi la site"', '"backToSite": "← Înapoi la site"'],
  ['"title": "Sosire / plecare (recep:ie)"', '"title": "Sosire / plecare (recepție)"'],
  ['"checkInLabel": "Check-in opera:ional"', '"checkInLabel": "Check-in operațional"'],
  ['"checkOutLabel": "Check-out opera:ional"', '"checkOutLabel": "Check-out operațional"'],
  ['"checkInAction": "Check-inâ€¦"', '"checkInAction": "Check-in…"'],
  ['"checkOutAction": "Check-outâ€¦"', '"checkOutAction": "Check-out…"'],
  ['"undoCheckIn": "AnuleazĒ check-in"', '"undoCheckIn": "Anulează check-in"'],
  ['"undoCheckOut": "AnuleazĒ check-out"', '"undoCheckOut": "Anulează check-out"'],
];

for (const [from, to] of replacements) {
  raw = raw.split(from).join(to);
}

fs.writeFileSync(file, raw, "utf8");
console.log("Fixed ro.json encoding patches");
