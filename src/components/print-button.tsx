"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";

export function PrintButton({ category }: { category: Category }) {
  return (
    <Link
      href={`/print?category=${category}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 sm:py-1.5"
    >
      Print / Save PDF
    </Link>
  );
}
