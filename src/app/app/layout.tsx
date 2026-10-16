import { requireOrganization } from "@/lib/auth/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization, user } = await requireOrganization();

  return (
    <div className="flex min-h-screen bg-cream">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar orgName={organization.name} userName={user.name ?? user.email ?? ""} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
