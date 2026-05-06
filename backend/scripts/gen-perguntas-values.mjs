import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PERGUNTAS } from "./embed-perguntas-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function esc(s) {
  return s.replace(/'/g, "''");
}

const rows = PERGUNTAS.map(
  (p) => `(${p.temaOrdem}, ${p.ordem}, N'${esc(p.texto)}', 1)`
);

const out = path.join(__dirname, "_perguntas_values.sqlfrag.txt");
fs.writeFileSync(out, rows.join(",\n"), "utf8");
console.log("Written:", out);
