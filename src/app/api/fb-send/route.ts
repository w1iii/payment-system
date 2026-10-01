import { spawn, type ChildProcess } from "node:child_process";
import { requireAdmin } from "@/lib/auth";

interface FbState {
  running: boolean;
  lines: string[];
  mode: string | null;
  startedAt: number | null;
  error?: string;
}

const store = globalThis as unknown as {
  __fbState?: FbState;
  __fbChild?: ChildProcess;
};

function state(): FbState {
  if (!store.__fbState) {
    store.__fbState = {
      running: false,
      lines: [],
      mode: null,
      startedAt: null,
      error: undefined,
    };
  }
  return store.__fbState;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    live?: boolean;
    all?: boolean;
    ids?: unknown;
    targets?: unknown;
  };
  const s = state();

  if (body.action === "abort") {
    const child = store.__fbChild;
    if (child?.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    return Response.json({ ok: true });
  }

  if (s.running) {
    return Response.json({ error: "already running" }, { status: 409 });
  }

  const live = body.live === true;
  const ids = Array.isArray(body.ids)
    ? body.ids
        .filter(
          (x): x is string =>
            typeof x === "string" && /^[0-9a-fA-F-]{1,64}$/.test(x),
        )
        .slice(0, 500)
    : [];
  const targets = Array.isArray(body.targets)
    ? body.targets
        .filter(
          (t): t is { name?: string; value?: string } => {
            if (typeof t !== "object" || t === null) return false;
            const rawName = (t as { name?: unknown }).name;
            const legacyValue = (t as { value?: unknown }).value;
            const n =
              typeof rawName === "string" && rawName.trim()
                ? rawName
                : typeof legacyValue === "string" &&
                    legacyValue.trim() &&
                    !/^https?:\/\//i.test(legacyValue.trim())
                  ? legacyValue
                  : null;
            return (
              typeof n === "string" &&
              n.length > 0 &&
              n.trim().length <= 100 &&
              !n.includes("\0")
            );
          },
        )
        .slice(0, 100)
        .map((t) => {
          const rawName = (t as { name?: unknown }).name;
          return {
            name:
              typeof rawName === "string" && rawName.trim()
                ? rawName.trim()
                : (t.value ?? "").trim(),
          };
        })
    : [];
  const idArg =
    body.all === true
      ? []
      : ids.length > 0
        ? [`--ids=${ids.join(",")}`]
        : targets.length > 0
          ? ["--ids="]
          : [];
  let child: ChildProcess;
  try {
    child = spawn(
      "npx",
      [
        "--no-install",
        "tsx",
        "scripts/fb-send.ts",
        ...(live ? ["--live"] : []),
        ...idArg,
        ...(targets.length > 0 ? [`--targets=${JSON.stringify(targets)}`] : []),
      ],
      { cwd: process.cwd(), env: process.env, detached: true },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    s.error = `Failed to start automation: ${message}`;
    s.lines = [`ERROR|${s.error}`];
    return Response.json({ error: s.error }, { status: 500 });
  }

  store.__fbChild = child;
  s.running = true;
  s.lines = [];
  s.mode = live ? "live" : "dry";
  s.startedAt = Date.now();
  s.error = undefined;

  const push = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) s.lines.push(line.trim());
    }
  };
  child.stdout?.on("data", push);
  child.stderr?.on("data", push);
  child.on("error", (error) => {
    s.error = `Failed to start automation: ${error.message}`;
    s.lines.push(`ERROR|${s.error}`);
    s.running = false;
    store.__fbChild = undefined;
  });
  child.on("close", (code) => {
    if (code !== 0) s.error = s.error ?? `Automation exited with code ${code}`;
    s.lines.push(`EXIT|code=${code}`);
    s.running = false;
    store.__fbChild = undefined;
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // group already gone
      }
    }
  });

  return Response.json({ started: true, mode: s.mode });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(state());
}
