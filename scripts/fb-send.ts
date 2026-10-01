import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const PROFILE_DIR = join(process.cwd(), ".fb-profile");
const LOGIN_WAIT_MS = 300_000;
const DELAY_MIN_MS = 2_000;
const DELAY_MAX_MS = 6_000;

function loadEnv(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch {
    // rely on real environment
  }
}

function out(...parts: (string | number)[]): void {
  console.log(parts.join("|"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randDelay(): Promise<void> {
  return sleep(
    DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS)),
  );
}

interface Order {
  id: string;
  name: string;
  facebook_url: string | null;
}

function threadUrl(order: Order): string | null {
  const v = order.facebook_url?.trim();
  if (!v) return null;

  if (!/^https?:\/\//i.test(v)) {
    return `https://m.me/${v.replace(/^@/, "")}`;
  }
  if (v.includes("m.me/")) return v;

  const m = v.match(
    /facebook\.com\/(profile\.php\?id=(\d+)|[^/?#]+)|fb\.com\/(profile\.php\?id=(\d+)|[^/?#]+)/i,
  );
  if (m) {
    const id = m[2] || m[4];
    const vanity = m[1] || m[3];
    if (id) return `https://www.facebook.com/messages/t/${id}`;
    if (vanity && !vanity.startsWith("profile.php"))
      return `https://m.me/${vanity}`;
  }
  return v;
}

function nameKey(name: string): string {
  const tokens = name.toLowerCase().split(/\s+/);
  const last = tokens[tokens.length - 1];
  return last.length >= 3 ? last : tokens[0];
}

function nameMatches(haystack: string, name: string): boolean {
  const h = haystack.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return h.includes(nameKey(name));
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

async function waitForLogin(page: import("playwright-core").Page) {
  const onLogin =
    page.url().includes("login") ||
    (await page.locator('input[type="password"]').count()) > 0;
  if (!onLogin) return true;

  out("LOGIN", "waiting", "log-in-in-the-opened-window");
  try {
    await page.waitForURL((u) => !u.toString().includes("login"), {
      timeout: LOGIN_WAIT_MS,
    });
    out("LOGIN", "ok");
    return true;
  } catch {
    out("FAIL", "login-timeout");
    return false;
  }
}

async function openBySearch(
  page: import("playwright-core").Page,
  name: string,
): Promise<string> {
  await page.goto("https://www.facebook.com/messages/", {
    waitUntil: "domcontentloaded",
  });
  if (!(await waitForLogin(page))) return "login-timeout";

  const search = page
    .locator(
      'input[aria-label*="Search" i], input[placeholder*="Search" i], div[contenteditable="true"][aria-label*="Search" i]',
    )
    .first();
  try {
    await search.waitFor({ timeout: 15_000 });
  } catch {
    return "search-box-not-found";
  }
  await search.click();
  await page.keyboard.type(name, { delay: 40 });
  await sleep(2_000);

  const candidates = page.locator(
    '[role="option"], [role="listitem"], [role="link"][tabindex], li div[dir="auto"]',
  );
  const count = await candidates.count();
  for (let i = 0; i < Math.min(count, 20); i++) {
    const el = candidates.nth(i);
    const text = (await el.textContent().catch(() => null)) ?? "";
    if (text && nameMatches(text, name)) {
      await el.click().catch(() => {});
      return "opened";
    }
  }
  return "no-search-match";
}

async function headerLooksRight(
  page: import("playwright-core").Page,
  name: string,
): Promise<"ok" | "mismatch" | "unreadable"> {
  await sleep(1_500);
  const texts = await page
    .locator("h2, h3, [role='banner'] span[dir='auto']")
    .allTextContents()
    .catch(() => [] as string[]);
  const joined = texts.join(" ").trim();
  if (!joined) return "unreadable";
  return nameMatches(joined, name) ? "ok" : "mismatch";
}

async function sendText(
  page: import("playwright-core").Page,
  text: string,
): Promise<"sent" | "composer-not-found"> {
  const composer = page
    .locator('div[contenteditable="true"][role="textbox"]')
    .last();
  try {
    await composer.waitFor({ timeout: 15_000 });
  } catch {
    return "composer-not-found";
  }
  await composer.click();
  await page.keyboard.type(oneLine(text), { delay: 15 });
  await page.keyboard.press("Enter");
  await sleep(1_000);
  return "sent";
}

async function main(): Promise<void> {
  loadEnv();

  const live = process.argv.includes("--live");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SERVICE_ROLE_KEY");

  const db = createClient(url, key, { auth: { persistSession: false } });

  const [{ data: orders, error: oErr }, { data: settings, error: sErr }] =
    await Promise.all([
      db
        .from("jersey_orders")
        .select("id, name, facebook_url")
        .eq("status", "unpaid")
        .order("name", { ascending: true }),
      db.from("settings").select("key, value").in("key", ["message_template"]),
    ]);
  if (oErr) throw oErr;
  if (sErr) throw sErr;

  let list = orders ?? [];
  const idsArg = process.argv.find((a) => a.startsWith("--ids="));
  if (idsArg) {
    const wanted = new Set(idsArg.slice("--ids=".length).split(","));
    list = list.filter((o) => wanted.has(o.id));
  }

  const template =
    (settings ?? []).find((s) => s.key === "message_template")?.value ||
    "Hi {name}! Just a reminder that your Stingers jersey payment is still unpaid. Please settle it at your earliest convenience. Thank you!";

  out("RUN", `mode=${live ? "live" : "dry"}`, `targets=${list.length}`);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1200, height: 850 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(20_000);

  await page.goto("https://www.facebook.com/messages/", {
    waitUntil: "domcontentloaded",
  });
  if (!(await waitForLogin(page))) {
    await context.close();
    process.exit(1);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const total = list.length;
  let i = 0;

  for (const order of list) {
    i++;
    const message = template.replace(/\{name\}/gi, order.name);
    try {
      const url2 = threadUrl(order);
      let how: string;

      if (url2) {
        await page.goto(url2, { waitUntil: "domcontentloaded" });
        how = "url";
        const header = await headerLooksRight(page, order.name);
        if (header === "mismatch") {
          out("SKIP", order.id, order.name, "header-name-mismatch");
          skipped++;
          out("PROGRESS", i, total);
          continue;
        }
        if (header === "ok") how = "url+verified";
        else out("VERIFY", order.id, order.name, "header-unreadable-direct-link");
      } else {
        const res = await openBySearch(page, order.name);
        if (res !== "opened") {
          out("SKIP", order.id, order.name, res);
          skipped++;
          out("PROGRESS", i, total);
          continue;
        }
        how = "search";
      }

      if (!live) {
        out("DRY", order.id, order.name, how, oneLine(message).slice(0, 60));
        sent++;
        out("PROGRESS", i, total);
        await randDelay();
        continue;
      }

      const result = await sendText(page, message);
      if (result === "sent") {
        out("SENT", order.id, order.name, how);
        sent++;
      } else {
        out("ERR", order.id, order.name, result);
        failed++;
      }
    } catch (err) {
      out("ERR", order.id, order.name, (err as Error).message.slice(0, 120));
      failed++;
    }
    out("PROGRESS", i, total);
    await randDelay();
  }

  out("DONE", `sent=${sent}`, `skipped=${skipped}`, `failed=${failed}`);
  await context.close();
}

main().catch((err) => {
  out("FAIL", String(err).slice(0, 300));
  process.exit(1);
});
