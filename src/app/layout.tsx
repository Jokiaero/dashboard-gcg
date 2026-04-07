import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/shared/Providers";

export const metadata: Metadata = {
  title: "Dashboard GCG - PT Semen Baturaja",
  description: "Dashboard Good Corporate Governance PT Semen Baturaja",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="stylesheet" href="/assets/vendors/feather/feather.css" />
        <link rel="stylesheet" href="/assets/vendors/ti-icons/css/themify-icons.css" />
        <link rel="stylesheet" href="/assets/vendors/css/vendor.bundle.base.css" />
        <link rel="stylesheet" href="/assets/vendors/font-awesome/css/font-awesome.min.css" />
        <link rel="stylesheet" href="/assets/vendors/mdi/css/materialdesignicons.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="shortcut icon" href="/assets/images/favicon.png" />
        <style>{`
          .sidebar {
            background-color: #2b4c3d !important;
          }

          /* Keep icon and label vertically centered and consistently aligned */
          .sidebar .nav .nav-item .nav-link {
            align-items: center !important;
            color: #cfe7db !important;
            border-radius: 8px;
            transition: background-color 0.15s ease, color 0.15s ease;
          }

          .sidebar .nav .nav-item .nav-link i.menu-icon {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            width: 1.25rem;
            min-width: 1.25rem;
            height: 1.25rem;
            margin-right: 0.75rem !important;
            line-height: 1;
          }

          .sidebar .nav .nav-item .nav-link i.menu-icon:before {
            width: 100%;
            text-align: center;
            line-height: 1;
          }

          /* Icon-only mode: force perfect center alignment */
          .sidebar-icon-only .sidebar .nav .nav-item .nav-link {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            text-align: center !important;
          }

          .sidebar-icon-only .sidebar .nav .nav-item .nav-link i.menu-icon {
            margin-right: 0 !important;
            margin-left: 0 !important;
            position: relative;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
          }

          .sidebar-icon-only .sidebar .nav .nav-item .nav-link i.menu-icon::before {
            display: block;
            width: 1em;
            margin: 0 auto;
          }

          .sidebar .nav .nav-item .nav-link .menu-title {
            line-height: 1.25;
          }

          .sidebar .nav .nav-item .nav-link i,
          .sidebar .nav .nav-item .nav-link .menu-title,
          .sidebar .nav .nav-item .nav-link .menu-arrow {
            color: inherit !important;
          }

          /* Top-level hover and active state: consistent with selected Dashboard style */
          .sidebar .nav:not(.sub-menu) > .nav-item:hover > .nav-link {
            background-color: rgba(255, 255, 255, 0.12) !important;
            color: #ffffff !important;
          }

          .sidebar .nav:not(.sub-menu) > .nav-item.active {
            background-color: transparent !important;
          }

          .sidebar .nav .nav-item.active > .nav-link,
          .sidebar .nav:not(.sub-menu) > .nav-item.active > .nav-link,
          .sidebar .nav:not(.sub-menu) > .nav-item > .nav-link[aria-expanded=true] {
            background-color: rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
          }

          .sidebar .nav .nav-item.active > .nav-link i,
          .sidebar .nav .nav-item.active > .nav-link span,
          .sidebar .nav .nav-item.active > .nav-link .menu-arrow {
            color: #ffffff !important;
          }

          /* Submenu area follows the same color system */
          .sidebar .nav.sub-menu {
            background-color: transparent !important;
          }

          .sidebar .nav.sub-menu .nav-item::before {
            background-color: rgba(255, 255, 255, 0.35) !important;
            opacity: 0.9;
          }

          .sidebar .nav.sub-menu .nav-item .nav-link {
            color: #cfe7db !important;
            font-weight: 500;
          }

          .sidebar .nav.sub-menu .nav-item .nav-link:hover,
          .sidebar .nav.sub-menu .nav-item .nav-link.active {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.18) !important;
            border-radius: 6px;
          }
        `}</style>
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <script src="/assets/vendors/js/vendor.bundle.base.js" defer></script>
        <script src="/assets/js/off-canvas.js" defer></script>
        <script src="/assets/js/template.js" defer></script>
        <script src="/assets/js/settings.js" defer></script>
      </body>
    </html>
  );
}
