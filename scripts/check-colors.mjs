// Fails if a component uses a colour that isn't a theme token.
// All colours must come from src/styles/theme.css (light + dark), so dark mode can't miss anything.
// Usage: npm run lint:colors
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..", "src");
const SKIP = [join(ROOT, "generated"), join(ROOT, "styles")]; // Prisma output + the token file itself

const UTIL = "(?:bg|text|border|ring|fill|stroke|shadow|outline|from|via|to|decoration|divide|accent|caret|placeholder)";
const PALETTE =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const RULES = [
  // A colour value anywhere inside the brackets (sizes like ring-[3px] / text-[11px] are fine).
  { name: "arbitrary colour class", re: new RegExp(`\\b${UTIL}-\\[[^\\]\\s]*?(?:#[0-9a-fA-F]{3}|rgba?\\(|hsla?\\(|oklch\\(|lab\\(|lch\\(|var\\()[^\\]\\s]*\\]`, "g") },
  { name: "Tailwind palette colour", re: new RegExp(`\\b${UTIL}-${PALETTE}-\\d{2,3}\\b`, "g") },
  { name: "white/black colour class", re: new RegExp(`\\b${UTIL}-(?:white|black)\\b`, "g") },
  { name: "raw colour literal", re: /["'`](?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch)\([^"'`]*\))["'`]/g },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.some((s) => p === s || p.startsWith(s + sep))) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css)$/.test(name)) yield p;
  }
}

let problems = 0;
for (const file of files(ROOT)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // Explicit, reviewed exceptions only: put "check-colors-ignore-next-line: <why>" on the line above.
    if (i > 0 && lines[i - 1].includes("check-colors-ignore-next-line")) return;
    for (const { name, re } of RULES) {
      for (const m of line.matchAll(re)) {
        problems++;
        console.log(`${relative(process.cwd(), file)}:${i + 1}  ${name}: ${m[0]}`);
      }
    }
  });
}

if (problems) {
  console.error(`\n${problems} colour(s) outside the theme tokens. Add a token in src/styles/theme.css instead.`);
  process.exit(1);
}
console.log("Colours OK: every colour comes from src/styles/theme.css.");
