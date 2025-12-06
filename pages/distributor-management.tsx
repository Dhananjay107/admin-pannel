import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function DistributorManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"distributor" | "stock" | "orders" | "distributor-orders">("distributor");
  
  // Distributor Management State
  const [distributors, setDistributors] = useState<any[]>([]);
  const [newDistributor, setNewDistributor] = useState({ name: "", address: "", phone: "" });
  const [editingDistributor, setEditingDistributor] = useState<any>(null);
  
  // Stock Management State
  const [selectedDistributorForStock, setSelectedDistributorForStock] = useState("");
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [newStockItem, setNewStockItem] = useState({
    medicineName: "",
    batchNumber: "",
    expiryDate: "",
    quantity: 0,
    price: 0,
  });
  const [editingStockItem, setEditingStockItem] = useState<any>(null);
  
  // Order Management State (from pharmacies)
  const [pharmacyOrders, setPharmacyOrders] = useState<any[]>([]);
  const [selectedDistributorForOrders, setSelectedDistributorForOrders] = useState("");
  
  // Distributor Orders State
  const [distributorOrders, setDistributorOrders] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

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
    fetchDistributors();
    fetchDistributorOrders();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDistributorForStock) return;
    fetchStock();
  }, [token, selectedDistributorForStock]);

  useEffect(() => {
    if (!token || !selectedDistributorForOrders) return;
    fetchPharmacyOrders();
  }, [token, selectedDistributorForOrders]);

  const fetchDistributors = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/master/distributors`, { headers });
      setDistributors(res.ok ? await res.json() : []);
    } catch (e) {
      toast.error("Failed to fetch distributors");
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async () => {
    // This would need a distributor stock API endpoint
    // For now, we'll use a placeholder
    setStockItems([]);
  };

  const fetchPharmacyOrders = async () => {
    // Fetch orders sent to this distributor from pharmacies
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/distributor-orders?distributorId=${selectedDistributorForOrders}`, { headers });
      const data = res.ok ? await res.json() : [];
      setPharmacyOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to fetch pharmacy orders");
    }
  };

  const fetchDistributorOrders = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/distributor-orders`, { headers });
      setDistributorOrders(res.ok ? await res.json() : []);
    } catch (e) {
      toast.error("Failed to fetch distributor orders");
    }
  };

  const createDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingDistributor
        ? `${API_BASE}/api/master/distributors/${editingDistributor._id}`
        : `${API_BASE}/api/master/distributors`;
      const method = editingDistributor ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newDistributor),
      });
      if (res.ok) {
        const created = await res.json();
        if (editingDistributor) {
          setDistributors((prev) => prev.map((d) => (d._id === editingDistributor._id ? created : d)));
          setEditingDistributor(null);
        } else {
          setDistributors((prev) => [created, ...prev]);
        }
        setNewDistributor({ name: "", address: "", phone: "" });
        toast.success(`Distributor ${editingDistributor ? "updated" : "created"} successfully!`);
      } else {
        toast.error(`Failed to ${editingDistributor ? "update" : "create"} distributor`);
      }
    } catch (e) {
      toast.error(`Error ${editingDistributor ? "updating" : "creating"} distributor`);
    }
  };

  const deleteDistributor = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this distributor?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/distributors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDistributors((prev) => prev.filter((d) => d._id !== id));
        toast.success("Distributor deleted successfully!");
      } else {
        toast.error("Failed to delete distributor");
      }
    } catch (e) {
      toast.error("Error deleting distributor");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/distributor-orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Order status updated!");
        fetchPharmacyOrders();
        fetchDistributorOrders();
      } else {
        toast.error("Failed to update order status");
      }
    } catch (e) {
      toast.error("Error updating order status");
    }
  };

  if (!user) return null;

  const tabs = [
    { id: "distributor", label: "Distributor Management", icon: "🚚" },
    { id: "stock", label: "Stock Management", icon: "📦" },
    { id: "orders", label: "Order Management", icon: "📋" },
    { id: "distributor-orders", label: "Distributor Orders", icon: "🚛" },
  ];

  return (
    <Layout user={user} currentPage="distributor-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-black">
              Distributor Management
            </h2>
            <p className="text-sm text-gray-600">
              Manage distributors, stock, orders, and distributor orders
            </p>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Distributor Management Tab */}
      {activeTab === "distributor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnimatedCard delay={0.1} className="lg:col-span-1">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingDistributor ? "Edit Distributor" : "Add New Distributor"}
            </h3>
            <form onSubmit={createDistributor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Distributor Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  value={newDistributor.name}
                  onChange={(e) => setNewDistributor((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Address</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  rows={3}
                  value={newDistributor.address}
                  onChange={(e) => setNewDistributor((prev) => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  value={newDistributor.phone}
                  onChange={(e) => setNewDistributor((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                {editingDistributor && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setEditingDistributor(null);
                      setNewDistributor({ name: "", address: "", phone: "" });
                    }}
                    className="flex-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 text-sm transition-all"
                  >
                    Cancel
                  </motion.button>
                )}
                <motion.button
                  type="submit"
                  className={`${editingDistributor ? "flex-1" : "w-full"} rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2.5 text-sm shadow-lg transition-all`}
                >
                  {editingDistributor ? "Update" : "Add Distributor"}
                </motion.button>
              </div>
            </form>
          </AnimatedCard>

          <AnimatedCard delay={0.2} className="lg:col-span-2">
            <h3 className="text-lg font-bold text-black mb-4">Distributors List</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {distributors.map((d, idx) => (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🚚</span>
                        <h4 className="font-bold text-lg text-black">{d.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{d.address}</p>
                      {d.phone && <p className="text-sm text-gray-600">📞 {d.phone}</p>}
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          setEditingDistributor(d);
                          setNewDistributor({ name: d.name, address: d.address, phone: d.phone || "" });
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium"
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button
                        onClick={() => deleteDistributor(d._id)}
                        className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium"
                      >
                        🗑️ Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>
      )}

      {/* Stock Management Tab */}
      {activeTab === "stock" && (
        <AnimatedCard delay={0.1}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">Select Distributor</label>
            <select
              className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              value={selectedDistributorForStock}
              onChange={(e) => setSelectedDistributorForStock(e.target.value)}
            >
              <option value="">Select a distributor</option>
              {distributors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {selectedDistributorForStock && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm text-gray-600 font-medium">Stock Management</p>
              <p className="text-xs text-gray-500 mt-1">Stock management feature coming soon</p>
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Order Management Tab (Pharmacy Orders) */}
      {activeTab === "orders" && (
        <AnimatedCard delay={0.1}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">Select Distributor</label>
            <select
              className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              value={selectedDistributorForOrders}
              onChange={(e) => setSelectedDistributorForOrders(e.target.value)}
            >
              <option value="">Select a distributor</option>
              {distributors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {selectedDistributorForOrders && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pharmacyOrders.map((order, idx) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📋</span>
                        <h4 className="font-bold text-black">{order.medicineName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "ACCEPTED" ? "bg-blue-100 text-blue-700" :
                          order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                      <p className="text-sm text-gray-600">Pharmacy: {order.pharmacyId?.slice(-8)}</p>
                    </div>
                    <div className="flex gap-2">
                      {order.status === "PENDING" && (
                        <motion.button
                          onClick={() => updateOrderStatus(order._id, "ACCEPTED")}
                          className="px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-sm font-medium"
                        >
                          Accept
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {pharmacyOrders.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-gray-600 font-medium">No orders found</p>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Distributor Orders Tab */}
      {activeTab === "distributor-orders" && (
        <AnimatedCard delay={0.1}>
          <h3 className="text-lg font-bold text-black mb-4">All Distributor Orders</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {distributorOrders.map((order, idx) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🚛</span>
                      <h4 className="font-bold text-black">{order.medicineName}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        order.status === "ACCEPTED" ? "bg-blue-100 text-blue-700" :
                        order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                    <p className="text-sm text-gray-600">Pharmacy: {order.pharmacyId?.slice(-8)}</p>
                    <p className="text-sm text-gray-600">Distributor: {order.distributorId?.slice(-8)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {distributorOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🚛</div>
                <p className="text-sm text-gray-600 font-medium">No distributor orders found</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      )}
    </Layout>
  );
}

