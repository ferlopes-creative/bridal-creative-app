export type LegacyPurchaseLine = {
  line: number;
  email: string;
  productId: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Uma compra por linha: `email,product_id` (vírgula, ponto-e-vírgula ou tab). Linhas vazias e `#` são ignoradas. */
export function parseLegacyPurchaseLines(text: string): {
  lines: LegacyPurchaseLine[];
  errors: string[];
} {
  const lines: LegacyPurchaseLine[] = [];
  const errors: string[] = [];
  const rawLines = text.split(/\r?\n/);

  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    let line = rawLines[i].trim();
    if (!line || line.startsWith("#")) continue;

    const hashIdx = line.indexOf("#");
    if (hashIdx > 0) {
      line = line.slice(0, hashIdx).trim();
      if (!line) continue;
    }

    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`Linha ${lineNo}: use o formato email,product_id`);
      continue;
    }

    const email = parts[0].toLowerCase();
    const productId = parts[1];

    if (!isValidEmail(email)) {
      errors.push(`Linha ${lineNo}: e-mail inválido`);
      continue;
    }

    lines.push({ line: lineNo, email, productId });
  }

  return { lines, errors };
}
