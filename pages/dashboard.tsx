import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import AnimatedCard from "../components/AnimatedCard";
import { getSocket, onSocketEvent, offSocketEvent } from "../services/socket";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const previousActivityIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!storedUser || !token) {
      router.replace("/");
      return;
    }
    setUser(JSON.parse(storedUser));
    const fetchStats = async () => {
      try {
        const [
          appointmentsRes,
          distributorOrdersRes,
          patientOrdersRes,
          financeRes,
          hospitalsRes,
          pharmaciesRes,
          distributorsRes,
          usersRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/api/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/distributor-orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/finance/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/master/hospitals`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/master/pharmacies`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/master/distributors`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [
          appointments,
          distributorOrders,
          patientOrders,
          finance,
          hospitals,
          pharmacies,
          distributors,
          users,
        ] = await Promise.all([
          appointmentsRes.ok ? appointmentsRes.json() : [],
          distributorOrdersRes.ok ? distributorOrdersRes.json() : [],
          patientOrdersRes.ok ? patientOrdersRes.json() : [],
          financeRes.ok ? financeRes.json() : { total: 0, count: 0 },
          hospitalsRes.ok ? hospitalsRes.json() : [],
          pharmaciesRes.ok ? pharmaciesRes.json() : [],
          distributorsRes.ok ? distributorsRes.json() : [],
          usersRes.ok ? usersRes.json() : [],
        ]);
        
        // Fetch inventory count from all pharmacies (aggregate count)
        let inventoryCount = 0;
        try {
          if (Array.isArray(pharmacies) && pharmacies.length > 0) {
            // Get inventory count from first pharmacy as sample, or aggregate if needed
            const firstPharmacyId = pharmacies[0]?._id || pharmacies[0]?.id;
            if (firstPharmacyId) {
              const inventoryRes = await fetch(`${API_BASE}/api/inventory/by-pharmacy/${firstPharmacyId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (inventoryRes.ok) {
                const inventoryData = await inventoryRes.json();
                inventoryCount = Array.isArray(inventoryData) ? inventoryData.length : 0;
              }
            }
          }
        } catch (invError) {
          // Silently handle inventory fetch errors - it's just for stats
          console.warn("Could not fetch inventory count:", invError);
        }

        // Calculate order stats
        const patientOrdersArray = Array.isArray(patientOrders) ? patientOrders : [];
        const pendingOrders = patientOrdersArray.filter((o: any) => o.status === "PENDING").length;
        const activeOrders = patientOrdersArray.filter((o: any) => 
          ["ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"].includes(o.status)
        ).length;

        setStats({
          appointmentsCount: Array.isArray(appointments) ? appointments.length : 0,
          stockItems: inventoryCount,
          distributorOrders: Array.isArray(distributorOrders) ? distributorOrders.length : 0,
          patientOrders: patientOrdersArray.length,
          pendingOrders,
          activeOrders,
          financeTotal: finance.total ?? 0,
          hospitalsCount: Array.isArray(hospitals) ? hospitals.length : 0,
          pharmaciesCount: Array.isArray(pharmacies) ? pharmacies.length : 0,
          distributorsCount: Array.isArray(distributors) ? distributors.length : 0,
          doctorsCount: Array.isArray(users)
            ? users.filter((u: any) => u.role === "DOCTOR").length
            : 0,
        });
      } catch (e: any) {
        // Silently handle connection errors (backend might be starting)
        if (e.message?.includes("Failed to fetch") || e.message?.includes("ERR_CONNECTION_REFUSED")) {
          // Backend is not running, show user-friendly message
          if (loading) {
            toast.error("Cannot connect to backend server", {
              description: "Please make sure the backend server is running on port 4000",
              duration: 5000,
            });
          }
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // Fetch recent activities
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/activities?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const activities = Array.isArray(data) ? data : [];
          
          // Detect new activities
          const currentActivityIds = new Set(activities.map((a: any) => a._id || a.id));
          const newActivities = activities.filter((a: any) => 
            !previousActivityIdsRef.current.has(a._id || a.id)
          );
          
          // Show toast for new activities (only if not initial load)
          if (previousActivityIdsRef.current.size > 0 && newActivities.length > 0) {
            newActivities.forEach((activity: any) => {
              toast.success(activity.title, {
                description: activity.description,
                duration: 3000,
              });
            });
            // Refresh stats when new activity arrives
            fetchStats();
          }
          
          previousActivityIdsRef.current = currentActivityIds;
          setRecentActivities(activities);
        }
      } catch (e: any) {
        // Silently handle connection errors (backend might be starting)
        if (e.message?.includes("Failed to fetch") || e.message?.includes("ERR_CONNECTION_REFUSED")) {
          // Backend is not running, don't spam console
          return;
        }
        console.error("Failed to fetch activities", e);
      }
    };

    fetchActivities();

    // Socket.IO real-time updates
    const socket = getSocket();
    if (socket) {
      const handleAppointmentCreated = () => {
        fetchStats();
        fetchActivities();
      };

      const handlePrescriptionCreated = () => {
        fetchStats();
        fetchActivities();
      };

      const handleOrderCreated = () => {
        fetchStats();
      fetchActivities();
      };

      const handleOrderStatusUpdated = () => {
      fetchStats();
        fetchActivities();
      };

      onSocketEvent("appointment:created", handleAppointmentCreated);
      onSocketEvent("prescription:created", handlePrescriptionCreated);
      onSocketEvent("prescription:formatted", handlePrescriptionCreated);
      onSocketEvent("prescription:finalized", handlePrescriptionCreated);
      onSocketEvent("order:created", handleOrderCreated);
      onSocketEvent("order:statusUpdated", handleOrderStatusUpdated);

    return () => {
        offSocketEvent("appointment:created", handleAppointmentCreated);
        offSocketEvent("prescription:created", handlePrescriptionCreated);
        offSocketEvent("prescription:formatted", handlePrescriptionCreated);
        offSocketEvent("prescription:finalized", handlePrescriptionCreated);
        offSocketEvent("order:created", handleOrderCreated);
        offSocketEvent("order:statusUpdated", handleOrderStatusUpdated);
    };
    }
  }, [router]);

  if (!user) return null;

  return (
    <Layout user={user} currentPage="dashboard">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2">
              Dashboard Overview
            </h1>
            <p className="text-sm text-black">
              Real-time insights into your healthcare ecosystem
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isPolling ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-black"
            >
              <div
                className={`h-3 w-3 rounded-full ${isPolling ? "bg-green-600" : "bg-black"}`}
              />
              <span className="text-sm font-semibold text-black">
                {isPolling ? "Live" : "Paused"}
              </span>
            </motion.div>
            <div className="text-right px-4 py-2 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-0.5">Role</p>
              <p className="text-sm font-bold text-blue-700">{user.role}</p>
            </div>
          </div>
        </div>
      </motion.header>

        {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
          />
        </div>
        ) : (
          <>
          {/* Key Metrics - Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer border-l-4 border-l-blue-600 hover:shadow-xl transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-3xl">🏥</span>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-3 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Hospitals</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.hospitalsCount ?? 0}</p>
              <p className="text-xs text-black">Healthcare facilities</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer border-l-4 border-l-green-600 hover:shadow-xl transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <span className="text-3xl">👨‍⚕️</span>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-3 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Doctors</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.doctorsCount ?? 0}</p>
              <p className="text-xs text-black">Medical professionals</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer border-l-4 border-l-blue-600 hover:shadow-xl transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-3xl">💊</span>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-3 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Pharmacies</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.pharmaciesCount ?? 0}</p>
              <p className="text-xs text-black">Dispensing units</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer border-l-4 border-l-green-600 hover:shadow-xl transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <span className="text-3xl">🚚</span>
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-3 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Distributors</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.distributorsCount ?? 0}</p>
              <p className="text-xs text-black">Supply chain partners</p>
            </motion.div>
          </div>

          {/* Operational Metrics - Second Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer hover:shadow-xl transition-all h-full border-l-4 border-l-blue-600"
              onClick={() => router.push("/master")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-3xl">📅</span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Appointments</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.appointmentsCount ?? 0}</p>
              <p className="text-xs text-black">Total scheduled visits</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer hover:shadow-xl transition-all h-full border-l-4 border-l-green-600"
              onClick={() => router.push("/inventory")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <span className="text-3xl">📦</span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Stock Items</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.stockItems ?? 0}</p>
              <p className="text-xs text-black">Pharmacy inventory</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer hover:shadow-xl transition-all h-full border-l-4 border-l-blue-600"
              onClick={() => router.push("/pharmacy")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-3xl">📦</span>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 px-3 py-1 rounded-full">
                  {stats?.pendingOrders ?? 0} Pending
                </span>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Patient Orders</h3>
              <p className="text-4xl font-bold text-black mb-2">{stats?.patientOrders ?? 0}</p>
              <p className="text-xs text-black">
                {stats?.activeOrders ?? 0} Active • {stats?.pendingOrders ?? 0} Pending
              </p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="medical-card group cursor-pointer hover:shadow-xl transition-all border-l-4 border-l-green-600 h-full"
              onClick={() => router.push("/finance")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <span className="text-3xl">💰</span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-black mb-2">Total Revenue</h3>
              <p className="text-4xl font-bold text-green-600 mb-2">₹{(stats?.financeTotal ?? 0).toLocaleString()}</p>
              <p className="text-xs text-black">Net across all units</p>
            </motion.div>
          </div>
        </>
      )}
    </Layout>
  );
}
