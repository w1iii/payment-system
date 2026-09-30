"use client";

import { useState } from "react";

export interface QueueItem {
  id: string;
  name: string;
  category: "player" | "nonplayer";
  facebook_url: string | null;
  message: string;
}

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Players", value: "player" },
  { label: "Non-players", value: "nonplayer" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function fbHref(item: QueueItem): string {
  const v = item.facebook_url?.trim();
  if (v) return /^https?:\/\//i.test(v) ? v : `https://m.me/${v.replace(/^@/, "")}`;
  return `https://www.facebook.com/search/top?q=${encodeURIComponent(item.name)}`;
}

export function MessageQueue({ items }: { items: QueueItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = items.filter(
    (i) => filter === "all" || i.category === filter,
  );

  async function copy(item: QueueItem) {
    try {
      await navigator.clipboard.writeText(item.message);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable — select fallback ignored
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-zinc-200/70 p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
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
        <span className="text-sm text-zinc-500">
          {filtered.length} unpaid {filtered.length === 1 ? "customer" : "customers"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          No unpaid customers in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{item.name}</span>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {item.category === "player" ? "Player" : "Non-player"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copy(item)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    {copiedId === item.id ? "Copied ✓" : "Copy message"}
                  </button>
                  <a
                    href={fbHref(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Open Facebook ↗
                  </a>
                </div>
              </div>
              <p
                title={item.message}
                className="mt-2 line-clamp-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
              >
                {item.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
