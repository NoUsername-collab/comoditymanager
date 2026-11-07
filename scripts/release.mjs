#!/usr/bin/env node
/**
 * Cut a release: bump the version, add a CHANGELOG entry, commit and tag.
 *
 *   npm run release -- patch          0.9.0 → 0.9.1   fixes
 *   npm run release -- minor          0.9.0 → 0.10.0  new features
 *   npm run release -- major          0.9.0 → 1.0.0   breaking changes
 *   npm run release -- 1.0.0          an exact version
 *   npm run release -- minor --dry-run   print the entry, change nothing
 *
 * The entry lists the commits since the previous tag and the database
 * migrations added since then, which must be applied with the deploy.
 * Nothing is pushed: run `git push origin main --follow-tags` when ready.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bump = args.find((arg) => !arg.startsWith("--"));

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

if (!bump) {
  fail("say which release: patch, minor, major or an exact version like 1.0.0");
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const current = pkg.version;
const semver = /^(\d+)\.(\d+)\.(\d+)$/;
const match = semver.exec(current);
if (!match) fail(`package.json version "${current}" is not x.y.z`);
const [major, minor, patch] = match.slice(1).map(Number);

let next;
if (bump === "patch") next = `${major}.${minor}.${patch + 1}`;
else if (bump === "minor") next = `${major}.${minor + 1}.0`;
else if (bump === "major") next = `${major + 1}.0.0`;
else if (semver.test(bump)) next = bump;
else fail(`unknown release "${bump}"`);

const tag = `v${next}`;
if (git("tag", "--list", tag)) fail(`tag ${tag} already exists`);

// Local tool settings (.claude/) may differ; everything else must be committed.
const dirty = git("status", "--porcelain")
  .split("\n")
  .filter((line) => line && !line.slice(3).startsWith(".claude/"));
if (dirty.length > 0 && !dryRun) {
  fail(`commit or stash these first:\n${dirty.join("\n")}`);
}

let previous = "";
try {
  previous = git("describe", "--tags", "--abbrev=0", "--match", "v*");
} catch {
  previous = "";
}
const range = previous ? `${previous}..HEAD` : "HEAD";

const subjects = git("log", range, "--no-merges", "--format=%s")
  .split("\n")
  .filter(Boolean)
  .filter((subject) => !/^Release v\d/.test(subject));
if (subjects.length === 0) fail(`no commits since ${previous}`);

const migrations = git("diff", "--name-only", "--diff-filter=A", previous || "4b825dc642cb6eb9a060e54bf8d69288fbee4904", "HEAD", "--", "supabase/migrations")
  .split("\n")
  .filter(Boolean)
  .map((file) => file.replace("supabase/migrations/", ""));

const date = new Date().toISOString().slice(0, 10);
const entry = [
  `## ${tag} — ${date}`,
  "",
  migrations.length > 0
    ? `**Database:** apply with this deploy, in order: ${migrations.map((m) => `\`${m}\``).join(", ")}.`
    : "**Database:** no new migrations.",
  "",
  ...subjects.map((subject) => `- ${subject}`),
  "",
].join("\n");

if (dryRun) {
  console.log(`${current} → ${next}${previous ? ` (since ${previous})` : ""}\n`);
  console.log(entry);
  process.exit(0);
}

// The new entry goes above the newest one, under the file's own heading.
const header = "# Changelog\n\nEvery release of Zalmox, newest first. Created by `npm run release`.\n\n";
const existing = existsSync("CHANGELOG.md") ? readFileSync("CHANGELOG.md", "utf8") : header;
const firstEntry = existing.indexOf("\n## ");
const changelog =
  firstEntry === -1
    ? `${existing.trimEnd()}\n\n${entry}`
    : `${existing.slice(0, firstEntry + 1)}${entry}\n${existing.slice(firstEntry + 1)}`;
writeFileSync("CHANGELOG.md", changelog);

pkg.version = next;
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
if (existsSync("package-lock.json")) {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
}

git("add", "CHANGELOG.md", "package.json", "package-lock.json");
git("commit", "-m", `Release ${tag}`);
git("tag", "-a", tag, "-m", tag);

console.log(`Released ${tag} (${current} → ${next}).`);
if (migrations.length > 0) console.log(`Apply with the deploy: ${migrations.join(", ")}`);
console.log("Push when ready: git push origin main --follow-tags");
