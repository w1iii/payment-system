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

function nameMatches(haystack: string, name: string): boolean {
  const compact = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return compact(haystack).includes(compact(name));
}

function normalizedName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function exactNameMatch(haystack: string, name: string): boolean {
  return normalizedName(haystack) === normalizedName(name);
}

function similarityPercent(left: string, right: string): number {
  const a = normalizedName(left).replace(/ /g, "");
  const b = normalizedName(right).replace(/ /g, "");
  if (!a || !b) return 0;
  const distances = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = distances[0];
    distances[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = distances[j];
      distances[j] =
        a[i - 1] === b[j - 1]
          ? diagonal
          : 1 + Math.min(diagonal, distances[j - 1], above);
      diagonal = above;
    }
  }
  return Math.round(
    (1 - distances[b.length] / Math.max(a.length, b.length)) * 100,
  );
}

function candidateScore(text: string, name: string): number {
  const lowered = text.toLowerCase();
  if (
    lowered.includes("create new message") ||
    lowered.includes("new message") ||
    lowered.includes("send a message") ||
    lowered.includes("message someone")
  ) {
    return 0;
  }
  const expected = normalizedName(name);
  const lines = text
    .split(/\n+/)
    .map((line) => normalizedName(line))
    .filter(Boolean);
  if (lines.some((line) => line === expected)) return 100;
  if (exactNameMatch(text, name)) return 90;
  if (lines.some((line) => line.startsWith(`${expected} `))) return 70;
  if (nameMatches(text, name)) return 40;
  return Math.max(...lines.map((line) => similarityPercent(line, name)), 0);
}

async function messengerUnavailable(
  page: import("playwright-core").Page,
): Promise<boolean> {
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  return [
    "selected chat deleted",
    "conversation unavailable",
    "this content isn't available",
    "this content is not available",
  ].some((text) => body.includes(text));
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

let openContext: import("playwright-core").BrowserContext | null = null;
process.on("SIGTERM", () => {
  void openContext
    ?.close()
    .catch(() => {})
    .finally(() => process.exit(0));
});

async function nav(
  page: import("playwright-core").Page,
  url: string,
  waitUntil: "domcontentloaded" | "commit" = "domcontentloaded",
): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, { waitUntil, timeout: 45_000 });
      return true;
    } catch {
      if (attempt === 2) return false;
      await sleep(3_000);
    }
  }
  return false;
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
  searchName: string,
  verifyName: string | null = searchName,
): Promise<string> {
  if (!(await nav(page, "https://www.facebook.com/messages/"))) {
    return "nav-failed";
  }
  if (!(await waitForLogin(page))) return "login-timeout";

  const searchSelectors = [
    '[aria-label="Search Messenger"]',
    '[placeholder="Search Messenger"]',
    'input[aria-label="Search in Messenger"]',
    'input[placeholder="Search in Messenger"]',
    'div[contenteditable="true"][aria-label="Search Messenger"]',
  ].join(", ");
  const chatsHeading = page.getByRole("heading", { name: /^Chats$/i }).first();
  const sidebarSearch = chatsHeading.locator("..").locator(searchSelectors);
  const globalSearch = page.locator(searchSelectors);
  const search = (await sidebarSearch.count()) > 0
    ? sidebarSearch.first()
    : globalSearch.first();
  try {
    await search.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    return "search-box-not-found";
  }
  if ((await search.getAttribute("role")) === "button") {
    await search.click();
    const openedInput = page.locator(
      'input[aria-label="Search Messenger"], input[placeholder="Search Messenger"], input[aria-label="Search in Messenger"], input[placeholder="Search in Messenger"], div[contenteditable="true"][aria-label="Search Messenger"]',
    ).last();
    try {
      await openedInput.waitFor({ state: "visible", timeout: 10_000 });
    } catch {
      return "messenger-search-input-not-found";
    }
    return openBySearchInput(page, openedInput, searchName, verifyName);
  }
  return openBySearchInput(page, search, searchName, verifyName);
}

async function openBySearchInput(
  page: import("playwright-core").Page,
  search: import("playwright-core").Locator,
  searchName: string,
  verifyName: string | null,
): Promise<string> {
  await search.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(searchName, { delay: 40 });
  await sleep(2_500);

  const candidates = page.locator(
    '[role="listbox"] [role="option"]:visible, [role="option"]:visible',
  );
  const count = await candidates.count();
  const ranked: { score: number; index: number }[] = [];
  for (let i = 0; i < Math.min(count, 20); i++) {
    const text = (await candidates.nth(i).textContent().catch(() => null)) ?? "";
    const score = candidateScore(text, searchName);
    if (score >= 60) ranked.push({ score, index: i });
  }
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);

  for (const { index, score } of ranked) {
    const el = candidates.nth(index);
    const text = (await el.textContent().catch(() => null)) ?? "";
    if (!text) continue;
    if (
      /create new message|new message|send a message|message someone/i.test(
        text,
      )
    ) {
      continue;
    }
    out(
      "MATCH",
      searchName,
      `candidate=${oneLine(text).slice(0, 80)}`,
      `score=${score}%`,
    );

    await el.scrollIntoViewIfNeeded();
    const expected = verifyName || searchName;
    const exactText = el.getByText(expected, { exact: true }).first();
    if ((await exactText.count()) > 0) {
      await exactText.click().catch(() => {});
    } else {
      await el.click().catch(() => {});
    }
    if (!page.url().includes("/messages")) {
      out("SKIP", searchName, "dropdown-left-messenger");
      await nav(page, "https://www.facebook.com/messages/");
      continue;
    }
    await sleep(1_000);
    if (await messengerUnavailable(page)) {
      out("SKIP", searchName, "conversation-unavailable-after-selection");
      await nav(page, "https://www.facebook.com/messages/");
      continue;
    }
    const conversation = page.locator(
      '[role="log"][aria-label^="Messages in conversation with "]',
    ).last();
    try {
      await conversation.waitFor({ timeout: 20_000 });
    } catch {
      await nav(page, "https://www.facebook.com/messages/");
      continue;
    }
    const composer = page.locator(
      'div[contenteditable="true"][role="textbox"][aria-label^="Write to "]',
    ).last();
    try {
      await composer.waitFor({ timeout: 15_000 });
      const header = await conversationHeader(page);
      if (!header) continue;
      const expectedName = verifyName || searchName;
      const headerScore = similarityPercent(header, expectedName);
      if (headerScore < 75) {
        out(
          "SKIP",
          searchName,
          `conversation-match=${headerScore}%`,
          `header=${header}`,
        );
        await nav(page, "https://www.facebook.com/messages/");
        continue;
      }
      return "opened";
    } catch {
      await nav(page, "https://www.facebook.com/messages/");
    }
  }
  return "no-conversation-result";
}

async function conversationHeader(
  page: import("playwright-core").Page,
): Promise<string | null> {
  await sleep(1_500);
  const log = page.locator(
    '[role="log"][aria-label^="Messages in conversation with "]',
  ).last();
  const label = await log.getAttribute("aria-label").catch(() => null);
  const joined = label?.replace(/^Messages in conversation with\s+/i, "").trim() ?? "";
  if (!joined || joined.toLowerCase().includes("facebook user")) return null;
  return joined;
}

async function sendText(
  page: import("playwright-core").Page,
  text: string,
): Promise<"sent" | "composer-not-found" | "send-unconfirmed"> {
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  const composer = page
    .locator('div[contenteditable="true"][role="textbox"][aria-label^="Write to "]')
    .last();
  try {
    await composer.waitFor({ timeout: 20_000 });
  } catch {
    return "composer-not-found";
  }
  await composer.click();
  await sleep(500);
  await page.keyboard.type(oneLine(text), { delay: 15 });

  const draft = (await composer.innerText().catch(() => "")).trim();
  if (!draft.includes(oneLine(text).slice(0, 30))) {
    return "send-unconfirmed";
  }

  await page.keyboard.press("Enter");
  try {
    await page.waitForFunction(
      (prefix) => {
        const c = document.querySelector(
          'div[contenteditable="true"][role="textbox"][aria-label^="Write to "]',
        );
        const cleared =
          !c || (c as HTMLElement).innerText.trim().length === 0;
        return cleared && document.body.innerText.includes(prefix);
      },
      oneLine(text).slice(0, 40),
      { timeout: 10_000 },
    );
    return "sent";
  } catch {
    return "send-unconfirmed";
  }
}

async function fallbackSearch(
  page: import("playwright-core").Page,
  id: string,
  name: string,
  searchName: string | null,
  verifyName: string | null,
  reason: string,
): Promise<"opened" | "no-name" | string> {
  if (!searchName) return "no-name";
  out("FALLBACK", id, name, reason, "search-by", searchName);
  const res = await openBySearch(page, searchName, verifyName);
  return res === "opened" ? "opened" : res;
}

async function processOne(
  page: import("playwright-core").Page,
  id: string,
  name: string,
  message: string,
  live: boolean,
  searchName: string | null,
  verifyName: string | null,
): Promise<"ok" | "skip" | "fail"> {
  try {
    let how = "";

    const result = await fallbackSearch(
      page,
      id,
      name,
      searchName || name,
      verifyName,
      "messenger-name-search",
    );
    if (result !== "opened") {
      out("SKIP", id, name, `messenger-name-search:${result}`);
      return "skip";
    }
    how = "messenger-search";

    if (!live) {
      out("DRY", id, name, how, oneLine(message).slice(0, 60));
      return "ok";
    }

    const sendResult = await sendText(page, message);
    if (sendResult === "sent") {
      out("SENT", id, name, how);
      return "ok";
    }
    out("ERR", id, name, sendResult);
    return "fail";
  } catch (err) {
    out("ERR", id, name, (err as Error).message.slice(0, 120));
    return "fail";
  }
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

  let manual: { name: string }[] = [];
  const targetsArg = process.argv.find((a) => a.startsWith("--targets="));
  if (targetsArg) {
    try {
      const parsed = JSON.parse(targetsArg.slice("--targets=".length));
      if (Array.isArray(parsed)) {
        manual = parsed.flatMap((t) => {
          if (typeof t === "string" && t.trim())
            return [{ name: t.trim() }];
          if (
            typeof t === "object" &&
            t !== null
          ) {
            const rawName = (t as { name?: unknown }).name;
            const legacyValue = (t as { value?: unknown }).value;
            const value =
              typeof rawName === "string" && rawName.trim()
                ? rawName
                : typeof legacyValue === "string" ? legacyValue : "";
            return value.trim()
              ? [{ name: value.trim() }]
              : [];
          }
          return [];
        });
      }
    } catch {
      out("ERR", "bad-targets-arg");
    }
  }

  const template =
    (settings ?? []).find((s) => s.key === "message_template")?.value ||
    "Hi {name}! Just a reminder that your Stingers jersey payment is still unpaid. Please settle it at your earliest convenience. Thank you!";

  out(
    "RUN",
    `mode=${live ? "live" : "dry"}`,
    `targets=${list.length}`,
    `manual=${manual.length}`,
  );

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1200, height: 850 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(30_000);
  openContext = context;

  if (!(await nav(page, "https://www.facebook.com/messages/", "commit"))) {
    out("FAIL", "navigation-timeout");
    await context.close();
    process.exit(1);
  }
  if (!(await waitForLogin(page))) {
    await context.close();
    process.exit(1);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const skippedNames: string[] = [];
  const failedNames: string[] = [];
  const total = list.length;
  let i = 0;

  for (const order of list) {
    i++;
    const message = template.replace(/\{name\}/gi, order.name);
    const res = await processOne(
      page,
      order.id,
      order.name,
      message,
      live,
      order.name,
      order.name,
    );
    if (res === "ok") sent++;
    else if (res === "skip") {
      skipped++;
      skippedNames.push(order.name);
    } else {
      failed++;
      failedNames.push(order.name);
    }
    out("PROGRESS", i, total);
    await randDelay();
  }

  let j = 0;
  for (const target of manual) {
    j++;
    const name = target.name;
    const message = template.replace(/\{name\}/gi, name);
    const res = await processOne(
      page,
      `manual${j}`,
      name,
      message,
      live,
      name,
      name,
    );
    if (res === "ok") sent++;
    else if (res === "skip") {
      skipped++;
      skippedNames.push(name);
    } else {
      failed++;
      failedNames.push(name);
    }
    await randDelay();
  }

  out("DONE", `sent=${sent}`, `skipped=${skipped}`, `failed=${failed}`);
  if (skippedNames.length > 0) {
    out("SKIPPED_USERS", skippedNames.join(", "));
  }
  if (failedNames.length > 0) {
    out("FAILED_USERS", failedNames.join(", "));
  }
  await context.close();
}

if (process.env.FB_SEND_LIB !== "1") {
  main().catch(async (err) => {
    out("FAIL", String(err).slice(0, 300));
    await openContext?.close().catch(() => {});
    process.exit(1);
  });
}
