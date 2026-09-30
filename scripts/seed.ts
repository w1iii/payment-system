import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CSV_FILE = "Stingers Jersey Payment - NONPLAYERS.csv";

function loadEnv(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env.local — rely on real environment
  }
}

const SIZE_MAP: Record<string, string> = {
  XSMALL: "XS",
  XS: "XS",
  SMALL: "S",
  S: "S",
  M: "M",
  LARGE: "L",
  L: "L",
  XL: "XL",
  XXL: "2XL",
  "2XL": "2XL",
  XXXL: "3XL",
  "3XL": "3XL",
  XXXXL: "4XL",
  "4XL": "4XL",
};

function normSize(raw: string): string | null {
  const v = raw.trim();
  if (!v || v === "—") return null;
  return SIZE_MAP[v.toUpperCase()] ?? v.toUpperCase();
}

function normNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v || v === "—" || v === "-") return null;
  return v;
}

interface OrderRow {
  name: string;
  jersey_number: string | null;
  size: string | null;
  jersey_name: string | null;
  status: "paid" | "unpaid";
  note: string | null;
}

function isSizeToken(v: string): boolean {
  return v.trim().toUpperCase() in SIZE_MAP;
}

function parseCsv(text: string): OrderRow[] {
  const rows: OrderRow[] = [];
  const lines = text.split("\n").slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",").map((c) => c.trim());
    const [name, c2, c3, jerseyName, statusRaw, noteRaw] = cols;

    if (!name) continue;

    // Data order is Name,Number,Size — but last two rows are Name,Size,Number.
    let numberCol = c2;
    let sizeCol = c3;
    if (isSizeToken(c2) && /^\d+$/.test(c3)) {
      numberCol = c3;
      sizeCol = c2;
    }

    const status = statusRaw.toLowerCase();
    if (status !== "paid" && status !== "unpaid") {
      throw new Error(`Unexpected status "${statusRaw}" for ${name}`);
    }

    rows.push({
      name,
      jersey_number: normNumber(numberCol),
      size: normSize(sizeCol),
      jersey_name: jerseyName || null,
      status,
      note: noteRaw || null,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const csv = readFileSync(join(process.cwd(), CSV_FILE), "utf8");
  const rows = parseCsv(csv);
  console.log(`Parsed ${rows.length} rows from ${CSV_FILE}`);

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { count } = await db
    .from("jersey_orders")
    .select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`jersey_orders already has ${count} rows — aborting seed.`);
    return;
  }

  const { error } = await db.from("jersey_orders").insert(rows);
  if (error) throw error;

  const { count: finalCount } = await db
    .from("jersey_orders")
    .select("id", { count: "exact", head: true });
  const { count: paidCount } = await db
    .from("jersey_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid");
  const { count: unpaidCount } = await db
    .from("jersey_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "unpaid");

  console.log(
    `Seeded ${finalCount} rows (paid: ${paidCount}, unpaid: ${unpaidCount}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
