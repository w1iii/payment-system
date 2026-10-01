"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface FbStatus {
  running: boolean;
  lines: string[];
  mode: string | null;
  startedAt: number | null;
  error?: string;
}

interface ManualTarget {
  id: string;
  name: string;
}

type Mode = "selected" | "all" | "manual";

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
  const [targets, setTargets] = useState<ManualTarget[]>([]);
  const [targetInput, setTargetInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pendingMode, setPendingMode] = useState<Mode>("all");
  const [ack, setAck] = useState(false);
  const [sendWord, setSendWord] = useState("");
  const [everStarted, setEverStarted] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const hasSelection = selectedIds.length > 0;
  const manualCount = targets.length;
  const hasManual = manualCount > 0;

  function targetsLabel(count: number): string {
    return `${count} manual name${count === 1 ? "" : "s"}`;
  }

  function scopeFor(mode: Mode): string {
    const manual = hasManual ? ` + ${targetsLabel(manualCount)}` : "";
    if (mode === "manual") return targetsLabel(manualCount);
    if (mode === "selected")
      return `${selectedIds.length} selected customer${selectedIds.length === 1 ? "" : "s"}${manual}`;
    return `all ${total} unpaid customers${manual}`;
  }

  const idleScope = hasSelection
    ? `${selectedIds.length} selected${hasManual ? ` + ${manualCount} manual` : ""}`
    : hasManual
      ? `all ${total} unpaid + ${manualCount} manual`
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

  function addTarget(e: React.FormEvent) {
    e.preventDefault();
    const name = targetInput.trim();
    setTargetInput("");
    if (!name) return;
    const exists = targets.some(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;
    setTargets([
      ...targets,
      {
        id: crypto.randomUUID(),
        name,
      },
    ]);
  }

  function removeTarget(id: string) {
    setTargets((t) => t.filter((x) => x.id !== id));
  }

  function openConfirm(mode: Mode) {
    setPendingMode(mode);
    setConfirming(true);
    setAck(false);
    setSendWord("");
  }

  async function start(live: boolean) {
    const body: Record<string, unknown> = {
      live,
      targets: targets.map((t) => ({ name: t.name })),
    };
    if (pendingMode === "all") body.all = true;
    else body.ids = pendingMode === "selected" ? selectedIds : [];
    const r = await fetch("/api/fb-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setEverStarted(true);
      setConfirming(false);
      setAck(false);
      setSendWord("");
      await poll();
    } else {
      const result = (await r.json().catch(() => ({}))) as {
        error?: string;
      };
      setStatus((current) => ({
        ...current,
        error: result.error ?? "Failed to start automation",
        lines: [result.error ?? "Failed to start automation"],
      }));
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Send via Messenger
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Messenger search: {idleScope}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!status.running && !confirming && hasSelection && (
            <button
              type="button"
              onClick={() => openConfirm("selected")}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Send selected ({selectedIds.length})
            </button>
          )}
          {!status.running && !confirming && hasManual && (
            <button
              type="button"
              onClick={() => openConfirm("manual")}
              className={
                hasSelection
                  ? "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  : "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              }
            >
              Send {manualCount} target{manualCount === 1 ? "" : "s"}
            </button>
          )}
          {!status.running && !confirming && (
            <button
              type="button"
              onClick={() => openConfirm("all")}
              className={
                hasSelection || hasManual
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

      <form
        onSubmit={addTarget}
        className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <input
          type="text"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          placeholder="Enter a person&apos;s name"
          aria-label="Add person name"
          disabled={status.running}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:opacity-50 sm:w-80"
        />
        <button
          type="submit"
          disabled={status.running || !targetInput.trim()}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Add
        </button>
        {hasManual && (
          <span className="text-xs text-zinc-500">
            names are searched in Messenger on top of the chosen scope
          </span>
        )}
      </form>

      {hasManual && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {targets.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 py-1 pl-3 pr-1.5 text-sm"
            >
              <span className="font-medium text-zinc-900">{t.name}</span>
              <button
                type="button"
                onClick={() => removeTarget(t.id)}
                aria-label={`Remove ${t.name}`}
                className="rounded-full px-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Messenger messages from your own Facebook account →{" "}
            {scopeFor(pendingMode)}
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
              className="w-full rounded-md border border-amber-400 bg-white px-2 py-1.5 text-sm sm:w-36"
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
          {status.error && (
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {status.error}
            </p>
          )}
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
