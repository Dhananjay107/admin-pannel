import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

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

const navItems = [
  { path: "/dashboard", label: "Overview", icon: "📊" },
  { path: "/hospital-management", label: "Hospital Management", icon: "🏥" },
  { path: "/pharmacy-management", label: "Pharmacy Management", icon: "💊" },
  { path: "/distributor-management", label: "Distributor Management", icon: "🚚" },
  { path: "/doctor-panel", label: "Doctor Panel", icon: "👨‍⚕️" },
  { path: "/patient-panel", label: "Patient Panel", icon: "👤" },
  { path: "/orders", label: "Order Management", icon: "📋" },
  { path: "/reports", label: "Prescription Reports", icon: "📄" },
  { path: "/templates", label: "Document Templates", icon: "📄" },
  { path: "/activity-panel", label: "Activity", icon: "🔔" },
  { path: "/finance", label: "Finance", icon: "💰" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

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
    <div className="h-screen medical-bg-gradient flex overflow-hidden relative">
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border-2 border-black hover:bg-blue-50 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
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
              className="lg:hidden fixed left-0 top-0 w-72 h-screen border-r border-blue-200 bg-white shadow-xl flex flex-col z-50"
            >
              {/* Mobile Header */}
              <div className="px-6 py-6 border-b border-blue-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    🏥
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-wide text-black">
                      Admin Portal
                    </h1>
                    <p className="text-xs text-black">Super Admin</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {navItems.map((item, index) => {
                  const isActive = router.pathname === item.path;
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      onClick={() => {
                        router.push(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm"
                          : "text-black hover:bg-blue-50 hover:text-blue-600 border-l-4 border-transparent"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicatorMobile"
                          className="h-2 w-2 rounded-full bg-blue-600"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </nav>

              {/* Mobile Footer */}
              {user && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold medical-text-primary truncate">{user.name}</p>
                      <p className="text-xs medical-text-secondary truncate">{user.email}</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>🚪</span>
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
        className="hidden lg:flex fixed left-0 top-0 w-72 h-screen border-r border-blue-200 bg-white shadow-lg flex-col z-50"
      >
        {/* Fixed Header */}
        <div className="px-6 py-6 border-b border-blue-200 flex-shrink-0">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              🏥
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-black">
                Admin Portal
              </h1>
              <p className="text-xs text-black">Super Admin</p>
            </div>
          </motion.div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {navItems.map((item, index) => {
            const isActive = router.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm"
                    : "text-black hover:bg-blue-50 hover:text-blue-600 border-l-4 border-transparent"
                }`}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="h-2 w-2 rounded-full bg-blue-600"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Fixed Footer with User Info */}
        {user && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="px-6 py-4 border-t border-blue-200 bg-blue-50 flex-shrink-0"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black truncate">{user.name}</p>
                <p className="text-xs text-black truncate">{user.email}</p>
              </div>
            </div>
            <motion.button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>🚪</span>
              <span>Logout</span>
            </motion.button>
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content - Scrollable with Sidebar Offset */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto h-full w-full lg:ml-72"
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12 pt-16 lg:pt-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
}

