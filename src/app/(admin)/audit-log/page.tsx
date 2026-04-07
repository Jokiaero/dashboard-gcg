import AuditLogViewer from "@/components/features/admin/AuditLogViewer";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/roles";

export default async function AuditLogPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.user || !isAdminRole(session.user.role)) {
    redirect("/");
  }

    return (
      <div className="py-4">
        <AuditLogViewer />
      </div>
    );
}
