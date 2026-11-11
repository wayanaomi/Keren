import { requireOrganization } from "@/lib/auth/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization, user } = await requireOrganization();

  return (
    <div className="flex h-dvh overflow-hidden bg-cream">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar orgName={organization.name} userName={user.name ?? user.email ?? ""} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">{children}</main>
      </div>
    </div>
  );
}
