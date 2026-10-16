import { requirePlatformAdmin } from "@/lib/auth/session";
import { KerenMark } from "@/components/brand/logo";
import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/opportunities", label: "Opportunities" },
  { href: "/admin/users", label: "Users & organizations" },
  { href: "/admin/ai-monitoring", label: "AI monitoring" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex h-16 items-center gap-6 border-b border-line bg-ink px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <KerenMark tone="reversed" className="h-6 w-6" />
          <span className="text-sm font-bold text-white">Keren Admin</span>
        </Link>
        <nav className="flex gap-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-white/70 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/app" className="ml-auto text-sm text-white/70 hover:text-white">
          Back to app
        </Link>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
