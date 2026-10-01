import { spawn, type ChildProcess } from "node:child_process";

interface FbState {
  running: boolean;
  lines: string[];
  mode: string | null;
  startedAt: number | null;
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
    };
  }
  return store.__fbState;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    live?: boolean;
    ids?: unknown;
  };
  const s = state();

  if (body.action === "abort") {
    store.__fbChild?.kill("SIGTERM");
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
  const child = spawn(
    "npx",
    [
      "tsx",
      "scripts/fb-send.ts",
      ...(live ? ["--live"] : []),
      ...(ids.length > 0 ? [`--ids=${ids.join(",")}`] : []),
    ],
    { cwd: process.cwd(), env: process.env },
  );
  store.__fbChild = child;
  s.running = true;
  s.lines = [];
  s.mode = live ? "live" : "dry";
  s.startedAt = Date.now();

  const push = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) s.lines.push(line.trim());
    }
  };
  child.stdout.on("data", push);
  child.stderr.on("data", push);
  child.on("close", (code) => {
    s.lines.push(`EXIT|code=${code}`);
    s.running = false;
    store.__fbChild = undefined;
  });

  return Response.json({ started: true, mode: s.mode });
}

export async function GET() {
  return Response.json(state());
}
