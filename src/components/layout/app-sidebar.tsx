"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KerenMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Kanban,
  Building2,
  FileText,
  Bell,
  CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/app", label: "Opportunities for you", icon: LayoutDashboard },
  { href: "/app/opportunities", label: "Discover", icon: Search },
  { href: "/app/saved", label: "Saved", icon: Bookmark },
  { href: "/app/applications", label: "Applications", icon: Kanban },
  { href: "/app/organization", label: "Organization", icon: Building2 },
  { href: "/app/knowledge-base", label: "Knowledge base", icon: FileText },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
];

export function AppSidebar() {
  const activePath = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-line px-5">
        <KerenMark className="h-7 w-7" />
        <span className="font-sans text-lg font-extrabold text-ink">eren</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = activePath === href || (href !== "/app" && activePath.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-orange-tint text-ember" : "text-stone hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
