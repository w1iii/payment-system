import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MobileNav } from "@/components/mobile-nav";
import { requireAdmin } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="shrink-0 text-sm font-semibold sm:text-base">
              Stingers Jersey Payments
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-zinc-600 sm:flex">
              <Link href="/" className="hover:text-zinc-900">
                Non-players
              </Link>
              <Link href="/players" className="hover:text-zinc-900">
                Players
              </Link>
              <Link href="/messages" className="hover:text-zinc-900">
                Messages
              </Link>
              <Link href="/orders/new" className="hover:text-zinc-900">
                New order
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MobileNav />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
