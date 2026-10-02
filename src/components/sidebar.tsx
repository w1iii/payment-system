"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/", label: "Non-players" },
  { href: "/nonplayers-2", label: "Non-players 2" },
  { href: "/players", label: "Players" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="print-hide border-b border-zinc-200 bg-white md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex flex-col p-4 md:sticky md:top-0 md:h-screen">
        <Link href="/" className="mb-6 block px-3 text-base font-semibold">
          Stingers Jersey Payments
        </Link>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <form action={logout} className="mt-6 md:mt-auto">
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
