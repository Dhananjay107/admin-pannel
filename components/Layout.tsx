import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import {
  DashboardIcon,
  HospitalIcon,
  PharmacyIcon,
  DistributorIcon,
  DoctorIcon,
  PatientIcon,
  OrdersIcon,
  ReportsIcon,
  TemplatesIcon,
  ActivityIcon,
  FinanceIcon,
  SettingsIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
  ClockIcon,
} from "./Icons";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LayoutProps {
  children: ReactNode;
  user: User | null;
  currentPage?: string;
}

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Overview", icon: DashboardIcon, section: "Home" },
  { path: "/hospital-management", label: "Hospitals", icon: HospitalIcon, section: "Management" },
  { path: "/pharmacy-management", label: "Pharmacies", icon: PharmacyIcon, section: "Management" },
  { path: "/branch-stock", label: "Branch Stock", icon: PharmacyIcon, section: "Management", superAdminOnly: true },
  { path: "/distributor-management", label: "Distributors", icon: DistributorIcon, section: "Management" },
  { path: "/doctor-management", label: "Doctors", icon: DoctorIcon, section: "Management" },
  { path: "/schedules", label: "Schedules", icon: ClockIcon, section: "Operations" },
  { path: "/patient-panel", label: "Patients", icon: PatientIcon, section: "Operations" },
  { path: "/orders", label: "Orders", icon: OrdersIcon, section: "Operations" },
  { path: "/reports", label: "Reports", icon: ReportsIcon, section: "Reports" },
  { path: "/templates", label: "Templates", icon: TemplatesIcon, section: "Reports" },
  { path: "/activity-panel", label: "Activity", icon: ActivityIcon, section: "Reports" },
  { path: "/finance", label: "Finance", icon: FinanceIcon, section: "Reports" },
  { path: "/settings", label: "Settings", icon: SettingsIcon, section: "System" },
];

function getBreadcrumb(pathname: string, items: NavItem[]): string {
  const item = items.find((i) => i.path === pathname);
  return item?.label ?? pathname.replace(/^\//, "").replace(/-/g, " ");
}

export default function Layout({ children, user, currentPage }: LayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    router.push("/");
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden relative">
      {/* Toast Notifications - Global */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[9999] pointer-events-none">
        <div className="max-w-sm sm:max-w-none ml-auto">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#fff",
                color: "#212529",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "500",
                zIndex: 9999,
                maxWidth: "calc(100vw - 2rem)",
                pointerEvents: "auto",
              },
              success: {
                iconTheme: {
                  primary: "#28A745",
                  secondary: "#fff",
                },
                style: {
                  borderLeft: "4px solid #28A745",
                  zIndex: 9999,
                },
              },
              error: {
                iconTheme: {
                  primary: "#DC3545",
                  secondary: "#fff",
                },
                style: {
                  borderLeft: "4px solid #DC3545",
                  zIndex: 9999,
                },
              },
            }}
          />
        </div>
      </div>
      
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-300 hover:bg-blue-50 transition-colors"
        aria-label="Open menu"
      >
        <MenuIcon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed left-0 top-0 w-72 h-screen border-r border-gray-300 bg-white shadow-xl flex flex-col z-50"
            >
              {/* Mobile Header */}
              <div className="px-6 py-6 border-b border-gray-300 bg-blue-900 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center shadow-md">
                    <HospitalIcon className="w-7 h-7 text-blue-900" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-wide text-white">
                      Healthcare Portal
                    </h1>
                    <p className="text-xs text-blue-200">Administration</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Mobile Navigation - Grouped by section */}
              <nav className="flex-1 overflow-y-auto px-4 py-4">
                {(() => {
                  const filtered = navItems.filter((item) => !item.superAdminOnly || user?.role === "SUPER_ADMIN");
                  const sections = Array.from(new Set(filtered.map((i) => i.section || "Main")));
                  return sections.map((section) => (
                    <div key={section} className="mb-5">
                      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {section}
                      </p>
                      <div className="space-y-1">
                        {filtered.filter((i) => (i.section || "Main") === section).map((item, index) => {
                          const isActive = router.pathname === item.path;
                          return (
                            <motion.button
                              key={item.path}
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => {
                                router.push(item.path);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                  ? "bg-blue-50 text-blue-900 border-l-2 border-blue-600"
                                  : "text-gray-700 hover:bg-gray-50 border-l-2 border-transparent"
                              }`}
                            >
                              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                              <span className="flex-1 text-left">{item.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </nav>

              {/* Mobile Footer */}
              {user && (
                <div className="px-6 py-4 border-t border-gray-300 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold shadow-md">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-600 truncate">{user.email}</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogoutIcon className="w-5 h-5" />
                    <span>Logout</span>
                  </motion.button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      {/* Desktop Sidebar - Fixed Position */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex fixed left-0 top-0 w-72 h-screen border-r border-gray-300 bg-white shadow-lg flex-col z-50"
      >
        {/* Fixed Header */}
        <div className="px-6 py-6 border-b border-gray-300 bg-blue-900 flex-shrink-0">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center shadow-md">
              <HospitalIcon className="w-7 h-7 text-blue-900" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-white">
                Healthcare Portal
              </h1>
              <p className="text-xs text-blue-200">Administration</p>
            </div>
          </motion.div>
        </div>

        {/* Scrollable Navigation - Grouped by section */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {(() => {
            const filtered = navItems.filter((item) => !item.superAdminOnly || user?.role === "SUPER_ADMIN");
            const sections = Array.from(new Set(filtered.map((i) => i.section || "Main")));
            return sections.map((section) => (
              <div key={section} className="mb-5">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {section}
                </p>
                <div className="space-y-1">
                  {filtered.filter((i) => (i.section || "Main") === section).map((item) => {
                    const isActive = router.pathname === item.path;
                    return (
                      <motion.button
                        key={item.path}
                        onClick={() => router.push(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-blue-50 text-blue-900 border-l-2 border-blue-600"
                            : "text-gray-700 hover:bg-gray-50 hover:text-blue-800 border-l-2 border-transparent"
                        }`}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                        <span className="flex-1 text-left">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>

        {/* Fixed Footer with User Info */}
        {user && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="px-6 py-4 border-t border-gray-300 bg-gray-50 flex-shrink-0"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
            <motion.button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogoutIcon className="w-5 h-5" />
              <span>Logout</span>
            </motion.button>
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content - Scrollable with Sidebar Offset */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto h-full w-full lg:ml-72 bg-gray-50/80"
      >
        {/* Breadcrumb - easy "you are here" */}
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
            <span className="text-gray-500">Admin</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-800">{getBreadcrumb(router.pathname, navItems)}</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12 pt-4">
          {children}
        </div>
      </motion.main>
    </div>
  );
}

