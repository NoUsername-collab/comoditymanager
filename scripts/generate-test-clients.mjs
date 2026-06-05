#!/usr/bin/env node
/**
 * Generează 100 clienți test:
 * - 76% cetățeni RO, 24% străini (8 țări × 3)
 * - cerere_publica = ce introduci pe pagina publică
 * - check_in = ce introduce testerul la acceptare + înregistrare identitate
 * - cazări: single / cuplu / familie / grup, unele suprapuse
 *
 * Output:
 *   test-data/100-clienti-test.json
 *   test-data/100-clienti-test.md   (ghid manual pentru testeri)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "test-data");
const OUT_JSON = join(OUT_DIR, "100-clienti-test.json");
const OUT_MD = join(OUT_DIR, "100-clienti-test.md");
const OUT_HTML = join(OUT_DIR, "100-clienti-test.html");

// ─── National ID math ───────────────────────────────────────────────────────

const CNP_W = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
const IDNP_W = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1];
const EGN_W = [2, 4, 8, 5, 10, 9, 7, 3, 6];
const HU_W = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function checkDigitWeighted(first, weights, mod, ifTen) {
  const digits = first.split("").map(Number);
  const sum = weights.reduce((a, w, i) => a + w * digits[i], 0);
  const r = sum % mod;
  return String(r === ifTen?.when ? ifTen.then : r);
}

function genCnp(sex, year, month, day, county, seq) {
  const s = sex === "M" ? (year >= 2000 ? 5 : 1) : year >= 2000 ? 6 : 2;
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const cc = String(county).padStart(2, "0").slice(-2);
  const sq = String(seq).padStart(3, "0").slice(-3);
  const first12 = `${s}${yy}${mm}${dd}${cc}${sq}`;
  return first12 + checkDigitWeighted(first12, CNP_W, 11, { when: 10, then: 1 });
}

function genIdnp(sex, year, month, day, seq) {
  const s = sex === "M" ? (year >= 2000 ? 5 : 3) : year >= 2000 ? 6 : 4;
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const sq = String(seq).padStart(3, "0").slice(-3);
  const first12 = `${s}${yy}${mm}${dd}00${sq}`;
  return first12 + checkDigitWeighted(first12, IDNP_W, 10);
}

function genEgn(sex, year, month, day, seq) {
  const yy = String(year).slice(-2);
  let encMonth = year >= 2000 ? month + 40 : month;
  const mm = String(encMonth).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  let s8 = seq % 10;
  if (sex === "M" && s8 % 2 !== 0) s8 = (s8 + 1) % 10;
  if (sex === "F" && s8 % 2 === 0) s8 = (s8 + 1) % 10;
  const first9 = `${yy}${mm}${dd}${Math.floor(seq / 10) % 10}${Math.floor(seq / 100) % 10}${s8}`;
  return first9 + checkDigitWeighted(first9, EGN_W, 11, { when: 10, then: 0 });
}

function luhnCheckDigit(first10) {
  const base = first10.split("").map(Number);
  for (let d = 0; d <= 9; d++) {
    const digits = [...base, d];
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = digits[i];
      if ((digits.length - 1 - i) % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    if (sum % 10 === 0) return String(d);
  }
  return "0";
}

function genAmka(sex, year, month, day, seq) {
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const sq = String(sex === "M" ? seq * 2 + 1 : seq * 2).padStart(4, "0").slice(-4);
  const first10 = `${dd}${mm}${yy}${sq}`;
  return first10 + luhnCheckDigit(first10);
}

function genSzemelyi(sex, year, month, day, seq) {
  const s = sex === "M" ? (year >= 2000 ? 3 : 1) : year >= 2000 ? 4 : 2;
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const sq = String(seq).padStart(3, "0").slice(-3);
  const first10 = `${s}${yy}${mm}${dd}${sq}`;
  return first10 + checkDigitWeighted(first10, HU_W, 11);
}

// ─── Names ──────────────────────────────────────────────────────────────────

const RO_LAST = [
  "Popescu", "Ionescu", "Popa", "Radu", "Stan", "Dumitru", "Munteanu", "Gheorghe",
  "Stoica", "Florea", "Diaconu", "Marin", "Tudor", "Barbu", "Moldovan", "Neagu",
  "Constantinescu", "Dobre", "Cristea", "Nistor", "Oprea", "Pavel", "Roman", "Sava",
  "Toma", "Ungureanu", "Vasile", "Zamfir", "Anghel", "Badea", "Ciobanu", "Dragomir",
  "Enache", "Filip", "Georgescu", "Hanganu", "Iacob", "Jianu", "Kovacs", "Lazar",
  "Mihai", "Nita", "Olteanu", "Petrescu", "Rusu", "Serban", "Tanase", "Ursu", "Voicu",
  "Axente", "Balan", "Cojocaru", "Dascalu", "Ene", "Farcas", "Grigore", "Horvath",
  "Iliescu", "Jipa", "Luca", "Manole", "Niculescu", "Olaru", "Preda", "Rotaru",
  "Sandu", "Tataru", "Ursache", "Vlad", "Zaharia", "Ardelean", "Birsan", "Carp",
  "Dumitrache", "Fodor", "Ghita", "Ilinca",
];

const RO_FIRST_M = [
  "Ion", "Andrei", "Mihai", "Alexandru", "Cristian", "Gabriel", "Stefan", "Radu",
  "Bogdan", "Florin", "Adrian", "Cosmin", "Dan", "Eduard", "Felix", "George",
  "Horia", "Ilie", "Lucian", "Marius", "Nicolae", "Octavian", "Paul", "Razvan",
  "Sorin", "Tiberiu", "Valentin", "Zoltan", "Catalin", "Dragos", "Emil", "Fabian",
  "Gheorghe", "Iulian", "Laurentiu", "Mircea", "Petru", "Robert", "Sebastian", "Tudor",
  "Vasile", "Xenofon", "Alin", "Beniamin", "Ciprian", "Dorian", "Eugen", "Filip",
  "Grigore", "Henri", "Ionel", "Jan", "Kevin", "Liviu", "Matei", "Norbert",
  "Ovidiu", "Pavel", "Romeo", "Silviu", "Teodor", "Ulise", "Victor", "William",
  "Yannis", "Zeno", "Arcadie", "Basarab", "Carol", "Dimitrie", "Eusebiu", "Flaviu",
  "Haralambie", "Ioachim", "Jean", "Konstantin",
];

const RO_FIRST_F = [
  "Maria", "Elena", "Ana", "Ioana", "Andreea", "Gabriela", "Cristina", "Diana",
  "Florentina", "Geanina", "Irina", "Laura", "Monica", "Nicoleta", "Oana", "Paula",
  "Raluca", "Simona", "Teodora", "Veronica", "Adela", "Bianca", "Camelia", "Denisa",
  "Ecaterina", "Felicia", "Georgiana", "Helena", "Iulia", "Jana", "Karina", "Larisa",
  "Madalina", "Natalia", "Olivia", "Patricia", "Ramona", "Sabina", "Tamara", "Ursula",
  "Valentina", "Xenia", "Yasmina", "Zina", "Alina", "Beatrice", "Corina", "Doina",
  "Emilia", "Florica", "Gina", "Hortensia", "Ilona", "Julieta", "Kinga", "Lidia",
  "Mihaela", "Noemi", "Ofelia", "Petronela", "Roxana", "Silvia", "Tatiana", "Viorica",
  "Wanda", "Zenobia", "Antoaneta", "Brindusa", "Casandra", "Dorina", "Estera", "Flavia",
  "Gratiela", "Henrieta", "Ileana", "Jacqueline",
];

const COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Brașov", "București", "Cluj",
  "Constanța", "Covasna", "Dolj", "Galați", "Harghita", "Iași", "Maramureș", "Mureș",
  "Neamț", "Prahova", "Sibiu", "Suceava", "Timiș", "Vâlcea", "Vrancea", "Ilfov",
];

const CI_SERIES = ["RX", "RK", "SB", "TM", "IS", "CT", "BV", "CJ", "MM", "DJ", "BC", "GL"];

const FOREIGN = [
  { code: "MD", country: "Republica Moldova", nat: "Republica Moldova", last: ["Rusu", "Ceban", "Moraru"], firstM: ["Vasile", "Ion", "Andrei"], firstF: ["Elena", "Natalia", "Maria"] },
  { code: "BG", country: "Bulgaria", nat: "Bulgaria", last: ["Georgiev", "Ivanov", "Dimitrov"], firstM: ["Ivan", "Georgi", "Nikolay"], firstF: ["Maria", "Elena", "Violeta"] },
  { code: "HU", country: "Ungaria", nat: "Ungaria", last: ["Nagy", "Kovacs", "Szabo"], firstM: ["Laszlo", "Peter", "Zoltan"], firstF: ["Katalin", "Eva", "Anna"] },
  { code: "DE", country: "Germania", nat: "Germania", last: ["Muller", "Schmidt", "Weber"], firstM: ["Hans", "Klaus", "Thomas"], firstF: ["Anna", "Petra", "Sabine"] },
  { code: "FR", country: "Franța", nat: "Franța", last: ["Dupont", "Martin", "Bernard"], firstM: ["Pierre", "Jean", "Luc"], firstF: ["Marie", "Sophie", "Camille"] },
  { code: "IT", country: "Italia", nat: "Italia", last: ["Rossi", "Russo", "Ferrari"], firstM: ["Marco", "Luca", "Giuseppe"], firstF: ["Giulia", "Francesca", "Chiara"] },
  { code: "UA", country: "Ucraina", nat: "Ucraina", last: ["Kovalenko", "Shevchenko", "Bondarenko"], firstM: ["Oleksandr", "Dmytro", "Andriy"], firstF: ["Olena", "Iryna", "Natalia"] },
  { code: "GB", country: "Regatul Unit", nat: "Regatul Unit", last: ["Smith", "Jones", "Taylor"], firstM: ["James", "Oliver", "William"], firstF: ["Emily", "Charlotte", "Olivia"] },
];

// ─── Uniqueness ─────────────────────────────────────────────────────────────

const usedPhones = new Set();
const usedEmails = new Set();
const usedNatIds = new Set();
let cnpSeq = 1;

function uniqPhone(v) {
  if (usedPhones.has(v)) throw new Error(`Telefon duplicat: ${v}`);
  usedPhones.add(v);
  return v;
}

function uniqEmail(v) {
  const e = v.toLowerCase();
  if (usedEmails.has(e)) throw new Error(`Email duplicat: ${e}`);
  usedEmails.add(e);
  return v;
}

function uniqNat(type, v) {
  const k = `${type}:${v}`;
  if (usedNatIds.has(k)) throw new Error(`ID duplicat: ${k}`);
  usedNatIds.add(k);
  return v;
}

function nextCnp(sex, year, month, day, county = "41") {
  return uniqNat("cnp", genCnp(sex, year, month, day, county, cnpSeq++));
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Stay templates (edge + overlap) ────────────────────────────────────────

const STAYS = [
  // overlap cluster — aceleași date, test disponibilitate
  { check_in: "2026-06-20", check_out: "2026-06-23", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", overlap: "CLUSTER-A", stay_edge: "suprapunere_aceeasi_perioada" },
  { check_in: "2026-06-20", check_out: "2026-06-23", adults: 1, children: 0, has_minor: false, minor_age: "", party: "single", overlap: "CLUSTER-A", stay_edge: "suprapunere_aceeasi_perioada" },
  { check_in: "2026-06-20", check_out: "2026-06-23", adults: 4, children: 0, has_minor: false, minor_age: "", party: "grup", overlap: "CLUSTER-A", stay_edge: "suprapunere_aceeasi_perioada" },
  { check_in: "2026-06-20", check_out: "2026-06-23", adults: 2, children: 2, has_minor: true, minor_age: "7", party: "familie", overlap: "CLUSTER-A", stay_edge: "suprapunere_aceeasi_perioada" },
  { check_in: "2026-06-20", check_out: "2026-06-23", adults: 3, children: 1, has_minor: true, minor_age: "12", party: "grup", overlap: "CLUSTER-A", stay_edge: "suprapunere_aceeasi_perioada" },
  // overlap parțial
  { check_in: "2026-07-01", check_out: "2026-07-06", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", overlap: "CLUSTER-B", stay_edge: "suprapunere_partiala" },
  { check_in: "2026-07-03", check_out: "2026-07-08", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", overlap: "CLUSTER-B", stay_edge: "suprapunere_partiala" },
  { check_in: "2026-07-04", check_out: "2026-07-10", adults: 1, children: 0, has_minor: false, minor_age: "", party: "single", overlap: "CLUSTER-B", stay_edge: "suprapunere_partiala" },
  // 1 noapte
  { check_in: "2026-06-12", check_out: "2026-06-13", adults: 1, children: 0, has_minor: false, minor_age: "", party: "single", stay_edge: "1_noapte" },
  { check_in: "2026-06-14", check_out: "2026-06-15", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", stay_edge: "1_noapte" },
  // weekend
  { check_in: "2026-06-19", check_out: "2026-06-21", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", stay_edge: "weekend_vineri_duminica" },
  // sejur lung
  { check_in: "2026-08-01", check_out: "2026-08-08", adults: 2, children: 1, has_minor: true, minor_age: "5", party: "familie", stay_edge: "7_nopti" },
  { check_in: "2026-09-10", check_out: "2026-09-24", adults: 1, children: 0, has_minor: false, minor_age: "", party: "single", stay_edge: "14_nopti" },
  // familii cu minori
  { check_in: "2026-06-25", check_out: "2026-06-28", adults: 2, children: 1, has_minor: true, minor_age: "3", party: "familie", stay_edge: "minor_3_ani" },
  { check_in: "2026-06-25", check_out: "2026-06-28", adults: 2, children: 2, has_minor: true, minor_age: "16", party: "familie", stay_edge: "minor_16_ani" },
  // grup mare
  { check_in: "2026-07-15", check_out: "2026-07-18", adults: 6, children: 0, has_minor: false, minor_age: "", party: "grup", stay_edge: "grup_6_adulti" },
  { check_in: "2026-07-15", check_out: "2026-07-18", adults: 5, children: 2, has_minor: true, minor_age: "9", party: "grup", stay_edge: "grup_5_adulti_2_copii" },
  // back-to-back (notat în scenario)
  { check_in: "2026-06-10", check_out: "2026-06-12", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", stay_edge: "back_to_back_A" },
  { check_in: "2026-06-12", check_out: "2026-06-14", adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu", stay_edge: "back_to_back_B_aceeasi_persoana" },
];

function pickStay(index) {
  if (index < STAYS.length) return { ...STAYS[index] };
  const base = index - STAYS.length;
  const dayOffset = 10 + (base % 40);
  const nights = [2, 3, 4, 5, 7][base % 5];
  const parties = [
    { adults: 1, children: 0, has_minor: false, minor_age: "", party: "single" },
    { adults: 2, children: 0, has_minor: false, minor_age: "", party: "cuplu" },
    { adults: 2, children: 1, has_minor: true, minor_age: String(4 + (base % 10)), party: "familie" },
    { adults: 2, children: 2, has_minor: true, minor_age: String(6 + (base % 8)), party: "familie" },
    { adults: 3, children: 0, has_minor: false, minor_age: "", party: "grup" },
    { adults: 4, children: 1, has_minor: true, minor_age: "11", party: "grup" },
  ];
  const p = parties[base % parties.length];
  const check_in = addDays("2026-06-05", dayOffset);
  return {
    check_in,
    check_out: addDays(check_in, nights),
    ...p,
    overlap: null,
    stay_edge: "standard",
  };
}

// ─── Identity builders ──────────────────────────────────────────────────────

function roCiIdentity(idx, sex, year, month, day, partial = false) {
  const county = COUNTIES[idx % COUNTIES.length];
  const countyCode = String((idx % 52) + 1).padStart(2, "0");
  const cnp = nextCnp(sex, year, month, day, countyCode);
  if (partial) {
    return {
      doc_type: "ci",
      doc_series: CI_SERIES[idx % CI_SERIES.length],
      doc_number: String(100000 + idx),
      doc_issued_by: null,
      doc_issue_date: null,
      doc_expiry_date: null,
      national_id_type: "cnp",
      national_id: cnp,
      birth_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      birth_place: null,
      nationality: "România",
      address: null,
      city: null,
      county: null,
      country: "România",
      sex,
      _expected_status: "partial",
    };
  }
  return {
    doc_type: "ci",
    doc_series: CI_SERIES[idx % CI_SERIES.length],
    doc_number: String(100000 + idx),
    doc_issued_by: `SPCLEP ${county}`,
    doc_issue_date: `2018-${String((idx % 12) + 1).padStart(2, "0")}-10`,
    doc_expiry_date: `2028-${String((idx % 12) + 1).padStart(2, "0")}-09`,
    national_id_type: "cnp",
    national_id: cnp,
    birth_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birth_place: county,
    nationality: "România",
    address: `Str. ${county} nr. ${idx + 1}`,
    city: county === "București" ? "Sector 2" : county,
    county,
    country: "România",
    sex,
    _expected_status: "complete",
  };
}

function roPassportIdentity(idx, sex, year, month, day) {
  return {
    doc_type: "passport",
    doc_series: null,
    doc_number: `RO${800000 + idx}`,
    doc_issued_by: "Ministerul Afacerilor Interne",
    doc_issue_date: "2020-02-01",
    doc_expiry_date: "2030-01-31",
    national_id_type: "cnp",
    national_id: nextCnp(sex, year, month, day, "01"),
    birth_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birth_place: "București",
    nationality: "România",
    address: `Bd. Unirii ${idx}`,
    city: "București",
    county: "București",
    country: "România",
    sex,
    _expected_status: "complete",
  };
}

function roOtherIdentity(idx, sex, year, month, day) {
  return {
    doc_type: "other",
    doc_series: null,
    doc_number: `PERM-${2020 + (idx % 5)}-${idx}`,
    doc_issued_by: "IGI Timișoara",
    doc_issue_date: "2023-01-15",
    doc_expiry_date: "2026-12-31",
    national_id_type: null,
    national_id: null,
    birth_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birth_place: "Siria",
    nationality: "Siria",
    address: `Str. Azilului ${idx}`,
    city: "Timișoara",
    county: "Timiș",
    country: "România",
    sex,
    _expected_status: "complete",
  };
}

function foreignIdentity(fCode, docVariant, idx, sex, year, month, day) {
  const f = FOREIGN.find((x) => x.code === fCode);
  const base = {
    birth_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birth_place: f.country,
    nationality: f.nat,
    country: f.country,
    sex,
  };

  if (docVariant === "ci" && fCode === "MD") {
    return {
      ...base,
      doc_type: "ci",
      doc_series: "A",
      doc_number: String(300000 + idx),
      doc_issued_by: "ASP Chișinău",
      doc_issue_date: "2021-05-01",
      doc_expiry_date: "2031-04-30",
      national_id_type: "idnp",
      national_id: uniqNat("idnp", genIdnp(sex, year, month, day, idx)),
      address: `Str. Chișinău ${idx}`,
      city: "Chișinău",
      county: null,
      _expected_status: "complete",
    };
  }
  if (docVariant === "foreign_id" && fCode === "BG") {
    return {
      ...base,
      doc_type: "foreign_id",
      doc_series: null,
      doc_number: `BG-LK-${400000 + idx}`,
      doc_issued_by: "MVR Sofia",
      doc_issue_date: "2019-03-01",
      doc_expiry_date: "2029-02-28",
      national_id_type: "egn",
      national_id: uniqNat("egn", genEgn(sex, year, month, day, idx)),
      address: `ul. Vitosha ${idx}`,
      city: "Sofia",
      county: null,
      _expected_status: "complete",
    };
  }
  if (docVariant === "foreign_id" && fCode === "HU") {
    return {
      ...base,
      doc_type: "foreign_id",
      doc_series: null,
      doc_number: `HU-ID-${500000 + idx}`,
      doc_issued_by: "Közigazgatás",
      doc_issue_date: "2018-08-01",
      doc_expiry_date: "2028-07-31",
      national_id_type: "szemelyi_szam",
      national_id: uniqNat("szemelyi_szam", genSzemelyi(sex, year, month, day, idx)),
      address: `Utca ${idx}`,
      city: "Budapesta",
      county: null,
      _expected_status: "complete",
    };
  }
  if (docVariant === "passport") {
    const prefixes = { DE: "DE", FR: "FR", IT: "IT", UA: "UA", GB: "GB", MD: "MD", BG: "BG", HU: "HU" };
    const natId =
      fCode === "MD"
        ? { national_id_type: "idnp", national_id: uniqNat("idnp", genIdnp(sex, year, month, day, idx + 50)) }
        : fCode === "BG"
          ? { national_id_type: "egn", national_id: uniqNat("egn", genEgn(sex, year, month, day, idx + 50)) }
          : fCode === "HU"
            ? { national_id_type: "szemelyi_szam", national_id: uniqNat("szemelyi_szam", genSzemelyi(sex, year, month, day, idx + 50)) }
            : { national_id_type: null, national_id: null };
    return {
      ...base,
      doc_type: "passport",
      doc_series: null,
      doc_number: `${prefixes[fCode]}${600000 + idx}`,
      doc_issued_by: `Ministerul Afacerilor Externe ${f.country}`,
      doc_issue_date: "2017-06-01",
      doc_expiry_date: "2027-05-31",
      ...natId,
      address: `Test Street ${idx}`,
      city: "Capital",
      county: null,
      _expected_status: "complete",
    };
  }
  if (docVariant === "other" && fCode === "UA") {
    return {
      ...base,
      doc_type: "other",
      doc_series: null,
      doc_number: `UA-TEMP-${idx}`,
      doc_issued_by: "Temporary protection RO",
      doc_issue_date: "2024-03-01",
      doc_expiry_date: "2026-03-01",
      national_id_type: null,
      national_id: null,
      address: `Centru primire ${idx}`,
      city: "Suceava",
      county: "Suceava",
      country: "România",
      _expected_status: "complete",
    };
  }
  if (docVariant === "foreign_id") {
    return {
      ...base,
      doc_type: "foreign_id",
      doc_series: null,
      doc_number: `${fCode}-FID-${700000 + idx}`,
      doc_issued_by: f.country,
      doc_issue_date: "2019-01-01",
      doc_expiry_date: "2029-01-01",
      national_id_type: null,
      national_id: null,
      address: `Residence ${idx}`,
      city: "Capital",
      county: null,
      _expected_status: "complete",
    };
  }
  if (docVariant === "other") {
    return {
      ...base,
      doc_type: "other",
      doc_series: null,
      doc_number: `${fCode}-ALT-${800000 + idx}`,
      doc_issued_by: `Autoritate ${f.country}`,
      doc_issue_date: "2022-06-01",
      doc_expiry_date: "2027-06-01",
      national_id_type: null,
      national_id: null,
      address: `Document alternativ ${idx}`,
      city: "Capital",
      county: null,
      _expected_status: "complete",
    };
  }
  // fallback passport
  return foreignIdentity(fCode, "passport", idx, sex, year, month, day);
}

// ─── Build 100 clients ──────────────────────────────────────────────────────

function buildClients() {
  const clients = [];
  let idx = 0;

  // 76 români
  const roDocPlan = [
    ...Array(58).fill("ci"),
    ...Array(6).fill("ci_partial"),
    ...Array(4).fill("passport"),
    ...Array(4).fill("other"),
    ...Array(4).fill("check_in_only"),
  ];
  if (roDocPlan.length !== 76) throw new Error("RO count wrong");

  for (let r = 0; r < 76; r++) {
    const sex = r % 2 === 0 ? "M" : "F";
    const year = 1965 + (r % 40);
    const month = (r % 12) + 1;
    const day = (r % 27) + 1;
    const last = RO_LAST[r % RO_LAST.length];
    const first = sex === "M" ? RO_FIRST_M[r % RO_FIRST_M.length] : RO_FIRST_F[r % RO_FIRST_F.length];
    const stay = pickStay(r);
    const docKind = roDocPlan[r];

    let check_in = null;
    if (docKind !== "check_in_only") {
      if (docKind === "ci" || docKind === "ci_partial") check_in = roCiIdentity(r, sex, year, month, day, docKind === "ci_partial");
      else if (docKind === "passport") check_in = roPassportIdentity(r, sex, year, month, day);
      else if (docKind === "other") check_in = roOtherIdentity(r, sex, year, month, day);
    }

    const phone = uniqPhone(`07${String(20 + (r % 70)).padStart(2, "0")}${String(100000 + r * 137).slice(-6)}`);
    const notes =
      stay.overlap
        ? `[TEST ${stay.overlap}] Cerere suprapusă — ${stay.stay_edge}`
        : stay.stay_edge === "back_to_back_B_aceeasi_persoana"
          ? "[TEST] Aceeași persoană ca clientul anterior (back-to-back)"
          : stay.stay_edge !== "standard"
            ? `[TEST] ${stay.stay_edge}`
            : "";

    clients.push({
      id: `T${pad3(idx + 1)}`,
      cetatenie: "România",
      cetatenie_cod: "RO",
      tip_persoane: stay.party,
      test_scenario: buildScenario("RO", docKind, stay),
      cerere_publica: {
        check_in: stay.check_in,
        check_out: stay.check_out,
        num_adults: stay.adults,
        num_children: stay.children,
        has_minor: stay.has_minor,
        minor_age: stay.has_minor ? stay.minor_age : "",
        guest_last_name: last,
        guest_first_name: first,
        guest_name: `${last} ${first}`,
        guest_email: uniqEmail(`ro.client.${pad3(r + 1)}@test.casaemil.local`),
        guest_phone: phone,
        notes,
      },
      check_in: check_in,
      ...(stay.overlap ? { suprapunere: stay.overlap } : {}),
      ...(stay.stay_edge !== "standard" ? { cazare_edge: stay.stay_edge } : {}),
    });
    idx++;
  }

  // 24 străini — 8 țări × 3, documente diferite per țară
  const foreignDocPlan = {
    MD: ["ci", "passport", "foreign_id"],
    BG: ["foreign_id", "passport", "other"],
    HU: ["foreign_id", "passport", "other"],
    DE: ["passport", "foreign_id", "other"],
    FR: ["passport", "foreign_id", "other"],
    IT: ["passport", "foreign_id", "other"],
    UA: ["passport", "foreign_id", "other"],
    GB: ["passport", "foreign_id", "other"],
  };

  let fIdx = 0;
  for (const f of FOREIGN) {
    const docs = foreignDocPlan[f.code];
    for (let slot = 0; slot < 3; slot++) {
      const sex = fIdx % 2 === 0 ? "M" : "F";
      const year = 1978 + (fIdx % 25);
      const month = (fIdx % 12) + 1;
      const day = (fIdx % 25) + 1;
      const last = f.last[slot % f.last.length];
      const first = sex === "M" ? f.firstM[slot % f.firstM.length] : f.firstF[slot % f.firstF.length];
      const stay = pickStay(76 + fIdx);
      const docVariant = docs[slot];
      const identity = foreignIdentity(f.code, docVariant, 900 + fIdx, sex, year, month, day);

      const intlPhone = {
        MD: `+3736${String(9000000 + fIdx * 11111).slice(-7)}`,
        BG: `+3598${String(8000000 + fIdx * 12345).slice(-7)}`,
        HU: `+3620${String(5000000 + fIdx * 23456).slice(-7)}`,
        DE: `+4915${String(10000000 + fIdx * 111111).slice(-8)}`,
        FR: `+336${String(10000000 + fIdx * 122222).slice(-8)}`,
        IT: `+3933${String(1000000 + fIdx * 133333).slice(-7)}`,
        UA: `+38050${String(1000000 + fIdx * 144444).slice(-7)}`,
        GB: `+4477${String(1000000 + fIdx * 155555).slice(-7)}`,
      }[f.code];

      clients.push({
        id: `T${pad3(idx + 1)}`,
        cetatenie: f.nat,
        cetatenie_cod: f.code,
        tip_persoane: stay.party,
        test_scenario: buildScenario(f.code, docVariant, stay),
        cerere_publica: {
          check_in: stay.check_in,
          check_out: stay.check_out,
          num_adults: stay.adults,
          num_children: stay.children,
          has_minor: stay.has_minor,
          minor_age: stay.has_minor ? stay.minor_age : "",
          guest_last_name: last,
          guest_first_name: first,
          guest_name: `${last} ${first}`,
          guest_email: uniqEmail(`${f.code.toLowerCase()}.client.${pad3(slot + 1)}@test.casaemil.local`),
          guest_phone: uniqPhone(intlPhone),
          notes: stay.overlap ? `[TEST ${stay.overlap}] ${stay.stay_edge}` : stay.stay_edge !== "standard" ? `[TEST] ${stay.stay_edge}` : `Cetățean ${f.nat}`,
        },
        check_in: identity,
        ...(stay.overlap ? { suprapunere: stay.overlap } : {}),
        ...(stay.stay_edge !== "standard" ? { cazare_edge: stay.stay_edge } : {}),
      });
      fIdx++;
      idx++;
    }
  }

  if (clients.length !== 100) throw new Error(`Expected 100, got ${clients.length}`);
  applyFraudPatches(clients);
  return clients;
}

/** Eliberează telefon/email vechi când suprascriem un client. */
function releaseClientUniques(c) {
  const p = c.cerere_publica;
  if (p?.guest_phone) usedPhones.delete(p.guest_phone);
  if (p?.guest_email) usedEmails.delete(p.guest_email.toLowerCase());
  const nid = c.check_in?.national_id;
  const nit = c.check_in?.national_id_type;
  if (nid && nit) usedNatIds.delete(`${nit}:${nid}`);
}

function patchClient(clients, index, patch) {
  releaseClientUniques(clients[index]);
  const prev = clients[index];
  clients[index] = {
    ...prev,
    ...patch,
    cerere_publica: { ...prev.cerere_publica, ...patch.cerere_publica },
    check_in: patch.check_in !== undefined ? patch.check_in : prev.check_in,
  };
}

/**
 * Înlocuiește clienții RO T061–T076 cu scenarii dedup / fraudă / date proaste.
 * T001–T060 și străinii rămân neschimbați.
 */
function applyFraudPatches(clients) {
  const stay = (i) => pickStay(i);
  const refCnp = clients[0].check_in?.national_id;

  const patches = [
    {
      // T061 — același nume, telefon A
      test_tags: ["dedup_acelasi_nume", "grup_dedup_vasile"],
      test_scenario: "FRAUD · Ionescu Vasile #1 · același nume, telefon diferit față de #2",
      cerere_publica: {
        guest_last_name: "Ionescu",
        guest_first_name: "Vasile",
        guest_name: "Ionescu Vasile",
        guest_email: uniqEmail("fraud.dedup.vasile.a@test.casaemil.local"),
        guest_phone: uniqPhone("0725900101"),
        notes: "[FRAUD] Dedup: același nume ca T062, telefoane diferite — nu merge automat",
      },
      check_in: roCiIdentity(601, "M", 1983, 3, 15, false),
    },
    {
      // T062 — același nume, telefon B, CNP diferit
      test_tags: ["dedup_acelasi_nume", "grup_dedup_vasile"],
      test_scenario: "FRAUD · Ionescu Vasile #2 · persoană diferită, același nume",
      cerere_publica: {
        guest_last_name: "Ionescu",
        guest_first_name: "Vasile",
        guest_name: "Ionescu Vasile",
        guest_email: uniqEmail("fraud.dedup.vasile.b@test.casaemil.local"),
        guest_phone: uniqPhone("0725900102"),
        notes: "[FRAUD] Dedup: verifică că NU se fuzionează greșit cu T061",
      },
      check_in: roCiIdentity(602, "M", 1983, 3, 15, false),
    },
    {
      test_tags: ["dedup_acelasi_nume", "grup_dedup_maria"],
      test_scenario: "FRAUD · Popescu Maria #1 · același nume complet",
      cerere_publica: {
        guest_last_name: "Popescu",
        guest_first_name: "Maria",
        guest_name: "Popescu Maria",
        guest_email: uniqEmail("fraud.dedup.maria.a@test.casaemil.local"),
        guest_phone: uniqPhone("0725900103"),
        notes: "[FRAUD] Pereche dedup nume — vezi și T064",
      },
      check_in: roCiIdentity(603, "F", 1991, 7, 22, false),
    },
    {
      test_tags: ["dedup_acelasi_nume", "grup_dedup_maria"],
      test_scenario: "FRAUD · Popescu Maria #2 · același nume, alt CNP",
      cerere_publica: {
        guest_last_name: "Popescu",
        guest_first_name: "Maria",
        guest_name: "Popescu Maria",
        guest_email: uniqEmail("fraud.dedup.maria.b@test.casaemil.local"),
        guest_phone: uniqPhone("0725900104"),
        notes: "[FRAUD] Pereche dedup nume — vezi și T063",
      },
      check_in: roCiIdentity(604, "F", 1988, 11, 5, false),
    },
    {
      test_tags: ["dedup_email_conflict"],
      test_scenario: "FRAUD · Același email ca T061, telefon diferit — conflict dedup",
      cerere_publica: {
        guest_last_name: "Conflict",
        guest_first_name: "Email",
        guest_name: "Conflict Email",
        guest_email: "fraud.dedup.vasile.a@test.casaemil.local",
        guest_phone: uniqPhone("0725900105"),
        notes: "[FRAUD] Email duplicat T061 · telefon nou — ce guest se leagă?",
      },
      check_in: roCiIdentity(605, "M", 1975, 1, 10, false),
      test_negativ: {
        asteptat: "mergeConflict sau potrivire după telefon/email",
        referinta: "T061",
      },
    },
    {
      test_tags: ["dedup_telefon_format"],
      test_scenario: "FRAUD · Același telefon ca T061, format +40 cu spații",
      cerere_publica: {
        guest_last_name: "TelefonFormat",
        guest_first_name: "Test",
        guest_name: "TelefonFormat Test",
        guest_email: uniqEmail("fraud.phone.format@test.casaemil.local"),
        guest_phone: uniqPhone("+40 725 900 101"),
        notes: "[FRAUD] Normalizare: același E.164 ca T061 (0725900101)",
      },
      check_in: roCiIdentity(606, "M", 1980, 6, 6, false),
      test_negativ: {
        telefon_raw_alternativ: "0725900101",
        telefon_normalizat_asteptat: "+40725900101",
        referinta: "T061",
      },
    },
    {
      test_tags: ["document_expirat"],
      test_scenario: "FRAUD · Document EXPIRAT (2020) — check-in cu act invalid",
      cerere_publica: {
        guest_last_name: "DocExpirat",
        guest_first_name: "Ion",
        guest_name: "DocExpirat Ion",
        guest_email: uniqEmail("fraud.doc.expired@test.casaemil.local"),
        guest_phone: uniqPhone("0725900107"),
        notes: "[FRAUD] doc_expiry_date în trecut — avertizare UI?",
      },
      check_in: {
        ...roCiIdentity(607, "M", 1978, 4, 20, false),
        doc_expiry_date: "2020-01-01",
        doc_issue_date: "2010-01-01",
      },
      test_negativ: { asteptat: "avertizare document expirat la check-in" },
    },
    {
      test_tags: ["document_expira_curand"],
      test_scenario: "FRAUD · Document expiră în ~5 zile (2026-06-10)",
      cerere_publica: {
        guest_last_name: "DocExpiraCurand",
        guest_first_name: "Elena",
        guest_name: "DocExpiraCurand Elena",
        guest_email: uniqEmail("fraud.doc.soon@test.casaemil.local"),
        guest_phone: uniqPhone("0725900108"),
        notes: "[FRAUD] Expiră curând — test avertizare",
      },
      check_in: {
        ...roCiIdentity(608, "F", 1992, 8, 14, false),
        doc_expiry_date: "2026-06-10",
      },
      test_negativ: { asteptat: "avertizare expirare apropiată" },
    },
    {
      test_tags: ["document_expirat"],
      test_scenario: "FRAUD · Document expirat ieri (2026-06-04)",
      cerere_publica: {
        guest_last_name: "DocExpiratIeri",
        guest_first_name: "Ana",
        guest_name: "DocExpiratIeri Ana",
        guest_email: uniqEmail("fraud.doc.yesterday@test.casaemil.local"),
        guest_phone: uniqPhone("0725900109"),
        notes: "[FRAUD] Expirat recent",
      },
      check_in: {
        ...roCiIdentity(609, "F", 1986, 2, 28, false),
        doc_expiry_date: "2026-06-04",
      },
    },
    {
      test_tags: ["cnp_duplicat", "fraud_identitate"],
      test_scenario: "FRAUD · CNP deja folosit (T001) — încearcă duplicat la check-in",
      cerere_publica: {
        guest_last_name: "CnpDuplicat",
        guest_first_name: "Test",
        guest_name: "CnpDuplicat Test",
        guest_email: uniqEmail("fraud.cnp.dup@test.casaemil.local"),
        guest_phone: uniqPhone("0725900110"),
        notes: "[FRAUD] CNP propriu valid; vezi test_negativ",
      },
      check_in: roCiIdentity(610, "M", 1990, 5, 5, false),
      test_negativ: {
        incearca_cnp: refCnp,
        referinta_cnp_existent: "T001",
        asteptat: "respinge CNP duplicat (findGuestByNationalId)",
      },
    },
    {
      test_tags: ["cnp_invalid", "fraud_identitate"],
      test_scenario: "FRAUD · CNP cu check-digit greșit — date proaste la check-in",
      cerere_publica: {
        guest_last_name: "CnpInvalid",
        guest_first_name: "Ion",
        guest_name: "CnpInvalid Ion",
        guest_email: uniqEmail("fraud.cnp.bad@test.casaemil.local"),
        guest_phone: uniqPhone("0725900111"),
        notes: "[FRAUD] Date rezervare OK; la check-in testează CNP invalid",
      },
      check_in: roCiIdentity(611, "M", 1985, 1, 1, false),
      test_negativ: {
        incearca_cnp: "1850101410019",
        asteptat: "respinge — check digit invalid",
        incearca_cnp_2: "0000000000000",
      },
    },
    {
      test_tags: ["cnp_data_neconcordanta", "fraud_identitate"],
      test_scenario: "FRAUD · CNP valid dar data nașterii greșită",
      cerere_publica: {
        guest_last_name: "CnpMismatch",
        guest_first_name: "Elena",
        guest_name: "CnpMismatch Elena",
        guest_email: uniqEmail("fraud.cnp.mismatch@test.casaemil.local"),
        guest_phone: uniqPhone("0725900112"),
        notes: "[FRAUD] CNP corect în check_in; încearcă birth_date diferit",
      },
      check_in: roCiIdentity(612, "F", 1990, 3, 15, false),
      test_negativ: {
        incearca_birth_date: "2000-01-01",
        cnp_corect_din_fisier: "(vezi check_in)",
        asteptat: "inconsistență CNP vs dată naștere",
      },
    },
    {
      test_tags: ["document_duplicat", "fraud_identitate"],
      test_scenario: "FRAUD · Același nr. CI ca T001 — document duplicat",
      cerere_publica: {
        guest_last_name: "DocDuplicat",
        guest_first_name: "Vasile",
        guest_name: "DocDuplicat Vasile",
        guest_email: uniqEmail("fraud.doc.dup@test.casaemil.local"),
        guest_phone: uniqPhone("0725900113"),
        notes: "[FRAUD] Alt CNP, același nr. document ca T001",
      },
      check_in: {
        ...roCiIdentity(613, "M", 1977, 9, 9, false),
        doc_number: clients[0].check_in?.doc_number ?? "100000",
        doc_series: clients[0].check_in?.doc_series ?? "RX",
      },
      test_negativ: {
        referinta_document: "T001",
        asteptat: "dedup warning pe doc_type + doc_number",
      },
    },
    {
      test_tags: ["identitate_la_checkin", "fraud_identitate"],
      test_scenario: "FRAUD · Zero identitate la rezervare — totul la check-in",
      cerere_publica: {
        guest_last_name: "FaraIdentitate",
        guest_first_name: "Rezervare",
        guest_name: "FaraIdentitate Rezervare",
        guest_email: uniqEmail("fraud.no.identity@test.casaemil.local"),
        guest_phone: uniqPhone("0725900114"),
        notes: "[FRAUD] Poți introduce date false la check-in — validare?",
      },
      check_in: null,
      test_negativ: {
        incearca_cnp: "1234567890123",
        asteptat: "respinge format/check digit",
      },
    },
    {
      test_tags: ["identitate_partiala", "fraud_identitate"],
      test_scenario: "FRAUD · Identitate parțială — completezi restul la check-in",
      cerere_publica: {
        guest_last_name: "PartialCheckin",
        guest_first_name: "Guest",
        guest_name: "PartialCheckin Guest",
        guest_email: uniqEmail("fraud.partial@test.casaemil.local"),
        guest_phone: uniqPhone("0725900115"),
        notes: "[FRAUD] Doar CNP la profil; restul la check-in",
      },
      check_in: roCiIdentity(615, "F", 1993, 12, 1, true),
      test_negativ: { asteptat: "identity_status partial până completezi adresă + doc" },
    },
    {
      test_tags: ["telefon_invalid", "fraud_rezervare"],
      test_scenario: "FRAUD · Telefon placeholder la rezervare — test validare",
      cerere_publica: {
        guest_last_name: "TelefonPlaceholder",
        guest_first_name: "Test",
        guest_name: "TelefonPlaceholder Test",
        guest_email: uniqEmail("fraud.phone.bad@test.casaemil.local"),
        guest_phone: uniqPhone("0725900116"),
        notes: "[FRAUD] Telefon valid în fișier; vezi test_negativ pentru ce NU merge",
      },
      check_in: roCiIdentity(616, "M", 1988, 7, 7, false),
      test_negativ: {
        incearca_telefon_la_rezervare: ["—", "n/a", "", "0725900116"],
        telefoane_respinse: ["—", "n/a", "", "."],
        asteptat: "guest.phone_required / normalizare respinsă",
      },
    },
  ];

  if (patches.length !== 16) throw new Error("Fraud patches count");
  for (let i = 0; i < patches.length; i++) {
    patchClient(clients, 60 + i, patches[i]);
  }
}

function buildTestCatalog(clients) {
  const catalog = {};
  for (const c of clients) {
    for (const tag of c.test_tags ?? []) {
      if (!catalog[tag]) catalog[tag] = [];
      catalog[tag].push(c.id);
    }
  }
  return catalog;
}

function buildScenario(citizenship, doc, stay) {
  const docLabel = {
    ci: "CI + CNP",
    ci_partial: "CI parțial (completezi la check-in)",
    passport: "Pașaport",
    foreign_id: "Act străin",
    other: "Alt document",
    check_in_only: "Fără identitate — doar la check-in",
  }[doc] ?? doc;
  const parts = [
    citizenship === "RO" ? "Român" : `Străin (${citizenship})`,
    docLabel,
    stay.party,
    `${stay.check_in} → ${stay.check_out}`,
  ];
  if (stay.overlap) parts.push(`suprapunere ${stay.overlap}`);
  if (stay.stay_edge && stay.stay_edge !== "standard") parts.push(stay.stay_edge);
  return parts.join(" · ");
}

function stripInternal(identity) {
  if (!identity) return null;
  const { _expected_status, ...rest } = identity;
  return { ...rest, expected_identity_status: _expected_status ?? null };
}

function renderMarkdown(clients, meta) {
  const lines = [
    "# 100 clienți test — Casa Emil",
    "",
    "Ghid pentru testare manuală: **pagina publică** (cerere rezervare) + **check-in** (identitate).",
    "",
    `- Generat: ${meta.generated_at}`,
    `- Români: **76** (76%) · Străini: **24** (24%, câte 3 per țară)`,
    `- Țări străine: MD, BG, HU, DE, FR, IT, UA, GB`,
    "",
    "## Cum testezi",
    "",
    "1. **Pagina publică** (`/calendar`) — introdu câmpurile din secțiunea *Cerere publică*.",
    "2. **Admin** — acceptă cererea, apoi la check-in completează *Check-in / Identitate*.",
    "3. Clienții cu `check_in: null` — identitatea se introduce integral la check-in.",
    "4. **Suprapuneri** — caută `CLUSTER-A` / `CLUSTER-B` pentru teste disponibilitate.",
    "5. **Fraudă/dedup** — clienții **T061–T076** + filtru în HTML · vezi `test_catalog` în JSON.",
    "",
    "---",
    "",
  ];

  for (const c of clients) {
    const p = c.cerere_publica;
    const ci = c.check_in;
    lines.push(`## ${c.id} — ${c.test_scenario}`);
    lines.push("");
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| Cetățenie | ${c.cetatenie} |`);
    lines.push(`| Tip | ${c.tip_persoane} |`);
    if (c.suprapunere) lines.push(`| Suprapunere | **${c.suprapunere}** |`);
    if (c.test_tags?.length) lines.push(`| Test tags | ${c.test_tags.map((t) => `\`${t}\``).join(", ")} |`);
    lines.push("");
    lines.push("### Cerere publică (formular rezervare)");
    lines.push("");
    lines.push("| Câmp | Valoare |");
    lines.push("|------|---------|");
    lines.push(`| Data check-in | \`${p.check_in}\` |`);
    lines.push(`| Data check-out | \`${p.check_out}\` |`);
    lines.push(`| Adulți | ${p.num_adults} |`);
    lines.push(`| Copii | ${p.num_children} |`);
    if (p.has_minor) lines.push(`| Minor (bifat) | Da, vârsta: ${p.minor_age} |`);
    lines.push(`| Nume | \`${p.guest_last_name}\` |`);
    lines.push(`| Prenume | \`${p.guest_first_name}\` |`);
    lines.push(`| Email | \`${p.guest_email}\` |`);
    lines.push(`| Telefon | \`${p.guest_phone}\` |`);
    if (p.notes) lines.push(`| Mesaj | ${p.notes} |`);
    lines.push("");
    lines.push("### Check-in / Înregistrare client (admin)");
    lines.push("");
    if (!ci) {
      lines.push("*Completezi toate câmpurile identitate la check-in (client nou, fără date preexistente).*");
    } else {
      lines.push("| Câmp | Valoare |");
      lines.push("|------|---------|");
      const fields = [
        ["Tip document", ci.doc_type],
        ["Serie CI", ci.doc_series],
        ["Nr. document", ci.doc_number],
        ["Emis de", ci.doc_issued_by],
        ["Data emitere", ci.doc_issue_date],
        ["Data expirare", ci.doc_expiry_date],
        ["Tip ID național", ci.national_id_type],
        ["ID național", ci.national_id],
        ["Data nașterii", ci.birth_date],
        ["Loc naștere", ci.birth_place],
        ["Naționalitate", ci.nationality],
        ["Adresă", ci.address],
        ["Localitate", ci.city],
        ["Județ", ci.county],
        ["Țară", ci.country],
        ["Sex", ci.sex],
      ];
      for (const [label, val] of fields) {
        if (val != null && val !== "") lines.push(`| ${label} | \`${val}\` |`);
      }
      if (ci._expected_status) lines.push(`| Status așteptat | ${ci._expected_status} |`);
    }
    if (c.test_negativ) {
      lines.push("");
      lines.push("### Test negativ (încearcă manual)");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(c.test_negativ, null, 2));
      lines.push("```");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderKvTable(rows, compact = false) {
  const cls = compact ? "fields fields--compact fields--grid" : "fields";
  return `<div class="${cls}">${rows
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v, full]) => {
      const wide = full ? " field--full" : "";
      return `<button type="button" class="field${wide}" data-copy="${esc(String(v))}"><span class="field-k">${esc(k)}</span><span class="field-v">${esc(v)}</span>${compact ? "" : `<span class="field-hint">apasă copiază</span>`}</button>`;
    })
    .join("")}</div>`;
}

function renderHtml(rawClients, meta) {
  const sorted = [...rawClients].sort((a, b) => {
    const pa = a.cerere_publica;
    const pb = b.cerere_publica;
    const byLast = pa.guest_last_name.localeCompare(pb.guest_last_name, "ro", { sensitivity: "base" });
    if (byLast !== 0) return byLast;
    return pa.guest_first_name.localeCompare(pb.guest_first_name, "ro", { sensitivity: "base" });
  });

  const toc = sorted
    .map((c, i) => {
      const p = c.cerere_publica;
      const page = i < 50 ? 1 : 2;
      const cc = c.cetatenie_cod === "RO" ? "ro" : "fx";
      const fr = c.test_tags?.length ? " fr" : "";
      return `<a href="#${c.id}" class="toc-link ${cc}${fr}" data-page="${page}"><strong>${c.id}</strong> ${esc(p.guest_last_name)} ${esc(p.guest_first_name)}</a>`;
    })
    .join("");

  const page1Letter = sorted[0].cerere_publica.guest_last_name[0];
  const page1End = sorted[49].cerere_publica.guest_last_name;
  const page2Letter = sorted[50].cerere_publica.guest_last_name[0];
  const page2End = sorted[99].cerere_publica.guest_last_name;

  const cards = sorted
    .map((c, i) => {
      const page = i < 50 ? 1 : 2;
      const pageIdx = (i % 50) + 1;
      const p = c.cerere_publica;
      const ci = c.check_in;
      const fullName = `${p.guest_last_name} ${p.guest_first_name}`;
      const searchBlob = [p.guest_last_name, p.guest_first_name, p.guest_email, p.guest_phone]
        .filter(Boolean)
        .join(" ");
      const pubRows = [
        ["Check-in", p.check_in],
        ["Check-out", p.check_out],
        ["Adulți", p.num_adults],
        ["Copii", p.num_children],
        ...(p.has_minor ? [["Minor", `Da · ${p.minor_age} ani`]] : []),
        ["Email", p.guest_email],
        ["Telefon", p.guest_phone],
        ...(p.notes ? [["Mesaj", p.notes, true]] : []),
      ];

      let checkHtml;
      if (!ci) {
        checkHtml = `<p class="empty">Identitate completă la check-in (fără date preexistente).</p>`;
      } else {
        const ciRows = [
          ["Document", ci.doc_type],
          ["Serie", ci.doc_series],
          ["Nr.", ci.doc_number],
          ["Emis de", ci.doc_issued_by],
          ["Emitere", ci.doc_issue_date],
          ["Expirare", ci.doc_expiry_date],
          ["ID tip", ci.national_id_type],
          ["ID național", ci.national_id],
          ["Naștere", ci.birth_date],
          ["Loc naștere", ci.birth_place],
          ["Naționalitate", ci.nationality],
          ["Adresă", ci.address],
          ["Localitate", ci.city],
          ["Județ", ci.county],
          ["Țară", ci.country],
          ["Sex", ci.sex],
          ...(ci._expected_status ? [["Status", ci._expected_status]] : []),
        ];
        checkHtml = renderKvTable(ciRows);
      }

      const tags = [
        `<span class="b ${c.cetatenie_cod === "RO" ? "ro" : "fx"}">${esc(c.cetatenie_cod)}</span>`,
        `<span class="b">${esc(c.tip_persoane)}</span>`,
        ci?.doc_type ? `<span class="b doc">${esc(ci.doc_type)}</span>` : `<span class="b warn">fără ID</span>`,
        c.suprapunere ? `<span class="b ov">${esc(c.suprapunere)}</span>` : "",
        ...(c.test_tags ?? []).map((t) => `<span class="b fr">${esc(t.replace(/_/g, " "))}</span>`),
      ]
        .filter(Boolean)
        .join("");

      const dates = `${p.check_in} → ${p.check_out}`;

      const negHtml = c.test_negativ
        ? `<div class="neg-block"><p class="panel-hint panel-hint--neg">Test negativ — fraudă</p><pre class="neg-pre">${esc(JSON.stringify(c.test_negativ, null, 2))}</pre></div>`
        : "";

      return `<article class="card" id="${c.id}" data-page="${page}" data-idx="${pageIdx}" data-fraud="${c.test_tags?.length ? "1" : "0"}" data-last="${esc(p.guest_last_name)}" data-first="${esc(p.guest_first_name)}" data-email="${esc(p.guest_email)}" data-search="${esc(searchBlob)}">
<div class="card-rez">
<div class="card-top">
<span class="card-num">${pageIdx}</span>
<div class="card-top-text">
<div class="sum-main"><span class="cid">${c.id}</span><button type="button" class="name" data-copy="${esc(fullName)}">${esc(p.guest_last_name)} ${esc(p.guest_first_name)}</button></div>
<div class="sum-meta">${esc(dates)} · ${esc(c.tip_persoane)}</div>
<div class="sum-tags">${tags}</div>
</div>
</div>
${renderKvTable(pubRows, true)}
</div>
<button type="button" class="card-chk-bar" aria-expanded="false" aria-label="Deschide date check-in">
<span class="role-badge chk">CHECK-IN</span>
<span class="chk-hint">Apasă aici → identitate check-in</span>
<span class="chev" aria-hidden="true"></span>
</button>
<div class="card-collapse"><div class="card-inner">
<div class="chk-body">
<p class="panel-hint panel-hint--chk"><span class="role-badge chk">ADMIN</span> Identitate la check-in</p>
${checkHtml}
${negHtml}
</div>
</div></div>
</article>`;
    })
    .join("\n");

  const clusterA = meta.suprapuneri["CLUSTER-A"].join(", ");
  const clusterB = meta.suprapuneri["CLUSTER-B"].join(", ");

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#1e3a8a">
<title>100 clienți test</title>
<style>
:root{
  --bg:#e8edf4;--card:#fff;--b:#cbd5e1;--t:#0f172a;--m:#64748b;
  --rez:#2563eb;--chk:#059669;--neg:#d97706;--safe-b:env(safe-area-inset-bottom,0px);
  --touch:45px;--bar-h:calc(176px + var(--safe-b));--ease:cubic-bezier(.4,0,.2,1);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
body{font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--t);background:var(--bg);padding-bottom:var(--bar-h);-webkit-text-size-adjust:100%}
.app{min-height:100dvh}
.top{background:linear-gradient(145deg,#1e3a8a,#2563eb);color:#fff;padding:13px 13px 16px;padding-top:calc(10px + env(safe-area-inset-top,0px));border-radius:0 0 20px 20px;box-shadow:0 6px 20px rgba(30,58,138,.22)}
.top h1{font-size:18px;font-weight:800;letter-spacing:-.02em}
.top>p{font-size:12px;opacity:.9;margin-top:3px}
.role-pills{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}
.role-pill{padding:10px 11px;border-radius:11px;font-size:11px;font-weight:600;line-height:1.35;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff}
.role-pill strong{display:block;font-size:12px;margin-bottom:2px}
.main{padding:9px 9px 14px}
.page-bar{background:var(--card);border-radius:13px;padding:10px;margin-bottom:10px;box-shadow:0 2px 10px rgba(15,23,42,.07)}
.page-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
.page-tab{min-height:var(--touch);padding:8px 10px;border:2px solid var(--b);border-radius:11px;background:#f8fafc;font:inherit;font-size:13px;font-weight:700;color:var(--m);text-align:left;touch-action:manipulation;transition:all .25s var(--ease)}
.page-tab span{display:block;font-size:11px;font-weight:500;margin-top:2px;opacity:.85}
.page-tab.on{background:var(--rez);border-color:var(--rez);color:#fff;box-shadow:0 3px 11px rgba(37,99,235,.3)}
.page-tab.has-hit:not(.on){border-color:#fbbf24;background:#fffbeb}
.batch-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.batch-row>span{font-size:11px;font-weight:700;color:var(--m);flex:0 0 auto}
.batch-btns{display:flex;flex:1;gap:5px}
.batch-btns button{flex:1;min-height:36px;font:inherit;font-size:13px;font-weight:700;border:2px solid var(--b);border-radius:10px;background:#fff;color:var(--t);touch-action:manipulation;transition:all .2s var(--ease)}
.batch-btns button.on{background:#0f172a;border-color:#0f172a;color:#fff}
.batch-btns button:active{transform:scale(.96)}
.page-info{font-size:11px;color:var(--m);margin-top:8px;text-align:center;font-weight:600}
.cards{display:flex;flex-direction:column;gap:7px}
.card{background:var(--card);border-radius:11px;box-shadow:0 2px 8px rgba(15,23,42,.06);overflow:hidden;border:2px solid transparent;transition:border-color .25s var(--ease),box-shadow .25s var(--ease);cursor:pointer;touch-action:manipulation}
.card.open{border-color:#6ee7b7;box-shadow:0 4px 16px rgba(5,150,105,.1)}
.card[hidden]{display:none!important}
.card-rez{padding:8px 10px 0}
.card-top{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}
.card-num{flex-shrink:0;width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:var(--rez);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.card-top-text{flex:1;min-width:0}
.sum-main{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px}
.cid{font-size:10px;font-weight:800;color:var(--rez);background:#eff6ff;padding:1px 5px;border-radius:4px}
.name{font:inherit;font-size:14px;font-weight:800;line-height:1.2;letter-spacing:-.02em;color:inherit;background:none;border:none;padding:0;text-align:left;cursor:pointer;touch-action:manipulation}
.name:active{opacity:.7}
.sum-meta{font-size:11px;color:var(--m);margin-top:3px;font-weight:500}
.sum-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.b{font-size:8px;padding:2px 5px;border-radius:5px;background:#f1f5f9;color:var(--m);font-weight:700;line-height:1.2}
.b.ro{background:#d1fae5;color:#047857}
.b.fx{background:#ede9fe;color:#6d28d9}
.b.doc{background:#dbeafe;color:#1d4ed8}
.b.ov{background:#fee2e2;color:#b91c1c}
.b.fr{background:#fce7f3;color:#9d174d}
.b.warn{background:#fef3c7;color:#b45309}
.card-chk-bar{display:flex;align-items:center;gap:6px;width:100%;padding:7px 10px;border:none;border-top:1px dashed var(--b);background:linear-gradient(180deg,#f8fafc,#f1f5f9);font:inherit;color:var(--m);text-align:left;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.card.open .card-chk-bar{background:linear-gradient(180deg,#ecfdf5,#d1fae5);color:#065f46}
.card-chk-bar:active{opacity:.85}
.chk-hint{flex:1;font-size:10px;font-weight:600;pointer-events:none}
.chev{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:#fff;position:relative;transition:transform .35s var(--ease);box-shadow:0 1px 2px rgba(0,0,0,.06);pointer-events:none}
.chev::after{content:"";position:absolute;inset:0;margin:auto;width:5px;height:5px;border-right:2px solid var(--m);border-bottom:2px solid var(--m);transform:rotate(45deg) translate(-1px,-1px)}
.card.open .chev{transform:rotate(180deg)}
.card-collapse{display:none}
.card.open .card-collapse{display:block}
.card-inner{padding:0 10px 10px}
.chk-body{padding-top:8px;border-top:1px solid var(--b)}
.panel-hint{font-size:10px;line-height:1.35;padding:8px 10px;border-radius:9px;margin-bottom:8px;font-weight:500}
.panel-hint--chk{background:#ecfdf5;color:#065f46}
.panel-hint--neg{background:#fff7ed;color:#9a3412;margin-top:10px}
.role-badge{display:inline-block;font-size:9px;font-weight:800;padding:2px 6px;border-radius:5px;margin-right:6px}
.role-badge.rez{background:var(--rez);color:#fff}
.role-badge.chk{background:var(--chk);color:#fff}
.fields{display:flex;flex-direction:column;gap:5px}
.fields--grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.fields--grid .field--full{grid-column:1/-1}
.fields--compact .field{min-height:34px;padding:5px 7px;border-radius:8px;border-width:1.5px}
.field{display:flex;flex-direction:column;width:100%;min-height:51px;padding:10px 12px;border:2px solid var(--b);border-radius:11px;background:#f8fafc;text-align:left;font:inherit;color:inherit;touch-action:manipulation;transition:all .15s var(--ease);cursor:pointer}
.field:active{background:#dbeafe;border-color:var(--rez);transform:scale(.985)}
.field-k{font-size:10px;font-weight:700;color:var(--m);text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px}
.fields--compact .field-k{font-size:8px;letter-spacing:.03em}
.field-v{font-size:14px;font-weight:600;word-break:break-word;line-height:1.25;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fields--compact .field-v{font-size:11px;line-height:1.2}
.field-hint{font-size:10px;color:var(--rez);margin-top:4px;font-weight:600}
.empty{font-size:13px;color:var(--m);font-style:italic;padding:8px 0}
.neg-pre{font-size:12px;background:#fff7ed;border:2px solid #fed7aa;border-radius:11px;padding:11px;white-space:pre-wrap;line-height:1.4}
.card-top{cursor:pointer}
.card-rez .fields{pointer-events:auto}
.toolbar{position:fixed;left:0;right:0;bottom:0;z-index:100;padding:10px 12px calc(10px + var(--safe-b));background:rgba(255,255,255,.97);border-top:1px solid var(--b);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 -4px 24px rgba(15,23,42,.08)}
.mode-bar{display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;margin-bottom:8px}
.mode-bar>span{font-size:13px;font-weight:800;color:var(--m);display:flex;align-items:center}
.toolbar button,.toolbar input{font:inherit;touch-action:manipulation;border-radius:14px;border:2px solid var(--b)}
.mode-rez,.mode-chk{min-height:48px;font-size:15px;font-weight:800;background:#fff;color:var(--m)}
.mode-rez.on{background:var(--rez)!important;border-color:var(--rez)!important;color:#fff!important}
.mode-chk.on{background:var(--chk)!important;border-color:var(--chk)!important;color:#fff!important}
.toolbar input{width:100%;min-height:50px;padding:0 16px;font-size:16px;margin-bottom:8px;background:#fff}
.toolbar input:focus{outline:none;border-color:var(--rez);box-shadow:0 0 0 3px rgba(37,99,235,.2)}
.toolbar-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.toolbar-actions button{min-height:48px;font-size:14px;font-weight:700;background:#fff;color:var(--t)}
.toolbar-actions button.on{background:#0f172a;border-color:#0f172a;color:#fff}
.toast{position:fixed;left:50%;bottom:calc(var(--bar-h) + 8px);transform:translateX(-50%) translateY(24px);background:#0f172a;color:#fff;padding:14px 24px;border-radius:999px;font-size:16px;font-weight:700;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.sheet{position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end;pointer-events:none;opacity:0;transition:opacity .3s var(--ease)}
.sheet.open{pointer-events:auto;opacity:1}
.sheet-bg{position:absolute;inset:0;background:rgba(15,23,42,.45)}
.sheet-panel{position:relative;width:100%;max-height:75dvh;background:#fff;border-radius:24px 24px 0 0;padding:20px 16px calc(16px + var(--safe-b));transform:translateY(100%);transition:transform .35s var(--ease);overflow:hidden;display:flex;flex-direction:column}
.sheet.open .sheet-panel{transform:translateY(0)}
.sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.sheet-head h2{font-size:18px;font-weight:800}
.sheet-close{min-width:48px;min-height:48px;border:none;background:#f1f5f9;border-radius:12px;font-size:22px;font-weight:700;color:var(--m)}
.sheet-list{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1}
.sheet-list .toc-link{border-radius:12px;margin-bottom:6px;border:1px solid var(--b);font-size:16px;padding:14px 16px;min-height:56px}
</style>
</head>
<body>
<div class="app">
<header class="top">
<h1>100 clienți test</h1>
<p>Rezervare pe card · header sau CHECK-IN = detalii</p>
<div class="role-pills">
<div class="role-pill"><strong>Pe card</strong>Date rezervare (public)</div>
<div class="role-pill"><strong>Check-in</strong>Apasă bara verde CHECK-IN</div>
</div>
</header>
<div class="main">
<div class="page-bar">
<div class="page-tabs" role="tablist">
<button type="button" class="page-tab on" data-page="1" role="tab">Pagina 1<span>${esc(page1Letter)}…${esc(page1End)} · 1–50</span></button>
<button type="button" class="page-tab" data-page="2" role="tab">Pagina 2<span>${esc(page2Letter)}…${esc(page2End)} · 51–100</span></button>
</div>
<div class="batch-row">
<span>Deschide check-in</span>
<div class="batch-btns">
<button type="button" data-batch="10">10</button>
<button type="button" data-batch="25">25</button>
<button type="button" data-batch="50" class="on">50</button>
</div>
</div>
<p class="page-info" id="pageInfo">Pagina 1 · 50 clienți</p>
</div>
<div class="cards" id="list">${cards}</div>
</div>
</div>
<div class="toolbar">
<div class="mode-bar">
<span>Eu fac</span>
<button type="button" id="modeRez" class="mode-rez on">Rezervare</button>
<button type="button" id="modeChk" class="mode-chk">Check-in</button>
</div>
<input type="search" id="q" placeholder="Nume, prenume sau email…" enterkeyhint="search" autocomplete="off">
<div class="toolbar-actions">
<button type="button" id="col">Închide</button>
<button type="button" id="ff">Fraudă</button>
<button type="button" id="idxBtn">Index</button>
</div>
</div>
<div class="toast" id="toast">Copiat!</div>
<div class="sheet" id="indexSheet" aria-hidden="true">
<div class="sheet-bg" id="sheetBg"></div>
<div class="sheet-panel">
<div class="sheet-head"><h2>Index alfabetic</h2><button type="button" class="sheet-close" id="sheetClose" aria-label="Închide">×</button></div>
<nav class="sheet-list" id="sheetList">${toc}</nav>
</div>
</div>
<script>
const list=document.getElementById('list');
const toast=document.getElementById('toast');
const pageInfo=document.getElementById('pageInfo');
let toastT,fraudOnly=false,globalRole='rez',currentPage=1,batchSize=50,searchActive=false;

function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function cardMatches(card,q){
  if(!q)return true;
  const last=norm(card.dataset.last);
  const first=norm(card.dataset.first);
  const email=norm(card.dataset.email);
  const blob=norm(card.dataset.search);
  return last.includes(q)||first.includes(q)||email.includes(q)||blob.includes(q);
}
function cardsVisible(){return cardsAll().filter(c=>!c.hidden);}
function cardsPageVisible(){return cardsVisible().filter(c=>+c.dataset.page===currentPage);}

function cardsAll(){return[...list.querySelectorAll('.card')];}

function setCardOpen(card,open){
  card.classList.toggle('open',open);
  const bar=card.querySelector('.card-chk-bar');
  if(bar)bar.setAttribute('aria-expanded',open?'true':'false');
}
function applyGlobalRole(role){
  globalRole=role;
  document.getElementById('modeRez').classList.toggle('on',role==='rez');
  document.getElementById('modeChk').classList.toggle('on',role==='chk');
  if(role==='chk')expandBatch(batchSize);
  else cardsAll().forEach(c=>setCardOpen(c,false));
}
function showToast(msg){toast.textContent=msg||'Copiat!';toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),1500);}
function updatePageInfo(){
  const vis=searchActive?cardsVisible():cardsPageVisible();
  const open=vis.filter(c=>c.classList.contains('open')).length;
  if(searchActive){pageInfo.textContent='Căutare · '+vis.length+' găsiți · '+open+' deschise';return;}
  pageInfo.textContent='Pagina '+currentPage+' · '+vis.length+' clienți · '+open+' deschise';
}
function applyPage(){
  document.querySelectorAll('.page-tab').forEach(b=>b.classList.toggle('on',+b.dataset.page===currentPage));
  applyFilters();
  expandBatch(globalRole==='chk'?batchSize:0);
  window.scrollTo({top:0,behavior:'smooth'});
}
function applyFilters(){
  const q=norm(document.getElementById('q').value);
  searchActive=!!q;
  cardsAll().forEach(c=>{
    const matchQ=cardMatches(c,q);
    const matchF=!fraudOnly||c.dataset.fraud==='1';
    const matchPage=searchActive||+c.dataset.page===currentPage;
    c.hidden=!(matchQ&&matchF&&matchPage);
  });
  document.querySelectorAll('.page-tab').forEach(b=>{
    if(!searchActive){b.classList.remove('has-hit');return;}
    const pg=+b.dataset.page;
    const hits=cardsAll().filter(c=>+c.dataset.page===pg&&cardMatches(c,q)&&(!fraudOnly||c.dataset.fraud==='1')).length;
    b.classList.toggle('has-hit',hits>0);
  });
  updatePageInfo();
}
function expandBatch(n){
  document.querySelectorAll('.batch-btns button').forEach(b=>b.classList.toggle('on',+b.dataset.batch===n));
  batchSize=n;
  const vis=searchActive?cardsVisible():cardsPageVisible();
  vis.forEach((c,i)=>setCardOpen(c,globalRole==='chk'&&i<n));
  updatePageInfo();
}
document.querySelectorAll('.page-tab').forEach(b=>b.onclick=()=>{currentPage=+b.dataset.page;applyPage();});
document.querySelectorAll('.batch-btns button').forEach(b=>b.onclick=()=>expandBatch(+b.dataset.batch));
document.getElementById('modeRez').onclick=()=>applyGlobalRole('rez');
document.getElementById('modeChk').onclick=()=>applyGlobalRole('chk');
document.getElementById('col').onclick=()=>{cardsAll().forEach(c=>setCardOpen(c,false));updatePageInfo();};
document.getElementById('ff').onclick=function(){fraudOnly=!fraudOnly;this.classList.toggle('on',fraudOnly);applyFilters();};
document.getElementById('idxBtn').onclick=()=>{
  const sheet=document.getElementById('indexSheet');
  sheet.querySelectorAll('.toc-link').forEach(a=>{a.hidden=+a.dataset.page!==currentPage;});
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');
};
document.getElementById('sheetClose').onclick=closeSheet;
document.getElementById('sheetBg').onclick=closeSheet;
function closeSheet(){document.getElementById('indexSheet').classList.remove('open');document.getElementById('indexSheet').setAttribute('aria-hidden','true');}
document.getElementById('sheetList').addEventListener('click',e=>{
  const a=e.target.closest('.toc-link');if(!a)return;e.preventDefault();
  closeSheet();
  const id=a.getAttribute('href').slice(1);
  const card=document.getElementById(id);
  if(!card)return;
  if(+card.dataset.page!==currentPage){currentPage=+card.dataset.page;applyPage();}
  setTimeout(()=>{setCardOpen(card,true);card.scrollIntoView({behavior:'smooth',block:'start'});updatePageInfo();},120);
});
function toggleCard(card){
  if(!card||card.hidden)return;
  setCardOpen(card,!card.classList.contains('open'));
  updatePageInfo();
}
document.getElementById('q').oninput=applyFilters;
list.addEventListener('click',e=>{
  const copyEl=e.target.closest('[data-copy]');
  if(copyEl){
    e.stopPropagation();
    const t=copyEl.getAttribute('data-copy')||'';
    const fb=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('Copiat!');}catch(err){showToast('Apasă lung');}document.body.removeChild(ta);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>showToast('Copiat!')).catch(fb);else fb();
    return;
  }
  const bar=e.target.closest('.card-chk-bar');
  if(bar){
    e.preventDefault();
    toggleCard(bar.closest('.card'));
    return;
  }
  const top=e.target.closest('.card-top');
  if(top){
    toggleCard(top.closest('.card'));
    return;
  }
});
applyPage();
</script>
</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const rawClients = buildClients();

const clients = rawClients.map((c) => ({
  ...c,
  check_in: stripInternal(c.check_in),
}));

const roCount = clients.filter((c) => c.cetatenie_cod === "RO").length;
const foreignCount = clients.length - roCount;

const meta = {
  version: "2.0.0",
  generated_at: new Date().toISOString(),
  count: clients.length,
  distributie: {
    romania: { count: roCount, procent: "76%" },
    straini: { count: foreignCount, procent: "24%", cate_per_tara: 3, tari: FOREIGN.map((f) => f.code) },
  },
  structura: {
    cerere_publica: "Date pentru pagina publică /calendar — rezervare",
    check_in: "Date pentru admin: acceptare + tab Identitate la check-in (null = completezi tot la check-in)",
  },
  tipuri_persoane: ["single", "cuplu", "familie", "grup"],
  suprapuneri: {
    "CLUSTER-A": clients.filter((c) => c.suprapunere === "CLUSTER-A").map((c) => c.id),
    "CLUSTER-B": clients.filter((c) => c.suprapunere === "CLUSTER-B").map((c) => c.id),
  },
  doc_types: ["ci", "passport", "foreign_id", "other"],
  test_catalog: buildTestCatalog(clients),
};

mkdirSync(OUT_DIR, { recursive: true });

const payload = { meta, clients };
writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
writeFileSync(OUT_MD, renderMarkdown(rawClients, meta), "utf8");
writeFileSync(OUT_HTML, renderHtml(rawClients, meta), "utf8");

console.log(`✓ ${clients.length} clienți → ${OUT_JSON}`);
console.log(`✓ Ghid manual → ${OUT_MD}`);
console.log(`✓ HTML compact → ${OUT_HTML}`);
console.log(`  RO: ${roCount} · Străini: ${foreignCount}`);
