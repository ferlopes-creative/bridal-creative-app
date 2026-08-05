import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CsvImportRow = {
  name: string;
  description: string;
  price: number | null;
  promo_price: number | null;
  type: "PRO" | "BON";
  link_compra: string;
};

function normalizeHeader(h: string) {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text: string): { rows: CsvImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["Planilha vazia ou sem linhas de dados."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const findCol = (...candidates: string[]) => headers.findIndex((h) => candidates.includes(h));

  const nameIdx = findCol("nome", "name", "titulo", "produto");
  const descIdx = findCol("descricao", "description");
  const priceIdx = findCol("preco", "price", "valor");
  const promoIdx = findCol("preco promocional", "preco_promocional", "promo_price", "valor promocional");
  const typeIdx = findCol("tipo", "type");
  const linkIdx = findCol("link", "link_compra", "checkout", "url");

  if (nameIdx === -1) {
    return {
      rows: [],
      errors: ['Coluna "nome" (ou "name"/"título") não encontrada no cabeçalho do arquivo.'],
    };
  }

  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const name = (cols[nameIdx] || "").trim();
    if (!name) {
      errors.push(`Linha ${i + 1}: sem nome, foi ignorada.`);
      continue;
    }
    const priceRaw = priceIdx >= 0 ? (cols[priceIdx] || "").trim() : "";
    const promoRaw = promoIdx >= 0 ? (cols[promoIdx] || "").trim() : "";
    const parsedPrice = priceRaw ? Number(priceRaw.replace(",", ".")) : NaN;
    const parsedPromo = promoRaw ? Number(promoRaw.replace(",", ".")) : NaN;
    const typeRaw = (typeIdx >= 0 ? (cols[typeIdx] || "").trim().toUpperCase() : "") || "PRO";

    rows.push({
      name,
      description: descIdx >= 0 ? (cols[descIdx] || "").trim() : "",
      price: Number.isFinite(parsedPrice) ? parsedPrice : null,
      promo_price: Number.isFinite(parsedPromo) ? parsedPromo : null,
      type: typeRaw === "BON" ? "BON" : "PRO",
      link_compra: linkIdx >= 0 ? (cols[linkIdx] || "").trim() : "",
    });
  }

  return { rows, errors };
}

function errorMessage(err: unknown): string {
  const raw = err && typeof err === "object" && "message" in err ? (err as { message: unknown }).message : err;
  return String(raw).toLowerCase();
}

const CSV_TEMPLATE =
  "nome,descricao,preco,preco_promocional,tipo,link\n" +
  "Kit Convites Premium,Descrição do produto,97.00,67.00,PRO,https://exemplo.com/checkout\n";

function downloadCsvTemplate() {
  const blob = new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-produtos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ProductCsvImport({ onImported }: { onImported: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (file: File) => {
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const { rows: parsedRows, errors } = parseCsvText(text);
      setRows(parsedRows);
      setParseErrors(errors);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);

    const flags = { includePrice: true, includeIsHidden: true };
    let imported = 0;
    let failed = 0;
    const chunkSize = 50;

    const buildPayload = (chunk: CsvImportRow[]) =>
      chunk.map((row) => {
        const base: Record<string, unknown> = {
          name: row.name,
          description: row.description || null,
          type: row.type,
          link_compra: row.link_compra || null,
        };
        if (flags.includePrice) {
          base.price = row.price;
          base.promo_price = row.promo_price;
        }
        if (flags.includeIsHidden) {
          base.is_hidden = true;
        }
        return base;
      });

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      let error: unknown = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        ({ error } = await supabase.from("products").insert(buildPayload(chunk)));
        if (!error) break;
        const msg = errorMessage(error);
        if (flags.includePrice && (msg.includes("price") || msg.includes("promo_price"))) {
          flags.includePrice = false;
          continue;
        }
        if (flags.includeIsHidden && msg.includes("is_hidden")) {
          flags.includeIsHidden = false;
          continue;
        }
        break;
      }

      if (error) {
        failed += chunk.length;
      } else {
        imported += chunk.length;
      }
    }

    setImporting(false);
    setResult({ imported, failed });
    if (imported > 0) onImported();
  };

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-800">Importar produtos via planilha</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Arquivo .csv com colunas: nome, descricao, preco, preco_promocional, tipo, link.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsvTemplate}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar modelo
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
        />
      </div>

      {parseErrors.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-700">
          {parseErrors.map((err, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-600">
            {fileName} — {rows.length} {rows.length === 1 ? "produto pronto" : "produtos prontos"} para
            importar:
          </p>
          <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white">
            <ul className="divide-y divide-zinc-100 text-xs">
              {rows.slice(0, 20).map((row, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-zinc-800">{row.name}</span>
                  <span className="shrink-0 text-zinc-400">{row.type}</span>
                  {row.price != null && (
                    <span className="shrink-0 text-zinc-500">R$ {row.price.toFixed(2)}</span>
                  )}
                </li>
              ))}
              {rows.length > 20 && (
                <li className="px-3 py-1.5 text-zinc-400">e mais {rows.length - 20}…</li>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#6B705C] px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importando..." : `Importar ${rows.length} produtos`}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {result && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs ${
            result.failed > 0 ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {result.imported} {result.imported === 1 ? "produto importado" : "produtos importados"}
          {result.failed > 0 ? ` — ${result.failed} falharam.` : ". Novos produtos entram ocultos por padrão até você revisar e publicar."}
        </p>
      )}
    </div>
  );
}
