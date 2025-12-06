import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type OrderStatus = "PENDING" | "ORDER_RECEIVED" | "MEDICINE_RECEIVED" | "SENT_TO_PHARMACY" | "ACCEPTED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export default function OrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!storedUser || !t) {
      router.replace("/");
      return;
    }
    setUser(JSON.parse(storedUser));
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchOrders();
  }, [token, filterStatus]);

  // Poll for order updates every 5 seconds
  useEffect(() => {
    if (!token) return;

    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/orders`, { headers });
      if (res.ok) {
        const data = await res.json();
        let filtered = Array.isArray(data) ? data : [];
        
        // Detect new orders (PENDING status) that weren't in previous list
        const currentOrderIds = new Set(filtered.map((o: any) => o._id));
        const newPendingOrders = filtered.filter((o: any) => 
          o.status === "PENDING" && !previousOrderIdsRef.current.has(o._id)
        );
        
        // Show toast for new pending orders (only if not initial load)
        if (previousOrderIdsRef.current.size > 0 && newPendingOrders.length > 0) {
          newPendingOrders.forEach((order: any) => {
            toast.success("📦 New Order Received!", {
              description: `Order #${order._id.slice(-8)} is waiting for approval`,
              duration: 5000,
              icon: "📦",
            });
          });
        }
        
        // Update previous order IDs
        previousOrderIdsRef.current = currentOrderIds;
        
        // Filter by status
        if (filterStatus !== "ALL") {
          filtered = filtered.filter((o: any) => o.status === filterStatus);
        }
        
        setOrders(filtered);
      } else {
        if (res.status === 0 || res.status === 503) {
          // Connection refused or service unavailable
          toast.error("Backend server is not running", {
            description: "Please start the backend server on port 4000",
            duration: 5000,
          });
        } else {
          toast.error("Failed to fetch orders");
        }
      }
    } catch (e: any) {
      // Silently handle connection errors during polling
      if (e.message?.includes("Failed to fetch") || e.message?.includes("ERR_CONNECTION_REFUSED")) {
        // Only show error on initial load, not during polling
        if (loading) {
          toast.error("Cannot connect to backend server", {
            description: "Please make sure the backend server is running",
            duration: 5000,
          });
        }
      } else {
        console.error("Error fetching orders:", e);
        toast.error("Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccept = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/admin-accept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        toast.success("✅ Order Accepted", {
          description: `Order #${orderId.slice(-8)} is now ORDER_RECEIVED`,
          duration: 3000,
        });
        fetchOrders();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || "Failed to accept order";
        toast.error(errorMessage, {
          description: errorMessage.includes("already") 
            ? "This order has already been processed. Please refresh the page."
            : "Please try again or contact support.",
          duration: 5000,
        });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message || "Unknown error"}`, {
        duration: 4000,
      });
    }
  };

  const handleReceiveMedicine = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/admin-receive-medicine`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success("Medicine received marked successfully");
        fetchOrders();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Failed to update order");
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message || "Unknown error"}`);
    }
  };

  const handleSendToPharmacy = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/admin-send-to-pharmacy`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success("Order sent to pharmacy successfully");
        fetchOrders();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Failed to send to pharmacy");
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message || "Unknown error"}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
      case "ORDER_RECEIVED":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "MEDICINE_RECEIVED":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "SENT_TO_PHARMACY":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "ACCEPTED":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "PACKED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "OUT_FOR_DELIVERY":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "DELIVERED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-slate-700/20 text-slate-300 border-slate-700/30";
    }
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="orders">
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
          Order Management
        </h2>
        <p className="text-xs sm:text-sm text-indigo-300/70">
          Accept orders, receive medicines from suppliers, and send to pharmacies.
        </p>
      </motion.header>

      {/* Status Filter */}
      <AnimatedCard delay={0.1} className="mb-6">
        <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
          {["ALL", "PENDING", "ORDER_RECEIVED", "MEDICINE_RECEIVED", "SENT_TO_PHARMACY"].map((status) => (
            <motion.button
              key={status}
              onClick={() => setFilterStatus(status)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filterStatus === status
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg"
                  : "bg-slate-900/50 text-indigo-300 border border-indigo-900/30 hover:border-emerald-500/30"
              }`}
            >
              {status.replace(/_/g, " ")}
            </motion.button>
          ))}
        </div>
      </AnimatedCard>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <AnimatedCard delay={0.2}>
          <h3 className="text-lg font-semibold mb-4 text-emerald-300">
            All Orders ({orders.length})
          </h3>
          <div className="max-h-[600px] overflow-y-auto space-y-3">
            {orders.map((o, idx) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border border-indigo-900/30 rounded-xl p-4 bg-slate-950/30 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-indigo-100">
                      Order #{o._id.slice(-8)}
                    </p>
                    <p className="text-xs text-indigo-400/60 mt-1 break-words">
                      Patient: {o.patientId?.slice(-8)} · Pharmacy: {o.pharmacyId?.slice(-8)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {o.items?.map((it: any, idx: number) => (
                        <div key={idx} className="text-xs text-indigo-200 break-words">
                          {it.medicineName} × {it.quantity}
                        </div>
                      ))}
                    </div>
                    {o.deliveryType && (
                      <p className="text-xs text-indigo-400/50 mt-2 break-words">
                        Delivery: {o.deliveryType}
                        {o.address && ` · ${o.address}`}
                      </p>
                    )}
                  </div>
                  <div className="sm:ml-4 flex flex-col gap-2 flex-shrink-0">
                    <span className={`text-xs px-3 py-1 rounded-lg font-medium whitespace-nowrap ${getStatusColor(o.status)}`}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                
                {/* Admin Action Buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {o.status === "PENDING" && (
                    <motion.button
                      onClick={() => handleAdminAccept(o._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-medium text-blue-300 transition-all"
                    >
                      ✅ Accept Order
                    </motion.button>
                  )}
                  {o.status === "ORDER_RECEIVED" && (
                    <motion.button
                      onClick={() => handleReceiveMedicine(o._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-medium text-cyan-300 transition-all"
                    >
                      📦 Medicine Received
                    </motion.button>
                  )}
                  {o.status === "MEDICINE_RECEIVED" && (
                    <motion.button
                      onClick={() => handleSendToPharmacy(o._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-medium text-purple-300 transition-all"
                    >
                      🚚 Send to Pharmacy
                    </motion.button>
                  )}
                  {o.status === "SENT_TO_PHARMACY" && (
                    <span className="text-xs text-indigo-400/60 px-3 py-1.5">
                      Waiting for pharmacy to accept...
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            {orders.length === 0 && (
              <p className="text-sm text-indigo-400/60 text-center py-8">
                No orders found{filterStatus !== "ALL" ? ` with status ${filterStatus}` : ""}.
              </p>
            )}
          </div>
        </AnimatedCard>
      )}
    </Layout>
  );
}

