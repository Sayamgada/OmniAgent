import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AnimatedBackground } from "../components/dashboard/AnimatedBackground";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardTopNav } from "../components/dashboard/DashboardTopNav";
import { PageTransition } from "../components/dashboard/PageTransition";

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen bg-background text-foreground antialiased">
      <AnimatedBackground />

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <DashboardTopNav onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
