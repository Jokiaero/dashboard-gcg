import DashboardLayout from "@/components/DashboardLayout";
import AuditLogViewer from "@/components/AuditLogViewer";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user || session.user.role !== "SUPERADMIN") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <div className="py-4">
        <AuditLogViewer />
      </div>
    </DashboardLayout>
  );
}
