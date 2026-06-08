#!/usr/bin/env node
/**
 * Sync missing i18n keys across ro (source), en, bg.
 * Usage: node scripts/sync-i18n-parity.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.join(__dirname, "..", "messages");
const DRY_RUN = process.argv.includes("--dry-run");

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function setNested(obj, dotKey, value) {
  const parts = dotKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== "object" || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Bulgarian translations for keys present in en/ro but missing in bg */
const BG_FROM_EN = {
  "admin.activity.activity.undone": "Действието е отменено",
  "admin.activity.occupancy.block_created": "Блокиране на стая",
  "admin.activity.occupancy.hold_created": "Hold на стая",
  "admin.activity.undo": "Отмени",
  "admin.activity.undoConfirm":
    "Отменяш това действие? Предишното състояние ще бъде възстановено, когато е възможно.",
  "admin.activity.undoFailed": "Отмяната не успя.",
  "admin.activity.undoFailedTitle": "Не може да се отмени",
  "admin.activity.undoMissingId": "Събитието не е намерено.",
  "admin.activity.undoNotAllowed":
    "Това действие вече не може да се отмени (изтекло или вече отменено).",
  "admin.activity.undoPending": "Отмяна…",
  "admin.activity.undoStateChanged": "Данните са се променили междувременно — отмяната не е безопасна.",
  "admin.activity.undoSuccessMessage": "Предишното състояние е възстановено.",
  "admin.activity.undoSuccessTitle": "Действието е отменено",
  "admin.activity.undoneBadge": "Отменено",
  "admin.common.catalogSqlHint": "за типове и опции в Supabase SQL Editor",
  "admin.common.checkIn": "Check-in",
  "admin.common.checkInHour": "Check-in (час)",
  "admin.common.checkOutHour": "Check-out (час)",
  "admin.common.emDash": "—",
  "admin.common.extraBedsCap": "Лимит допълнителни легла (цял обект)",
  "admin.common.factoryResetSubtitle": "Factory reset — само staging / dev",
  "admin.common.modularCatalog": "Модулен каталог",
  "admin.common.moveRoomIntroHtml":
    "От <strong>{room}</strong> — ако престоят не е започнал, преместваме целия престой; иначе разделяме сегментите.",
  "admin.common.newBuildingHint":
    "Нови стаи могат да се добавят след създаването. Цветът се вижда в календара.",
  "admin.common.roomGridDesc": "Статус за {date} — натисни стая за детайли.",
  "admin.common.roomsPending": "Стаи без checkout днес",
  "admin.common.staffAccounts": "Staff акаунти",
  "admin.domains.addCustomTitle": "Добави собствен домейн",
  "admin.domains.addDomain": "Добави домейн",
  "admin.domains.adding": "Добавяне…",
  "admin.domains.backToSettings": "← Назад към настройки",
  "admin.domains.dnsHint":
    "При регистратора: CNAME към cname.vercel-dns.com, после добави домейна в Vercel → Domains.",
  "admin.domains.errors.admin_only": "Само администратори могат да управляват домейни.",
  "admin.domains.errors.domain_taken": "Домейнът вече се използва.",
  "admin.domains.errors.error": "Грешка. Опитай отново.",
  "admin.domains.errors.invalid_domain": "Невалиден домейн.",
  "admin.domains.errors.plan_not_allowed": "Планът ти не включва този режим.",
  "admin.domains.errors.reserved_domain": "Не можеш да използваш домейна на платформата Hospira.",
  "admin.domains.hospiraSubdomain": "Hospira поддомейн (по подразбиране, винаги активен)",
  "admin.domains.hospiraSubdomainHint": "Публичен сайт, календар за резервации и админ.",
  "admin.domains.kinds.custom_brand": "Собствен — само начална страница; останалото на поддомейн",
  "admin.domains.kinds.custom_full": "Собствен — сайт + админ + резервации",
  "admin.domains.kinds.custom_public": "Собствен — сайт + резервации; админ на Hospira",
  "admin.domains.kinds.hospira_subdomain": "Hospira поддомейн (пълно приложение)",
  "admin.domains.markVerified": "Маркирай като верифициран (след DNS + Vercel)",
  "admin.domains.openSite": "Отвори сайта",
  "admin.domains.pageDescription": "Hospira поддомейн и собствени домейни (всички режими).",
  "admin.domains.pageTitle": "Домейни",
  "admin.domains.remove": "Премахни",
  "admin.domains.routingKind": "Режим на показване",
  "admin.domains.statusPending": "Изчаква DNS / SSL",
  "admin.domains.statusVerified": "Верифициран",
  "admin.domains.upgradeForCustom": "Собствен домейн: наличен от план Professional.",
  "admin.gantt.aria15Days": "15 дни",
  "admin.gantt.ariaOneDay": "един ден",
  "admin.gantt.ariaOneMonth": "един месец",
  "admin.gantt.ariaOneQuarter": "едно тримесечие",
  "admin.gantt.ariaOneWeek": "една седмица",
  "admin.gantt.step15Days": "Стъпка 15 дни",
  "admin.gantt.stepQuarter": "Стъпка 1 тримесечие",
  "admin.home.capacityHint":
    "Месечен капацитет = активни стаи × дни в месеца. Пример: {rooms} стаи × {days} дни = {total} възможни нощувки.",
  "admin.home.checkInToday": "Check-in днес ({time})",
  "admin.home.checkOutToday": "Check-out днес ({time})",
  "admin.home.departureGuest": "Напускане: {name}",
  "admin.home.occupancyPctHint":
    "Процент от възможните нощувки този месец ({rooms} стаи × {days} дни). 100% = пълни всяка нощ.",
  "admin.home.revenueHint":
    "Сума от общите цени при потвърждение за престои в текущия месец.",
  "admin.home.roomNightHint":
    "Всяка заета стая за една нощ = 1 нощувка. 2 стаи × 4 нощи = 8 нощувки. Само потвърдени резервации.",
  "admin.home.roomsToCleanHint": "След напускане на госта, преди следващия check-in.",
  "admin.home.roomsToCleanTitle": "Стаи за почистване",
  "admin.locationStructure.activateRoom": "Активирай",
  "admin.locationStructure.deactivateRoom": "Деактивирай",
  "admin.locationStructure.deleteRoomConfirm":
    "Изтриваш стая {name}? Действието е необратимо, ако няма резервации.",
  "admin.login.noTenantLinked":
    "Няма обект, свързан с този акаунт. Създай от Регистрация или свържи се с поддръжката.",
  "admin.login.notMemberOfPension":
    "Този акаунт няма достъп до този обект. Използвай правилния поддомейн или се свържи със собственика.",
  "admin.login.usernameOrEmailPlaceholder": "Admin, Operator или staff email",
  "admin.pages.buildings.addBuilding": "+ Добави сграда",
  "admin.pages.buildings.buildingFloorsTitle": "{name} — етажи и стаи",
  "admin.pages.buildings.listDescription":
    "Избери дата — виж свободни / заети стаи по сграда и в мрежата.",
  "admin.pages.buildings.listTitle": "Сгради — Hospira",
  "admin.pages.buildings.newHint":
    "Можеш да добавиш <strong>нови стаи</strong> след създаването. Цветът се вижда в календара.",
  "admin.pages.buildings.newTitle": "Нова сграда — Hospira",
  "admin.pages.buildings.noBuildings": "Все още няма сгради — добави първата с бутона по-горе.",
  "admin.pages.buildings.unknownError": "Неизвестна грешка",
  "admin.pages.disponibilitate.description":
    "Heat map, KPI, свободни уикенди, филтър сграда, Shift+click интервал, live обновяване.",
  "admin.pages.disponibilitate.title": "Наличност — Hospira",
  "admin.pages.invoice.title": "Информативен документ",
  "admin.pages.location.checkInHour": "Check-in (час)",
  "admin.pages.location.checkOutHour": "Check-out (час)",
  "admin.pages.location.extraBedsCap": "Лимит допълнителни легла (цял обект)",
  "admin.pages.location.factoryResetSubtitle": "Factory reset — само staging / dev",
  "admin.pages.location.modularCatalog": "Модулен каталог",
  "admin.pages.location.staffAccounts": "Staff акаунти",
  "admin.pages.roomsNew.catalogHint":
    "Стартирай <code>015_room_catalog.sql</code> в Supabase SQL Editor за типове и",
  "admin.pages.settings.domainsPanelInfo": "Избери как гостите виждат обекта онлайн.",
  "admin.pages.settings.domainsSubtitle": "Hospira поддомейн и собствен домейн",
  "admin.pages.settings.domainsTitle": "Домейни и сайт",
  "admin.pages.settings.locationPanelInfoOwner":
    "Като собственик имаш постоянен достъп до структура, стаи и каталог.",
  "admin.pages.settings.locationSubtitleOwner": "Пълен достъп — без допълнителна парола",
  "admin.pages.settings.openDomainsManagement": "Управление на домейни",
  "admin.pages.settings.roleOwner": "Собственик",
  "admin.pages.settingsLocation.unlock.ownerPassword": "Парола на собственика",
  "admin.pages.statistics.confirmedCompareCaption": "Потвърдени резервации с престой в тази година",
  "admin.pages.statistics.confirmedCompareTitle": "Потвърдени престои — сравнение по години",
  "admin.pages.statistics.dateRangeMeta":
    "Период: {first}–{last} · {rooms} активни стаи (референция) · обновено {at}",
  "admin.pages.statistics.occupancyCompareCaption": "Процент от годишния капацитет (активни стаи × дни)",
  "admin.pages.statistics.occupancyCompareTitle": "Заетост на стаи — сравнение по години",
  "admin.roomForm.namePrefixEmptyHint": "Празно = само числа (1, 2, 3 …)",
  "admin.roomForm.namePrefixOptional": "Префикс (по избор)",
  "admin.roomForm.namePrefixPlaceholder": "Стая или остави празно",
  "admin.roomForm.roomNamePlaceholderPlain": "напр. 1 или Стая 1",
  "admin.serverActions.bulkDuplicateNames": "Тези имена на стаи вече съществуват на същия етаж: {names}",
  "admin.serverActions.floorBuildingMismatch":
    "Избраният етаж не принадлежи на избраната сграда. Презареди страницата и опитай отново.",
  "admin.serverActions.noTenantLinked":
    "Няма обект, свързан с този акаунт. Създай от Регистрация или свържи се с поддръжката.",
  "admin.serverActions.notMemberOfPension": "Този акаунт няма достъп до този обект.",
  "admin.serverActions.ownerPasswordIncorrect": "Невалидна парола на собственика",
  "admin.serverActions.roomActivated": "Стаята е реактивирана",
  "admin.serverActions.roomDeactivated": "Стаята е маркирана като неактивна",
  "admin.serverActions.roomTypeConstraint":
    "Типът стая не е съвместим със схемата на базата. Стартирай миграция 050_rooms_room_type_slug.sql в Supabase и опитай отново.",
  "signup.emailStaleOwnerRow":
    "Съществува обект за този email без акаунт за вход. Влез или се свържи с поддръжката.",
};

const RO_PATCH = {
  "admin.common.moveRoomIntroHtml":
    "Din <strong>{room}</strong> — dacă sejurul nu a început, mutăm tot sejurul; altfel împărțim segmentele.",
  "admin.pages.roomsNew.catalogRunMigration": "Rulează migrarea",
  "admin.pages.roomsNew.addBuildingFirst": "Adaugă mai întâi o",
};

const EN_PATCH = {
  "admin.pages.roomsNew.catalogRunMigration": "Run migration",
  "admin.pages.roomsNew.addBuildingFirst": "Add first a",
  "admin.locationStructure.deactivateRoom": "Deactivate",
  "admin.locationStructure.activateRoom": "Activate",
  "admin.locationStructure.deleteRoomConfirm":
    'Delete room "{name}"? This is permanent if it has no bookings.',
};

const locales = ["ro", "en", "bg"];
const files = Object.fromEntries(
  locales.map((loc) => [
    loc,
    JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${loc}.json`), "utf8")),
  ]),
);

const patches = { ro: RO_PATCH, en: EN_PATCH, bg: BG_FROM_EN };

let added = { ro: [], en: [], bg: [] };

for (const loc of locales) {
  const flat = flatten(files[loc]);
  for (const [key, value] of Object.entries(patches[loc] ?? {})) {
    if (!(key in flat)) {
      setNested(files[loc], key, value);
      added[loc].push(key);
    }
  }
}

// bg: also fill any remaining gaps from en with BG map fallback
const flatEn = flatten(files.en);
const flatBg = flatten(files.bg);
for (const key of Object.keys(flatEn)) {
  if (!(key in flatBg)) {
    const value = BG_FROM_EN[key] ?? flatEn[key];
    setNested(files.bg, key, value);
    if (!added.bg.includes(key)) added.bg.push(key);
  }
}

// ro/en: fill from counterpart where still missing (union parity)
const flatRo = flatten(files.ro);
const allKeys = new Set([...Object.keys(flatRo), ...Object.keys(flatEn), ...Object.keys(flatBg)]);
for (const key of allKeys) {
  if (!(key in flatten(files.ro)) && key in flatEn) {
    setNested(files.ro, key, flatEn[key]);
    added.ro.push(key);
  }
  if (!(key in flatten(files.en)) && key in flatRo) {
    // prefer EN_PATCH already applied; skip ro-copy for locationStructure (handled)
    const enVal = EN_PATCH[key] ?? (key.startsWith("admin.") ? flatRo[key] : flatEn[key] ?? flatRo[key]);
    if (!(key in flatten(files.en))) {
      setNested(files.en, key, enVal);
      added.en.push(key);
    }
  }
}

if (!DRY_RUN) {
  for (const loc of locales) {
    const out = path.join(MESSAGES_DIR, `${loc}.json`);
    fs.writeFileSync(out, JSON.stringify(files[loc], null, 2) + "\n", "utf8");
  }
}

function countKeys(obj) {
  return Object.keys(flatten(obj)).length;
}

console.log("=== SYNC RESULT ===");
for (const loc of locales) {
  console.log(`${loc}: ${countKeys(files[loc])} keys, added ${added[loc].length}`);
  added[loc].slice(0, 25).forEach((k) => console.log(`  + ${k}`));
  if (added[loc].length > 25) console.log(`  ... +${added[loc].length - 25} more`);
}

// final parity
const final = Object.fromEntries(locales.map((l) => [l, flatten(files[l])]));
const union = new Set(locales.flatMap((l) => Object.keys(final[l])));
for (const loc of locales) {
  const miss = [...union].filter((k) => !(k in final[loc]));
  console.log(`${loc} still missing: ${miss.length}`);
  if (miss.length) miss.forEach((k) => console.log(`  ! ${k}`));
}
