import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { normalizeAppRole } from "@/lib/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    const userRole = normalizeAppRole(session.user?.role);
    const userName = session.user?.username || "User";

    return (
        <div className="container-scroller">
            <Navbar initialRole={userRole} initialUsername={userName} />
            <div className="container-fluid page-body-wrapper">
                <Sidebar initialRole={userRole} initialUsername={userName} />
                <div className="main-panel">
                    <div className="content-wrapper">{children}</div>
                    <footer className="footer">
                        <div className="d-sm-flex justify-content-center justify-content-sm-between">
                            <span className="text-muted text-center text-sm-left d-block d-sm-inline-block">
                                Copyright &copy; 2024 &mdash; Dashboard GCG PT Semen Baturaja
                            </span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
