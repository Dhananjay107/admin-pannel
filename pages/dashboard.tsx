import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import AnimatedCard from "../components/AnimatedCard";
import { getSocket, onSocketEvent, offSocketEvent } from "../services/socket";
import {
  HospitalIcon,
  DoctorIcon,
  PharmacyIcon,
  DistributorIcon,
  AppointmentsIcon,
  InventoryIcon,
  OrdersIcon,
  RevenueIcon,
} from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

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
  const [branchStockData, setBranchStockData] = useState<any[]>([]);
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
          financeRes.ok ? financeRes.json() : { total: 0, revenue: 0, expenses: 0, netProfit: 0, count: 0 },
          hospitalsRes.ok ? hospitalsRes.json() : [],
          pharmaciesRes.ok ? pharmaciesRes.json() : [],
          distributorsRes.ok ? distributorsRes.json() : [],
          usersRes.ok ? usersRes.json() : [],
        ]);
        
        // Fetch inventory count and stock alerts from all pharmacies
        let inventoryCount = 0;
        let branchStockData: any[] = [];
        try {
          if (Array.isArray(pharmacies) && pharmacies.length > 0) {
            // Fetch inventory data for all pharmacies in parallel
            const inventoryPromises = pharmacies.map(async (pharmacy: any) => {
              const pharmacyId = pharmacy._id || pharmacy.id;
              if (!pharmacyId) return null;
              
              try {
                const [inventoryRes, expiryRiskRes, lowStockRes] = await Promise.all([
                  fetch(`${API_BASE}/api/inventory/by-pharmacy/${pharmacyId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                  fetch(`${API_BASE}/api/inventory/expiry-risk?pharmacyId=${pharmacyId}&days=30`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                  fetch(`${API_BASE}/api/inventory/by-pharmacy/${pharmacyId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                ]);
                
                const inventoryItems = inventoryRes.ok ? await inventoryRes.json() : [];
                const expiryRisk = expiryRiskRes.ok ? await expiryRiskRes.json() : { riskItems: [], totalValue: 0 };
                
                // Calculate low stock items
                const lowStockItems = Array.isArray(inventoryItems) 
                  ? inventoryItems.filter((item: any) => item.quantity <= (item.threshold || 0))
                  : [];
                
                // Calculate expired items
                const today = new Date();
                const expiredItems = Array.isArray(inventoryItems)
                  ? inventoryItems.filter((item: any) => {
                      if (!item.expiryDate) return false;
                      return new Date(item.expiryDate) < today;
                    })
                  : [];
                
                return {
                  pharmacyId,
                  pharmacyName: pharmacy.name || "Unknown",
                  totalItems: Array.isArray(inventoryItems) ? inventoryItems.length : 0,
                  lowStockCount: lowStockItems.length,
                  expiringSoonCount: expiryRisk.riskItems?.length || 0,
                  expiredCount: expiredItems.length,
                  totalValueAtRisk: expiryRisk.totalValue || 0,
                };
              } catch (err) {
                console.warn(`Error fetching inventory for pharmacy ${pharmacyId}:`, err);
                return null;
              }
            });
            
            const results = await Promise.all(inventoryPromises);
            branchStockData = results.filter(Boolean);
            inventoryCount = branchStockData.reduce((sum, data) => sum + (data?.totalItems || 0), 0);
          }
        } catch (invError) {
          console.warn("Could not fetch inventory data:", invError);
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
          financeTotal: finance.revenue ?? finance.total ?? 0,
          hospitalsCount: Array.isArray(hospitals) ? hospitals.length : 0,
          pharmaciesCount: Array.isArray(pharmacies) ? pharmacies.length : 0,
          distributorsCount: Array.isArray(distributors) ? distributors.length : 0,
          doctorsCount: Array.isArray(users)
            ? users.filter((u: any) => u.role === "DOCTOR").length
            : 0,
        });
        setBranchStockData(branchStockData);
      } catch (e: any) {
        // Silently handle connection errors (backend might be starting)
        if (e.message?.includes("Failed to fetch") || e.message?.includes("ERR_CONNECTION_REFUSED")) {
          // Backend is not running, show user-friendly message
          if (loading) {
            toast.error(
              <div>
                <div className="font-semibold">Cannot connect to backend server</div>
                <div className="text-sm text-gray-600 mt-1">Please make sure the backend server is running on port 4000</div>
              </div>,
              {
                duration: 5000,
              }
            );
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
              toast.success(
                <div>
                  <div className="font-semibold">{activity.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                </div>,
                {
                  duration: 3000,
                }
              );
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

      const handleOrderDelivered = () => {
        // Refresh stats when order is delivered to update revenue
        fetchStats();
        fetchActivities();
      };

      const handleFinanceUpdated = () => {
        // Refresh stats when finance entries are updated (payment received)
        fetchStats();
      };

      onSocketEvent("appointment:created", handleAppointmentCreated);
      onSocketEvent("prescription:created", handlePrescriptionCreated);
      onSocketEvent("prescription:formatted", handlePrescriptionCreated);
      onSocketEvent("prescription:finalized", handlePrescriptionCreated);
      onSocketEvent("order:created", handleOrderCreated);
      onSocketEvent("order:statusUpdated", handleOrderStatusUpdated);
      onSocketEvent("order:delivered", handleOrderDelivered);
      onSocketEvent("finance:updated", handleFinanceUpdated);

      return () => {
        offSocketEvent("appointment:created", handleAppointmentCreated);
        offSocketEvent("prescription:created", handlePrescriptionCreated);
        offSocketEvent("prescription:formatted", handlePrescriptionCreated);
        offSocketEvent("prescription:finalized", handlePrescriptionCreated);
        offSocketEvent("order:created", handleOrderCreated);
        offSocketEvent("order:statusUpdated", handleOrderStatusUpdated);
        offSocketEvent("order:delivered", handleOrderDelivered);
        offSocketEvent("finance:updated", handleFinanceUpdated);
      };
    }

    // Auto-refresh stats every 10 seconds
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [router]);

  if (!user) return null;

  return (
    <Layout user={user} currentPage="dashboard">
      {/* Fixed Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 mb-6 sm:mb-8 bg-transparent"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Dashboard Overview
            </h1>
              <p className="text-sm text-gray-600">
              Real-time insights into your healthcare ecosystem
            </p>
          </div>
            <div className="flex items-center gap-3 flex-wrap">
            <motion.div
              animate={{
                scale: isPolling ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-300"
            >
              <div
                  className={`h-2.5 w-2.5 rounded-full ${isPolling ? "bg-green-600" : "bg-gray-400"}`}
              />
                <span className="text-xs font-semibold text-gray-700">
                {isPolling ? "Live" : "Paused"}
              </span>
            </motion.div>
              <div className="text-right px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs uppercase tracking-wider text-blue-900 font-semibold leading-[100%]">Role</p>
                <p className="text-sm font-bold text-blue-900 leading-[100%]">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content Area */}
        {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full"
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
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 group cursor-pointer border-l-4 border-l-blue-900 hover:shadow-md transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <HospitalIcon className="w-6 h-6 text-blue-900" />
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Hospitals</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.hospitalsCount ?? 0}</p>
              <p className="text-xs text-gray-600">Healthcare facilities</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 group cursor-pointer border-l-4 border-l-blue-900 hover:shadow-md transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DoctorIcon className="w-6 h-6 text-blue-900" />
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Doctors</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.doctorsCount ?? 0}</p>
              <p className="text-xs text-gray-600">Medical professionals</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 group cursor-pointer border-l-4 border-l-blue-900 hover:shadow-md transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <PharmacyIcon className="w-6 h-6 text-blue-900" />
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Pharmacies</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.pharmaciesCount ?? 0}</p>
              <p className="text-xs text-gray-600">Dispensing units</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 group cursor-pointer border-l-4 border-l-blue-900 hover:shadow-md transition-all h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DistributorIcon className="w-6 h-6 text-blue-900" />
                </div>
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md">Active</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Distributors</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.distributorsCount ?? 0}</p>
              <p className="text-xs text-gray-600">Supply chain partners</p>
            </motion.div>
          </div>

          {/* Operational Metrics - Second Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 h-full border-l-4 border-l-blue-900 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <AppointmentsIcon className="w-6 h-6 text-blue-900" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Appointments</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.appointmentsCount ?? 0}</p>
              <p className="text-xs text-gray-600">Total scheduled visits</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 h-full border-l-4 border-l-blue-900 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <InventoryIcon className="w-6 h-6 text-blue-900" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock Items</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.stockItems ?? 0}</p>
              <p className="text-xs text-gray-600">Pharmacy inventory</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 h-full border-l-4 border-l-blue-900 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <OrdersIcon className="w-6 h-6 text-blue-900" />
                </div>
                <span className="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                  {stats?.pendingOrders ?? 0} Pending
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Patient Orders</h3>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stats?.patientOrders ?? 0}</p>
              <p className="text-xs text-gray-600">
                {stats?.activeOrders ?? 0} Active • {stats?.pendingOrders ?? 0} Pending
              </p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6 group cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-900 h-full"
              onClick={() => router.push("/finance")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <RevenueIcon className="w-6 h-6 text-blue-900" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Revenue</h3>
              <p className="text-3xl sm:text-4xl font-bold text-blue-900 mb-2">₹{(stats?.financeTotal ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600">Net across all units</p>
            </motion.div>
          </div>

          {/* Branch-wise Stock Visibility Section */}
          {branchStockData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Branch Stock Visibility</h2>
                    <p className="text-sm text-gray-600 mt-1">Real-time stock levels, expiry risks, and low-stock alerts per branch</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pharmacy Branch</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Items</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Low Stock</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Expiring Soon</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Expired</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Value at Risk</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branchStockData.map((branch, idx) => {
                      const hasAlerts = branch.lowStockCount > 0 || branch.expiringSoonCount > 0 || branch.expiredCount > 0;
                      return (
                        <motion.tr
                          key={branch.pharmacyId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.95 + idx * 0.05 }}
                          className={`hover:bg-gray-50 transition-colors ${
                            hasAlerts ? "bg-yellow-50/50" : ""
                          }`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-semibold text-sm text-gray-900">{branch.pharmacyName}</div>
                            <div className="text-xs text-gray-500">ID: {branch.pharmacyId.slice(-8)}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-medium text-gray-900">{branch.totalItems}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {branch.lowStockCount > 0 ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                                ⚠️ {branch.lowStockCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {branch.expiringSoonCount > 0 ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                                ⏰ {branch.expiringSoonCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {branch.expiredCount > 0 ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded-full">
                                ❌ {branch.expiredCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            {branch.totalValueAtRisk > 0 ? (
                              <span className="text-sm font-semibold text-red-600">₹{branch.totalValueAtRisk.toFixed(2)}</span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {hasAlerts ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                                Alert
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                                OK
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </Layout>
  );
}
