"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface FbStatus {
  running: boolean;
  lines: string[];
  mode: string | null;
  startedAt: number | null;
}

export function SendControls({
  total,
  selectedIds,
}: {
  total: number;
  selectedIds: string[];
}) {
  const [status, setStatus] = useState<FbStatus>({
    running: false,
    lines: [],
    mode: null,
    startedAt: null,
  });
  const [confirming, setConfirming] = useState(false);
  const [ack, setAck] = useState(false);
  const [sendWord, setSendWord] = useState("");
  const [everStarted, setEverStarted] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const hasSelection = selectedIds.length > 0;
  const scope = hasSelection
    ? `${selectedIds.length} selected customer${selectedIds.length === 1 ? "" : "s"}`
    : `all ${total} unpaid customers`;

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/fb-send");
      if (r.ok) setStatus(await r.json());
    } catch {
      // server restarting; next tick retries
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(poll, 0);
    const id = setInterval(poll, 1500);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [poll]);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [status.lines]);

  async function start(live: boolean) {
    const r = await fetch("/api/fb-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ live, ids: selectedIds }),
    });
    if (r.ok) {
      setEverStarted(true);
      setConfirming(false);
      setAck(false);
      setSendWord("");
      await poll();
    }
  }

  async function abort() {
    await fetch("/api/fb-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abort" }),
    });
    await poll();
  }

  const showLog =
    confirming || everStarted || status.running || status.lines.length > 0;

  return (
    <section className="border-t border-zinc-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Send via Facebook
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Targets: {scope} · opens an automated Chrome window · you stay
            logged in on Facebook
          </p>
        </div>
        <div className="flex gap-2">
          {!status.running && !confirming && hasSelection && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Send selected ({selectedIds.length})
            </button>
          )}
          {!status.running && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={
                hasSelection
                  ? "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  : "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              }
            >
              Send all ({total})
            </button>
          )}
          {status.running && (
            <button
              type="button"
              onClick={abort}
              className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Abort
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Mass-messaging from your own Facebook account → {scope}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            <li>
              First run: a Chrome window opens — log into Facebook there once,
              session is saved for next times
            </li>
            <li>
              Facebook may restrict accounts for bulk messaging (ToS risk —
              your account, your call)
            </li>
            <li>
              Recipients verified before sending; mismatches are skipped and
              logged
            </li>
            <li>
              Dry run walks every conversation without sending — start with it
            </li>
          </ul>
          <label className="mt-3 flex items-center gap-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand the risks
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!ack}
              onClick={() => start(false)}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 disabled:opacity-40"
            >
              Dry run
            </button>
            <input
              type="text"
              value={sendWord}
              onChange={(e) => setSendWord(e.target.value)}
              placeholder="Type SEND"
              className="w-36 rounded-md border border-amber-400 bg-white px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={!ack || sendWord !== "SEND"}
              onClick={() => start(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Send for real
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setAck(false);
                setSendWord("");
              }}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLog && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {status.running
              ? `Running (${status.mode === "live" ? "LIVE" : "dry"} — Chrome window is controlled, do not click inside it)`
              : "Last run"}
          </p>
          <pre
            ref={logRef}
            className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs leading-relaxed text-zinc-100"
          >
            {status.lines.length > 0
              ? status.lines.join("\n")
              : "starting…"}
          </pre>
        </div>
      )}
    </section>
  );
}
