"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Non-players" },
  { href: "/players", label: "Players" },
  { href: "/messages", label: "Messages" },
  { href: "/orders/new", label: "New order" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-50"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span className="block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
      </button>

      {open && (
        <nav
          id="mobile-navigation"
          className="absolute right-0 top-12 z-10 w-52 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
        >
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
