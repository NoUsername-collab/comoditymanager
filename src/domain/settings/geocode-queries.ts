/** County abbreviations used on Romanian addresses, for a map search to understand them. */
const RO_COUNTIES: Record<string, string> = {
  AB: "Alba", AR: "Arad", AG: "Argeș", BC: "Bacău", BH: "Bihor", BN: "Bistrița-Năsăud",
  BT: "Botoșani", BV: "Brașov", BR: "Brăila", B: "București", BZ: "Buzău", CS: "Caraș-Severin",
  CL: "Călărași", CJ: "Cluj", CT: "Constanța", CV: "Covasna", DB: "Dâmbovița", DJ: "Dolj",
  GL: "Galați", GR: "Giurgiu", GJ: "Gorj", HR: "Harghita", HD: "Hunedoara", IL: "Ialomița",
  IS: "Iași", IF: "Ilfov", MM: "Maramureș", MH: "Mehedinți", MS: "Mureș", NT: "Neamț",
  OT: "Olt", PH: "Prahova", SM: "Satu Mare", SJ: "Sălaj", SB: "Sibiu", SV: "Suceava",
  TR: "Teleorman", TM: "Timiș", TL: "Tulcea", VS: "Vaslui", VL: "Vâlcea", VN: "Vrancea",
};

function expandCounty(part: string): string {
  const key = part.trim().toUpperCase();
  return RO_COUNTIES[key] ?? part.trim();
}

/** "Str. Principala Nr. 1" → "Strada Principala 1": abbreviations a map search reads better spelled out. */
function plainStreet(street: string): string {
  return street
    .replace(/\b(?:str|strada)\.?\s+/i, "Strada ")
    .replace(/\b(?:nr|numărul|numarul)\.?\s*/gi, "")
    .replace(/\b(?:bl|sc|et|ap)\.?\s*\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The searches to try for an address, from exact to rough: the address as
 * written, then with abbreviations spelled out, then the locality and county
 * alone (marked approximate: the pin lands in the village, not at the door).
 */
export function geocodeQueries(address: string): { query: string; approximate: boolean }[] {
  const text = address.trim();
  if (text.length < 3) return [];
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  const out: { query: string; approximate: boolean }[] = [];
  const add = (query: string, approximate: boolean) => {
    const q = query.replace(/\s+/g, " ").trim();
    if (q.length >= 3 && !out.some((existing) => existing.query === q)) out.push({ query: q, approximate });
  };

  add(text, false);
  if (parts.length >= 2) {
    const [street, ...rest] = parts;
    const place = rest.map((part, i) => (i === rest.length - 1 ? expandCounty(part) : part));
    add([plainStreet(street!), ...place].join(", "), false);
    add(place.join(", "), true);
  }
  return out;
}
