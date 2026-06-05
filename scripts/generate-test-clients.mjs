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
  return clients;
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

function renderKvTable(rows) {
  return `<table class="kv"><tbody>${rows
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td><code class="copy" tabindex="0" title="Click copiază">${esc(v)}</code></td></tr>`)
    .join("")}</tbody></table>`;
}

function renderHtml(rawClients, meta) {
  const toc = rawClients
    .map((c) => {
      const p = c.cerere_publica;
      const badge = c.suprapunere ? `<span class="b ov">${esc(c.suprapunere)}</span>` : "";
      const cc = c.cetatenie_cod === "RO" ? "ro" : "fx";
      return `<a href="#${c.id}" class="toc-i ${cc}">${c.id}<span class="toc-s">${esc(p.guest_last_name)}</span>${badge}</a>`;
    })
    .join("");

  const cards = rawClients
    .map((c) => {
      const p = c.cerere_publica;
      const ci = c.check_in;
      const pubRows = [
        ["Check-in", p.check_in],
        ["Check-out", p.check_out],
        ["Adulți", p.num_adults],
        ["Copii", p.num_children],
        ...(p.has_minor ? [["Minor", `Da · ${p.minor_age} ani`]] : []),
        ["Nume", p.guest_last_name],
        ["Prenume", p.guest_first_name],
        ["Email", p.guest_email],
        ["Telefon", p.guest_phone],
        ...(p.notes ? [["Mesaj", p.notes]] : []),
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
      ]
        .filter(Boolean)
        .join("");

      const dates = `${p.check_in}→${p.check_out}`;

      return `<details class="c" id="${c.id}">
<summary><span class="cid">${c.id}</span> <span class="name">${esc(p.guest_last_name)} ${esc(p.guest_first_name)}</span> ${tags} <span class="dates">${esc(dates)}</span></summary>
<div class="body">
<p class="sc">${esc(c.test_scenario)}</p>
<div class="cols">
<section><h4>PUBLIC</h4>${renderKvTable(pubRows)}</section>
<section><h4>CHECK-IN</h4>${checkHtml}</section>
</div>
</div>
</details>`;
    })
    .join("\n");

  const clusterA = meta.suprapuneri["CLUSTER-A"].join(", ");
  const clusterB = meta.suprapuneri["CLUSTER-B"].join(", ");

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>100 clienți test — Casa Emil</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--b:#d8dbe0;--t:#1a1d21;--m:#5c6370;--a:#2563eb;--ro:#059669;--fx:#7c3aed;--ov:#dc2626;--f:11px/1.35 system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font:var(--f);color:var(--t);background:var(--bg)}
.wrap{max-width:1200px;margin:0 auto;padding:6px 8px 24px}
.hdr{background:var(--card);border:1px solid var(--b);border-radius:4px;padding:8px 10px;margin-bottom:6px}
.hdr h1{font-size:14px;font-weight:700}
.hdr p{font-size:10px;color:var(--m);margin-top:2px}
.meta{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:10px;color:var(--m);margin-top:4px}
.bar{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;position:sticky;top:0;z-index:10;background:var(--bg);padding:4px 0;border-bottom:1px solid var(--b)}
.bar button,.bar input{font:inherit;font-size:10px;padding:3px 8px;border:1px solid var(--b);border-radius:3px;background:var(--card);cursor:pointer}
.bar input{flex:1;min-width:120px}
.toc{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:2px;margin-bottom:8px}
.toc-i{display:block;font-size:9px;text-align:center;padding:2px 1px;border:1px solid var(--b);border-radius:2px;background:var(--card);color:var(--t);text-decoration:none;line-height:1.2}
.toc-i.ro{border-left:2px solid var(--ro)}
.toc-i.fx{border-left:2px solid var(--fx)}
.toc-s{display:block;color:var(--m);font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c{background:var(--card);border:1px solid var(--b);border-radius:3px;margin-bottom:3px}
.c[open]{border-color:#aab}
.c>summary{cursor:pointer;padding:4px 6px;font-size:10px;list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:4px;user-select:none}
.c>summary::-webkit-details-marker{display:none}
.c>summary::before{content:"▸";font-size:8px;color:var(--m);width:8px}
.c[open]>summary::before{content:"▾"}
.cid{font-weight:700;color:var(--a);min-width:28px}
.name{font-weight:600}
.dates{color:var(--m);font-size:9px;margin-left:auto}
.b{font-size:8px;padding:1px 4px;border-radius:2px;background:#eef0f3;color:var(--m);text-transform:uppercase;letter-spacing:.02em}
.b.ro{background:#d1fae5;color:var(--ro)}
.b.fx{background:#ede9fe;color:var(--fx)}
.b.doc{background:#dbeafe;color:#1d4ed8}
.b.ov{background:#fee2e2;color:var(--ov)}
.b.warn{background:#fef3c7;color:#b45309}
.body{padding:0 6px 6px;border-top:1px solid var(--b)}
.sc{font-size:9px;color:var(--m);padding:4px 0 2px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6px}
@media(max-width:640px){.cols{grid-template-columns:1fr}}
.cols h4{font-size:9px;color:var(--m);margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
.kv{width:100%;border-collapse:collapse;font-size:10px}
.kv th,.kv td{border:1px solid var(--b);padding:1px 4px;vertical-align:top;text-align:left}
.kv th{width:32%;background:#f8f9fa;color:var(--m);font-weight:500;white-space:nowrap}
.kv code.copy{font-family:ui-monospace,monospace;font-size:9px;word-break:break-all;cursor:pointer;background:transparent}
.kv code.copy:hover{background:#eff6ff}
.empty{font-size:9px;color:var(--m);font-style:italic;padding:4px 0}
.note{font-size:9px;color:var(--m);margin-top:6px;padding:6px 8px;background:var(--card);border:1px solid var(--b);border-radius:3px}
@media print{
  :root{--bg:#fff;--f:9px/1.25 system-ui,sans-serif}
  .bar,.toc{display:none}
  .c{break-inside:avoid;margin-bottom:2px}
  .c>summary{padding:2px 4px}
  details.c{display:block}
  details.c>.body{display:block!important}
}
</style>
</head>
<body>
<div class="wrap">
<header class="hdr">
<h1>100 clienți test — Casa Emil</h1>
<p>Public = cerere rezervare · Check-in = identitate admin · Click pe valoare = copiază</p>
<div class="meta">
<span>RO ${meta.distributie.romania.count} (76%)</span>
<span>Străini ${meta.distributie.straini.count} (24%)</span>
<span>CLUSTER-A: ${esc(clusterA)}</span>
<span>CLUSTER-B: ${esc(clusterB)}</span>
<span>${esc(meta.generated_at.slice(0, 10))}</span>
</div>
</header>
<div class="bar">
<input type="search" id="q" placeholder="Caută nume, telefon, ID, cluster…" aria-label="Caută">
<button type="button" id="exp">Deschide tot</button>
<button type="button" id="col">Închide tot</button>
</div>
<nav class="toc" aria-label="Index">${toc}</nav>
<div class="note">Suprapuneri: <strong>CLUSTER-A</strong> (${esc(clusterA)}) aceeași perioadă · <strong>CLUSTER-B</strong> (${esc(clusterB)}) parțial</div>
<main id="list">${cards}</main>
</div>
<script>
const list=document.getElementById('list');
document.getElementById('exp').onclick=()=>list.querySelectorAll('details').forEach(d=>d.open=true);
document.getElementById('col').onclick=()=>list.querySelectorAll('details').forEach(d=>d.open=false);
document.getElementById('q').oninput=e=>{
  const q=e.target.value.toLowerCase().trim();
  list.querySelectorAll('details.c').forEach(d=>{
    d.hidden=q&&!d.textContent.toLowerCase().includes(q);
  });
};
document.body.addEventListener('click',e=>{
  const c=e.target.closest('code.copy');
  if(!c)return;
  navigator.clipboard.writeText(c.textContent).then(()=>{
    c.style.background='#bbf7d0';
    setTimeout(()=>c.style.background='',400);
  });
});
document.body.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const c=e.target.closest('code.copy');
  if(c){e.preventDefault();c.click();}
});
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
