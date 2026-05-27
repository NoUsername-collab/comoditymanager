/**
 * Rebuild messages/ro.json and messages/bg.json with valid UTF-8.
 * Fixes en.json ASCII mojibake. Does NOT run destructive Cyrillic "fixes".
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "messages");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(
    path.join(root, file),
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Fix common UTF-8 misread as Windows-1252 in English strings only */
function fixAsciiMojibake(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/\u00C2\u00B7/g, "·")
    .replace(/\u00C2\u00A9/g, "©")
    .replace(/\u00E2\u20AC\u201D/g, "—")
    .replace(/\u00E2\u20AC\u00A6/g, "…")
    .replace(/\u00E2\u2020\u2019/g, "→")
    .replace(/\u00E2\u2020\u0090/g, "←")
    .replace(/\u00E2\u20AC\u201C/g, "—")
    .replace(/â€"/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/â†'/g, "→")
    .replace(/â†\u0090/g, "←")
    .replace(/Â·/g, "·")
    .replace(/Â©/g, "©");
}

function walkStrings(obj, fn) {
  if (typeof obj === "string") return fn(obj);
  if (Array.isArray(obj)) return obj.map((v) => walkStrings(v, fn));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = walkStrings(v, fn);
    }
    return out;
  }
  return obj;
}

/** Romanian public + common + errors — clean UTF-8 source */
const roCore = {
  common: {
    save: "Salvează",
    cancel: "Anulează",
    delete: "Șterge",
    edit: "Editează",
    close: "Închide",
    confirm: "Confirmă",
    back: "Înapoi",
    loading: "Se încarcă...",
    error: "A apărut o eroare",
    success: "Succes",
    email: "Email",
    phone: "Telefon",
    optional: "opțional",
    required: "obligatoriu",
  },
  errors: {
    required: "Câmp obligatoriu",
    invalidEmail: "Email invalid",
    invalidPhone: "Telefon invalid",
    dateConflict: "Cameră ocupată în intervalul selectat",
    serverError: "Eroare de server. Încearcă din nou.",
    acceptTerms: "Acceptă termenii și condițiile",
    acceptGdpr: "Acceptă politica de confidențialitate (GDPR)",
    fillRequired: "Completează datele obligatorii",
    minOneNight:
      "Ședere minimă o noapte (check-out după check-in)",
    selectVariant: "Alege o variantă de cazare înainte de trimitere.",
    variantUnavailable:
      "Varianta aleasă nu mai e disponibilă. Actualizează datele și alege din nou.",
    pickDates: "Alege check-in și check-out.",
    previewFailed: "Nu am putut calcula variantele",
  },
  public: {
    shell: { backHome: "Acasă", legalEyebrow: "Legal" },
    header: { subtitle: "Pensiune · Tasnad" },
    nav: {
      mainAria: "Navigare principală",
      home: "Acasă",
      gdpr: "GDPR",
      book: "Rezervare",
    },
    footer: {
      tagline:
        "Cazare liniștită în Tasnad. Cerere online — confirmare personală de la pensiune, fără plată pe site.",
      links: "Linkuri",
      bookingRequest: "Cerere cazare",
      terms: "Termeni și condiții",
      privacy: "Confidențialitate (GDPR)",
      contact: "Contact",
      copyright: "© {year} {name} · Tasnad, România",
    },
    home: {
      badge: "Tasnad · cazare pensiune",
      subtitle:
        "Cazare liniștită pentru familie și concediu scurt. Alegi datele online, primești răspuns personal de la recepție — fără plată automată, fără surprize.",
      tagline: "Cald, simplu, ca acasă — exact cum promite numele.",
      checkTimes: "Check-in de la {checkIn} · Check-out până la {checkOut}",
      ctaBook: "Cere disponibilitate",
      ctaHow: "Cum funcționează",
      whyTitle: "De ce e simplu",
      whyLead: "Trei lucruri clare — fără surprize la plată online.",
      feature1Title: "Camere confortabile",
      feature1Text:
        "Opțiuni cu sau fără aer condiționat, potrivite pentru familii.",
      feature2Title: "Cerere în câteva minute",
      feature2Text:
        "Alegi perioada, vezi variante și preț estimat, apoi trimiți datele.",
      feature3Title: "Confirmare de la pensiune",
      feature3Text:
        "Rezervarea devine fermă doar după ce vă contactăm. Fără plată online.",
      stepsTitle: "Pașii rezervării",
      stepsLead: "De la cerere la sejur confirmat — transparent pentru oaspeți.",
      step1Title: "Alegi perioada",
      step1Text:
        "Completezi datele, număr persoane și vezi variantele disponibile.",
      step2Title: "Reținem provizoriu",
      step2Text:
        "Camerele din varianta aleasă sunt blocate temporar până la răspuns.",
      step3Title: "Confirmăm noi",
      step3Text:
        "Vă contactăm cu prețul final și detaliile check-in / check-out.",
      ctaBandTitle: "Gata să trimiți o cerere?",
      ctaBandText:
        "Durează câteva minute. Dacă perioada nu e liberă, îți spunem imediat — fără cont și fără card.",
      ctaBandButton: "Deschide calendarul",
    },
    calendar: {
      eyebrow: "Rezervare online",
      lead: "Alege perioada, compară variantele și trimite cererea. Pensiunea vă contactează pentru confirmare.",
      asideTitle: "Ce trebuie să știi",
      asideNoPayTitle: "Nu e plată online",
      asideNoPayText: "Prețul afișat e estimativ — confirmăm noi suma finală.",
      asideHoldTitle: "Reținere provizorie",
      asideHoldText: "Camerele din varianta aleasă sunt blocate temporar.",
      asideHoursTitle: "Ore standard",
      asideHoursText: "Check-in {checkIn} · Check-out {checkOut}",
    },
    form: {
      title: "Cerere de cazare",
      checkTimes: "Check-in {checkIn} · Check-out {checkOut}",
      stepDates: "1. Perioadă",
      stepPreview: "2. Variante",
      stepContact: "3. Trimite",
      checkIn: "Check-in *",
      checkOut: "Check-out *",
      adults: "Adulți *",
      children: "Copii",
      previewLoading: "Se calculează…",
      previewButton: "Vezi variante și preț estimat",
      changeDates: "← Schimbă datele",
      continue: "Sunt de acord — continuă",
      summaryTitle: "Rezumat ales",
      estimate: "Estimare {total} RON · {nights} nopți",
      changeVariant: "Schimbă varianta",
      hasMinor: "Am minor însoțitor",
      minorAge: "Vârsta minor",
      minorAgePlaceholder: "ex. 5 ani",
      messageOptional: "Mesaj (opțional)",
      acceptTerms: "Accept <link>termenii și condițiile</link> *",
      acceptGdpr: "Am citit <link>politica de confidențialitate (GDPR)</link> *",
      back: "← Înapoi",
      submitting: "Se trimite…",
      submit: "Trimite cererea",
      successTitle: "Cererea a fost trimisă.",
      successBody:
        "Camerele din varianta aleasă sunt reținute provizoriu. Pensiunea vă contactează pentru confirmare — prețul final poate fi ajustat; nu e plată online.",
      successVariant: "Varianta aleasă: <strong>{title}</strong>",
      lastName: "Nume (familie) *",
      lastNamePlaceholder: "ex. Popescu",
      firstName: "Prenume *",
      firstNamePlaceholder: "ex. Maria",
      noOptions: "Nu există variante pentru perioada aleasă.",
      oneOption: "1 variantă disponibilă",
      manyOptions: "{count} variante disponibile",
      previewMeta:
        "{period} · {guests} pers. · {nights} nopți · estimare — nu e plată online",
      perNight: "{price}/noapte",
      selectOption: "Alege",
      totalEstimateLabel: "total estimat",
      selectedMark: "✓ Varianta aleasă",
    },
    phoneForm: {
      hint: "Rezervare introdusă la recepție (telefon sau walk-in).",
      notesPlaceholder: "ex. sunat la 10:30",
      confirmNow: "Confirmă imediat (fără email oaspete)",
      saving: "Salvez…",
      submit: "Înregistrează cererea",
      saved: "Cerere înregistrată.",
      savedDetail:
        "Cerere salvată. Poți aloca camere mai jos sau din listă.",
      receptionHours: "Recepție · {checkIn} / {checkOut}",
      confirmAllocate: "Merg direct la alocare camere",
      emailOptional: "Email (opț.)",
      notesLabel: "Notițe",
    },
    receptie: {
      confirmedBanner: "Rezervare confirmată.",
      backToSite: "← Site public",
    },
    confirm: {
      backReceptie: "Recepție rapidă",
      title: "Confirmă rapid",
      adminLink: "Administrare",
    },
    terms: {
      title: "Termeni și condiții",
      lead: "Reguli clare pentru cererea de cazare online — ce înseamnă confirmarea de la pensiune.",
      intro:
        "Prin trimiterea unei cereri de rezervare pe site, confirmați că ați citit acești termeni. Rezervarea devine obligatorie doar după confirmarea explicită de către pensiune (email sau telefon).",
      s1Title: "1. Cerere vs. confirmare",
      s1Body:
        "Formularul online creează o <strong>cerere</strong>, nu o rezervare garantată. Camerele din varianta aleasă sunt reținute provizoriu până la răspunsul pensiunii; dacă nu putem confirma, eliberăm perioada. Pensiunea vă contactează pentru prețul final.",
      s2Title: "2. Ședere minimă",
      s2Body:
        "Minim o noapte. Orele de check-in și check-out sunt cele comunicate de pensiune la confirmare.",
      s3Title: "3. Anulare",
      s3Body:
        "Condițiile de anulare sau modificare a sejurului sunt comunicate de pensiune odată cu confirmarea rezervării.",
      s4Title: "4. Contact",
      s4Body: "Casa Emil · Tasnad — <email>contact@casaemil.ro</email>",
    },
    privacy: {
      title: "Politica de confidențialitate",
      lead: "Cum prelucrăm datele trimise prin formularul de cerere de cazare (GDPR).",
      intro:
        "Respectăm Regulamentul (UE) 2016/679 (GDPR). Această pagină descrie cum prelucrăm datele pe care ni le trimiteți prin formularul de cerere de cazare.",
      collectTitle: "Ce date colectăm",
      collect1: "Nume, email, telefon (opțional)",
      collect2: "Date despre sejur (check-in, check-out, număr persoane)",
      collect3: "Mesaj opțional și informații despre minori, dacă le furnizați",
      useTitle: "De ce le folosim",
      useBody:
        "Pentru a răspunde la cererea de cazare, a confirma disponibilitatea și a gestiona rezervarea la pensiune.",
      legalTitle: "Temei legal",
      legalBody:
        "Executarea demersurilor precontractuale la cererea dumneavoastră și interesul legitim al operatorului (art. 6 GDPR).",
      retentionTitle: "Durata păstrării",
      retentionBody:
        "Păstrăm datele pe durata necesară pentru gestionarea rezervării și îndeplinirea obligațiilor legale (contabilitate, fiscalitate).",
      rightsTitle: "Drepturile tale",
      rightsBody:
        "Aveți dreptul de acces, rectificare, ștergere, restricționare, opoziție și portabilitate. Pentru exercitarea drepturilor, scrieți la <email>contact@casaemil.ro</email>.",
    },
    staffPanel: {
      badge: "Staff",
      title: "Recepție rapidă",
      phoneTitle: "Rezervare telefon / walk-in",
      pendingTitle: "De confirmat",
      noRequests: "Nicio cerere nouă.",
      confirm: "Confirmă",
      fullCalendar: "Calendar complet →",
    },
  },
};

/** Bulgarian core — nav + shell + login + public essentials */
const bgCore = {
  common: {
    save: "Запази",
    cancel: "Отмени",
    delete: "Изтрий",
    edit: "Редактирай",
    close: "Затвори",
    confirm: "Потвърди",
    back: "Назад",
    loading: "Зареждане...",
    error: "Възникна грешка",
    success: "Успех",
    email: "Имейл",
    phone: "Телефон",
    optional: "по избор",
    required: "задължително",
  },
  errors: {
    required: "Задължително поле",
    invalidEmail: "Невалиден имейл",
    invalidPhone: "Невалиден телефон",
    dateConflict: "Стаята е заета за избрания период",
    serverError: "Грешка на сървъра. Опитайте отново.",
    acceptTerms: "Приемете общите условия",
    acceptGdpr: "Приемете политиката за поверителност (GDPR)",
    fillRequired: "Попълнете задължителните полета",
    minOneNight:
      "Минимум една нощ (check-out след check-in)",
    selectVariant: "Изберете вариант за настаняване преди изпращане.",
    variantUnavailable:
      "Избраният вариант вече не е наличен. Обновете датите и изберете отново.",
    pickDates: "Изберете check-in и check-out.",
    previewFailed: "Неуспешно зареждане на опциите",
  },
  public: {
    shell: { backHome: "Начало", legalEyebrow: "Правни" },
    header: { subtitle: "Къща за гости · Таснад" },
    nav: {
      mainAria: "Основна навигация",
      home: "Начало",
      gdpr: "Поверителност",
      book: "Резервация",
    },
    footer: {
      tagline:
        "Спокойно настаняване в Таснад. Заявка онлайн — лично потвърждение от къщата, без плащане на сайта.",
      links: "Връзки",
      bookingRequest: "Заявка за престой",
      terms: "Общи условия",
      privacy: "Поверителност (GDPR)",
      contact: "Контакт",
      copyright: "© {year} {name} · Таснад, Румъния",
    },
    home: {
      badge: "Таснад · настаняване",
      subtitle:
        "Спокойен престой за семейства и кратки почивки. Избирате дати онлайн, получавате личен отговор от рецепцията — без автоматично плащане.",
      tagline: "Топло и просто, като у дома.",
      checkTimes: "Check-in от {checkIn} · Check-out до {checkOut}",
      ctaBook: "Провери наличност",
      ctaHow: "Как работи",
      whyTitle: "Защо е просто",
      whyLead: "Три ясни точки — без изненади при плащане онлайн.",
      feature1Title: "Удобни стаи",
      feature1Text: "Опции с или без климатик, подходящи за семейства.",
      feature2Title: "Заявка за минути",
      feature2Text:
        "Избирате период, виждате опции и ориентировъчна цена, после изпращате данните.",
      feature3Title: "Потвърждение от нас",
      feature3Text:
        "Резервацията става твърда едва след като се свържем с вас. Без онлайн плащане.",
      stepsTitle: "Стъпки за резервация",
      stepsLead: "От заявка до потвърден престой — прозрачно за гостите.",
      step1Title: "Избирате период",
      step1Text: "Въвеждате дати, брой гости и виждате наличните опции.",
      step2Title: "Временно задържане",
      step2Text: "Стаите от избраната опция се блокират временно до отговор.",
      step3Title: "Потвърждаваме ние",
      step3Text:
        "Свързваме се с вас с крайна цена и детайли за check-in / check-out.",
      ctaBandTitle: "Готови да изпратите заявка?",
      ctaBandText:
        "Отнема няколко минути. Ако няма свободни дати, ще ви кажем веднага — без акаунт и карта.",
      ctaBandButton: "Отвори календара",
    },
    calendar: {
      eyebrow: "Онлайн резервация",
      lead: "Изберете период, сравнете опции и изпратете заявка. Ще се свържем за потвърждение.",
      asideTitle: "Добре да знаете",
      asideNoPayTitle: "Без онлайн плащане",
      asideNoPayText: "Показаните цени са ориентировъчни — потвърждаваме крайната сума.",
      asideHoldTitle: "Временно задържане",
      asideHoldText: "Стаите от избраната опция се блокират временно.",
      asideHoursTitle: "Стандартни часове",
      asideHoursText: "Check-in {checkIn} · Check-out {checkOut}",
    },
    staffPanel: {
      badge: "Екип",
      title: "Бърза рецепция",
      phoneTitle: "Телефон / на място",
      pendingTitle: "За потвърждение",
      noRequests: "Няма нови заявки.",
      confirm: "Потвърди",
      fullCalendar: "Пълен календар →",
    },
  },
};

const bgAdminNav = {
  menuAria: "Админ меню",
  home: "Начало",
  newRequests: "Нови заявки",
  stays: "Престои",
  clients: "Гости",
  calendar: "Календар",
  statistics: "Статистика",
  settings: "Настройки",
};

const bgAdminShell = {
  eyebrow: "Hospira · Control",
  title: "Админ панел",
  publicSite: "Публичен сайт",
};

const bgAdminLogin = {
  eyebrow: "Casa Emil",
  title: "Админ",
  lead: "Само за персонал.",
  backToSite: "← Обратно към сайта",
  username: "Потребител",
  password: "Парола",
  submitting: "Влизане…",
  submit: "Влез в панела",
};

const roAdminNav = {
  menuAria: "Meniu administrare",
  home: "Acasă",
  newRequests: "Cereri noi",
  stays: "Cazări",
  clients: "Clienți",
  calendar: "Calendar",
  statistics: "Statistici",
  settings: "Setări",
};

const roAdminShell = {
  eyebrow: "Hospira · Control",
  title: "Panou administrare",
  publicSite: "Site public",
};

const roAdminLogin = {
  eyebrow: "Casa Emil",
  title: "Admin",
  lead: "Acces doar pentru administrator.",
  backToSite: "← Înapoi la site",
  username: "Utilizator",
  password: "Parolă",
  submitting: "Se conectează…",
  submit: "Intră în panou",
};

// --- Fix en.json ---
let en = readJson("en.json");
en = walkStrings(en, fixAsciiMojibake);
const enPartial = readJson("en-partial-admin.json");
deepMerge(en, enPartial);
writeJson("en.json", en);
console.log("Fixed en.json");

// --- Rebuild ro.json ---
const roPartial = readJson("ro-partial-admin.json");
let ro = clone(en);
deepMerge(ro, roCore);
deepMerge(ro, roPartial);
ro.admin.nav = roAdminNav;
ro.admin.shell = { ...ro.admin.shell, ...roAdminShell };
ro.admin.login = { ...ro.admin.login, ...roAdminLogin };
ro.admin.logout = "Deconectare";
ro.admin.operational = {
  title: "Sosire / plecare (recepție)",
  checkInLabel: "Check-in operațional",
  checkOutLabel: "Check-out operațional",
  notRecorded: "Neînregistrat",
  checkInAction: "Check-in…",
  checkOutAction: "Check-out…",
  undoCheckIn: "Anulează check-in",
  undoCheckOut: "Anulează check-out",
  confirmUndoCheckIn: "Anulezi check-in-ul înregistrat?",
  confirmUndoCheckOut: "Anulezi check-out-ul înregistrat?",
  undoCheckInSuccess: "Check-in anulat",
  undoCheckOutSuccess: "Check-out anulat",
};
writeJson("ro.json", ro);
console.log("Rebuilt ro.json");

// --- Rebuild bg.json ---
const bgPartial = readJson("bg-partial-admin.json");
let bg = clone(en);
deepMerge(bg, bgCore);
deepMerge(bg, bgPartial);
bg.admin.nav = bgAdminNav;
bg.admin.shell = { ...bg.admin.shell, ...bgAdminShell };
bg.admin.login = { ...bg.admin.login, ...bgAdminLogin };
bg.admin.logout = "Изход";
bg.admin.operational = {
  title: "Пристигане / напускане (рецепция)",
  checkInLabel: "Оперативен check-in",
  checkOutLabel: "Оперативен check-out",
  notRecorded: "Не е записано",
  checkInAction: "Check-in…",
  checkOutAction: "Check-out…",
  undoCheckIn: "Отмени check-in",
  undoCheckOut: "Отмени check-out",
  confirmUndoCheckIn: "Отменяте записания check-in?",
  confirmUndoCheckOut: "Отменяте записания check-out?",
  undoCheckInSuccess: "Check-in отменен",
  undoCheckOutSuccess: "Check-out отменен",
};
writeJson("bg.json", bg);
console.log("Rebuilt bg.json");

// Validate Cyrillic/RO diacritics in nav
for (const [loc, file, expect] of [
  ["ro", "ro.json", "Clienți"],
  ["bg", "bg.json", "Календар"],
]) {
  const j = readJson(file);
  const nav = JSON.stringify(j.admin.nav);
  if (!nav.includes(expect)) {
    console.error(`FAIL ${loc}: admin.nav missing ${expect}`);
    process.exit(1);
  }
}
console.log("Validation OK");
