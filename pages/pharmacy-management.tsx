import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function PharmacyManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"pharmacy" | "orders" | "medicines" | "inventory">("pharmacy");
  
  // Pharmacy Management State
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [newPharmacy, setNewPharmacy] = useState({ name: "", address: "", phone: "" });
  const [editingPharmacy, setEditingPharmacy] = useState<any>(null);
  
  // Orders State
  const [pharmacyId, setPharmacyId] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedPharmacyForOrders, setSelectedPharmacyForOrders] = useState("");
  
  // Medicines State
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedPharmacyForMedicines, setSelectedPharmacyForMedicines] = useState("");
  
  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedPharmacyForInventory, setSelectedPharmacyForInventory] = useState("");
  const [newItem, setNewItem] = useState({
    medicineName: "",
    batchNumber: "",
    expiryDate: "",
    quantity: 0,
    threshold: 10,
    distributorId: "",
  });
  const [editingItem, setEditingItem] = useState<any>(null);
  
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
    fetchPharmacies();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedPharmacyForOrders) return;
    fetchOrders();
  }, [token, selectedPharmacyForOrders]);

  useEffect(() => {
    if (!token || !selectedPharmacyForMedicines) return;
    fetchMedicines();
  }, [token, selectedPharmacyForMedicines]);

  useEffect(() => {
    if (!token || !selectedPharmacyForInventory) return;
    fetchInventory();
  }, [token, selectedPharmacyForInventory]);

  const fetchPharmacies = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/master/pharmacies`, { headers });
      setPharmacies(res.ok ? await res.json() : []);
    } catch (e) {
      toast.error("Failed to fetch pharmacies");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!selectedPharmacyForOrders) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/orders/by-pharmacy/${selectedPharmacyForOrders}`, { headers });
      setOrders(res.ok ? await res.json() : []);
    } catch (e) {
      toast.error("Failed to fetch orders");
    }
  };

  const fetchMedicines = async () => {
    if (!selectedPharmacyForMedicines) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/inventory/by-pharmacy/${selectedPharmacyForMedicines}`, { headers });
      const data = res.ok ? await res.json() : [];
      setMedicines(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to fetch medicines");
    }
  };

  const fetchInventory = async () => {
    if (!selectedPharmacyForInventory) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/inventory/by-pharmacy/${selectedPharmacyForInventory}`, { headers });
      const data = res.ok ? await res.json() : [];
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to fetch inventory");
    }
  };

  const createPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingPharmacy
        ? `${API_BASE}/api/master/pharmacies/${editingPharmacy._id}`
        : `${API_BASE}/api/master/pharmacies`;
      const method = editingPharmacy ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPharmacy),
      });
      if (res.ok) {
        const created = await res.json();
        if (editingPharmacy) {
          setPharmacies((prev) => prev.map((p) => (p._id === editingPharmacy._id ? created : p)));
          setEditingPharmacy(null);
        } else {
          setPharmacies((prev) => [created, ...prev]);
        }
        setNewPharmacy({ name: "", address: "", phone: "" });
        toast.success(`Pharmacy ${editingPharmacy ? "updated" : "created"} successfully!`);
      } else {
        toast.error(`Failed to ${editingPharmacy ? "update" : "create"} pharmacy`);
      }
    } catch (e) {
      toast.error(`Error ${editingPharmacy ? "updating" : "creating"} pharmacy`);
    }
  };

  const deletePharmacy = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this pharmacy?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/pharmacies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPharmacies((prev) => prev.filter((p) => p._id !== id));
        toast.success("Pharmacy deleted successfully!");
      } else {
        toast.error("Failed to delete pharmacy");
      }
    } catch (e) {
      toast.error("Error deleting pharmacy");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Order status updated!");
        fetchOrders();
      } else {
        toast.error("Failed to update order status");
      }
    } catch (e) {
      toast.error("Error updating order status");
    }
  };

  const createInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPharmacyForInventory) return;
    try {
      const payload = { ...newItem, pharmacyId: selectedPharmacyForInventory };
      const url = editingItem
        ? `${API_BASE}/api/inventory/${editingItem._id}`
        : `${API_BASE}/api/inventory`;
      const method = editingItem ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`Item ${editingItem ? "updated" : "added"} successfully!`);
        setNewItem({
          medicineName: "",
          batchNumber: "",
          expiryDate: "",
          quantity: 0,
          threshold: 10,
          distributorId: "",
        });
        setEditingItem(null);
        fetchInventory();
      } else {
        toast.error(`Failed to ${editingItem ? "update" : "add"} item`);
      }
    } catch (e) {
      toast.error(`Error ${editingItem ? "updating" : "adding"} item`);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/inventory/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInventoryItems((prev) => prev.filter((i) => i._id !== id));
        toast.success("Item deleted successfully!");
        fetchInventory();
      } else {
        toast.error("Failed to delete item");
      }
    } catch (e) {
      toast.error("Error deleting item");
    }
  };

  if (!user) return null;

  const tabs = [
    { id: "pharmacy", label: "Pharmacy Management", icon: "💊" },
    { id: "orders", label: "Receive Orders", icon: "📦" },
    { id: "medicines", label: "Medicines List", icon: "💉" },
    { id: "inventory", label: "Inventory & Stock", icon: "📋" },
  ];

  return (
    <Layout user={user} currentPage="pharmacy-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-black">
              Pharmacy Management
            </h2>
            <p className="text-sm text-gray-600">
              Manage pharmacies, receive orders, list medicines, and handle inventory
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
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Pharmacy Management Tab */}
      {activeTab === "pharmacy" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnimatedCard delay={0.1} className="lg:col-span-1">
            <h3 className="text-lg font-bold text-black mb-4">
              {editingPharmacy ? "Edit Pharmacy" : "Add New Pharmacy"}
            </h3>
            <form onSubmit={createPharmacy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Pharmacy Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  value={newPharmacy.name}
                  onChange={(e) => setNewPharmacy((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Address</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  rows={3}
                  value={newPharmacy.address}
                  onChange={(e) => setNewPharmacy((prev) => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  value={newPharmacy.phone}
                  onChange={(e) => setNewPharmacy((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                {editingPharmacy && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setEditingPharmacy(null);
                      setNewPharmacy({ name: "", address: "", phone: "" });
                    }}
                    className="flex-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 text-sm transition-all"
                  >
                    Cancel
                  </motion.button>
                )}
                <motion.button
                  type="submit"
                  className={`${editingPharmacy ? "flex-1" : "w-full"} rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2.5 text-sm shadow-lg transition-all`}
                >
                  {editingPharmacy ? "Update" : "Add Pharmacy"}
                </motion.button>
              </div>
            </form>
          </AnimatedCard>

          <AnimatedCard delay={0.2} className="lg:col-span-2">
            <h3 className="text-lg font-bold text-black mb-4">Pharmacies List</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pharmacies.map((p, idx) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">💊</span>
                        <h4 className="font-bold text-lg text-black">{p.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{p.address}</p>
                      {p.phone && <p className="text-sm text-gray-600">📞 {p.phone}</p>}
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          setEditingPharmacy(p);
                          setNewPharmacy({ name: p.name, address: p.address, phone: p.phone || "" });
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium"
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button
                        onClick={() => deletePharmacy(p._id)}
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

      {/* Receive Orders Tab */}
      {activeTab === "orders" && (
        <AnimatedCard delay={0.1}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">Select Pharmacy</label>
            <select
              className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              value={selectedPharmacyForOrders}
              onChange={(e) => setSelectedPharmacyForOrders(e.target.value)}
            >
              <option value="">Select a pharmacy</option>
              {pharmacies.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPharmacyForOrders && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {orders.map((order, idx) => (
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
                        <span className="text-xl">📦</span>
                        <h4 className="font-bold text-black">Order #{order._id.slice(-8)}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "ACCEPTED" ? "bg-blue-100 text-blue-700" :
                          order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Patient: {order.patientId || "N/A"}</p>
                      <p className="text-sm text-gray-600">Date: {new Date(order.createdAt).toLocaleString()}</p>
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
                      {order.status === "ACCEPTED" && (
                        <motion.button
                          onClick={() => updateOrderStatus(order._id, "PACKED")}
                          className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium"
                        >
                          Mark Packed
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-sm text-gray-600 font-medium">No orders found</p>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Medicines List Tab */}
      {activeTab === "medicines" && (
        <AnimatedCard delay={0.1}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">Select Pharmacy</label>
            <select
              className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              value={selectedPharmacyForMedicines}
              onChange={(e) => setSelectedPharmacyForMedicines(e.target.value)}
            >
              <option value="">Select a pharmacy</option>
              {pharmacies.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPharmacyForMedicines && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {medicines.map((med, idx) => (
                <motion.div
                  key={med._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💉</span>
                        <h4 className="font-bold text-black">{med.medicineName}</h4>
                        {med.quantity <= med.threshold && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Batch: {med.batchNumber}</p>
                      <p className="text-sm text-gray-600">Expiry: {new Date(med.expiryDate).toLocaleDateString()}</p>
                      <p className="text-sm font-semibold text-green-600 mt-2">Quantity: {med.quantity}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {medicines.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💉</div>
                  <p className="text-sm text-gray-600 font-medium">No medicines found</p>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      )}

      {/* Inventory & Stock Tab */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard delay={0.1}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">Select Pharmacy</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                value={selectedPharmacyForInventory}
                onChange={(e) => setSelectedPharmacyForInventory(e.target.value)}
              >
                <option value="">Select a pharmacy</option>
                {pharmacies.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPharmacyForInventory && (
              <>
                <h3 className="text-lg font-bold text-black mb-4">
                  {editingItem ? "Edit Item" : "Add Stock Item"}
                </h3>
                <form onSubmit={createInventoryItem} className="space-y-3">
                  <input
                    placeholder="Medicine name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={newItem.medicineName}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, medicineName: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Batch number"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={newItem.batchNumber}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    required
                  />
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={newItem.expiryDate}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    required
                  />
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Quantity"
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                      required
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Threshold"
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      value={newItem.threshold}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
                      required
                      min="0"
                    />
                  </div>
                  <input
                    placeholder="Distributor ID (optional)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={newItem.distributorId}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, distributorId: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    {editingItem && (
                      <motion.button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setNewItem({
                            medicineName: "",
                            batchNumber: "",
                            expiryDate: "",
                            quantity: 0,
                            threshold: 10,
                            distributorId: "",
                          });
                        }}
                        className="flex-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 text-sm transition-all"
                      >
                        Cancel
                      </motion.button>
                    )}
                    <motion.button
                      type="submit"
                      className={`${editingItem ? "flex-1" : "w-full"} rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2.5 text-sm shadow-lg transition-all`}
                    >
                      {editingItem ? "Update" : "Add Item"}
                    </motion.button>
                  </div>
                </form>
              </>
            )}
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <h3 className="text-lg font-bold text-black mb-4">Current Stock</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {inventoryItems.map((item, idx) => {
                const isLowStock = item.quantity <= item.threshold;
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border rounded-lg p-4 ${
                      isLowStock ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                    } hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-black">{item.medicineName}</h4>
                          {isLowStock && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Batch: {item.batchNumber}</p>
                        <p className="text-sm text-gray-600">Expiry: {new Date(item.expiryDate).toLocaleDateString()}</p>
                        <p className={`text-lg font-bold mt-2 ${isLowStock ? "text-red-600" : "text-green-600"}`}>
                          {item.quantity} / {item.threshold}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            setEditingItem(item);
                            setNewItem({
                              medicineName: item.medicineName,
                              batchNumber: item.batchNumber,
                              expiryDate: item.expiryDate,
                              quantity: item.quantity,
                              threshold: item.threshold,
                              distributorId: item.distributorId || "",
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium"
                        >
                          ✏️
                        </motion.button>
                        <motion.button
                          onClick={() => deleteInventoryItem(item._id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium"
                        >
                          🗑️
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {inventoryItems.length === 0 && selectedPharmacyForInventory && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-gray-600 font-medium">No inventory items</p>
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>
      )}
    </Layout>
  );
}

