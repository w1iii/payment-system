import { Sidebar } from "@/components/sidebar";
import { requireAdmin } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
