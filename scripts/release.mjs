#!/usr/bin/env node
/**
 * Publishes a new SentUtility version in one command:
 *
 *   npm run release -- 1.1.0 "Linha do Dia nova · correções nos alarmes"
 *
 * It bumps the version everywhere it lives (package.json, tauri.conf.json,
 * Cargo.toml, Cargo.lock), commits, creates an annotated tag whose message
 * becomes the release notes, and pushes. GitHub Actions then builds, signs
 * and publishes the release, and every installed copy updates itself.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [version, ...noteParts] = process.argv.slice(2);
const notes = noteParts.join(" ").trim();

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  fail('Use: npm run release -- <versão> "notas da versão"   (ex.: npm run release -- 1.1.0 "Novidades…")');
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const current = pkg.version;
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
if (!newer(version, current)) fail(`A nova versão (${version}) precisa ser maior que a atual (${current}).`);

if (run("git status --porcelain")) fail("Há alterações não salvas no git. Faça commit (ou descarte) antes de lançar.");
const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") fail(`Lance a partir da branch main (você está em ${branch}).`);
if (run(`git tag -l v${version}`)) fail(`A tag v${version} já existe.`);

const replaceIn = (file, from, to) => {
  const text = readFileSync(file, "utf8");
  const next = text.replace(from, to);
  if (next === text) fail(`Não encontrei a versão para atualizar em ${file}.`);
  writeFileSync(file, next);
};

replaceIn("package.json", `"version": "${current}"`, `"version": "${version}"`);
replaceIn("package-lock.json", /("name": "sentutility",\s*"version": )"[^"]+"/g, `$1"${version}"`);
replaceIn("src-tauri/tauri.conf.json", `"version": "${current}"`, `"version": "${version}"`);
replaceIn("src-tauri/Cargo.toml", /^version = "[^"]+"/m, `version = "${version}"`);
replaceIn("src-tauri/Cargo.lock", /(name = "sentutility"\r?\nversion = )"[^"]+"/, `$1"${version}"`);

const message = notes || `Versão ${version}`;
execSync("git add package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock", { stdio: "inherit" });
execSync(`git commit -m "Versão ${version}"`, { stdio: "inherit" });
execSync(`git tag -a v${version} -F -`, { input: message, stdio: ["pipe", "inherit", "inherit"] });
execSync(`git push origin main --follow-tags`, { stdio: "inherit" });

console.log(`\n✔ v${version} enviada. Acompanhe a publicação em: https://github.com/KaueFSS/SentUtility/actions`);
console.log("  Assim que terminar, todos os computadores com o SentUtility recebem o aviso de atualização.\n");
