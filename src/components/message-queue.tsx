"use client";

import { useState } from "react";

export interface QueueItem {
  id: string;
  name: string;
  category: "player" | "nonplayer";
  facebook_url: string | null;
  message: string;
}

const PAGE_SIZE = 10;

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Players", value: "player" },
  { label: "Non-players", value: "nonplayer" },
  { label: "Select", value: "select" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function buildAllText(items: QueueItem[]): string {
  return items
    .map((i) => `[${i.name}]\n${i.message}`)
    .join("\n\n---\n\n");
}

export function MessageQueue({
  items,
  selected,
  onToggle,
  onClear,
}: {
  items: QueueItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const isSelect = filter === "select";
  const filtered = isSelect
    ? items
    : items.filter((i) => i.category === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE,
  );

  function changeFilter(value: Filter) {
    setFilter(value);
    setPage(1);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(buildAllText(items));
      setCopiedAll(true);
      setCopyError(false);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  const btn =
    "rounded-md px-3 py-1.5 text-sm font-medium border border-zinc-300 hover:bg-zinc-50";
  const disabled =
    "cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium border border-zinc-200 text-zinc-400";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-zinc-200/70 p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => changeFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                filter === value
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isSelect ? (
            <span className="text-sm text-zinc-500">
              {selected.length} of {filtered.length} selected
            </span>
          ) : (
            <span className="text-sm text-zinc-500">
              {filtered.length} unpaid{" "}
              {filtered.length === 1 ? "customer" : "customers"}
            </span>
          )}
          {isSelect && selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={copyAll}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {copiedAll ? "Copied ✓" : `Copy all ${items.length} messages`}
          </button>
        </div>
      </div>

      {copyError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Clipboard unavailable — check browser permissions.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          No unpaid customers in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-xl border bg-white p-4 ${
                  isSelect && checked
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelect && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(item.id)}
                      aria-label={`Select ${item.name}`}
                      className="h-4 w-4 shrink-0 accent-zinc-900"
                    />
                  )}
                  <span className="font-medium text-zinc-900">
                    {item.name}
                  </span>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {item.category === "player" ? "Player" : "Non-player"}
                  </span>
                </div>
                <p
                  title={item.message}
                  className="mt-2 line-clamp-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
                >
                  {item.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            className={current <= 1 ? disabled : btn}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === current ? "page" : undefined}
              className={
                p === current
                  ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                  : btn
              }
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= totalPages}
            className={current >= totalPages ? disabled : btn}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
