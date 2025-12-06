import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function HospitalManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHospital, setNewHospital] = useState({ name: "", address: "", phone: "" });
  const [editingHospital, setEditingHospital] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"hospitals" | "pricing">("hospitals");
  
  // Hospital Service Pricing State
  const [hospitalPricing, setHospitalPricing] = useState<any[]>([]);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  const [newPricing, setNewPricing] = useState({
    serviceType: "HOSPITAL_SERVICE",
    hospitalId: "",
    basePrice: 0,
    discountPercent: 0,
    discountAmount: 0,
    isActive: true,
    validFrom: "",
    validTo: "",
  });

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
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [hospitalsRes, pricingRes] = await Promise.all([
          fetch(`${API_BASE}/api/master/hospitals`, { headers }),
          fetch(`${API_BASE}/api/pricing`, { headers }),
        ]);
        setHospitals(hospitalsRes.ok ? await hospitalsRes.json() : []);
        const pricingData = pricingRes.ok ? await pricingRes.json() : [];
        // Filter for hospital-related pricing
        setHospitalPricing(Array.isArray(pricingData) ? pricingData.filter((p: any) => 
          p.hospitalId || p.serviceType === "HOSPITAL_SERVICE"
        ) : []);
      } catch (e) {
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const createHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingHospital
        ? `${API_BASE}/api/master/hospitals/${editingHospital._id}`
        : `${API_BASE}/api/master/hospitals`;
      const method = editingHospital ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newHospital),
      });
      if (res.ok) {
        const created = await res.json();
        if (editingHospital) {
          setHospitals((prev) => prev.map((h) => (h._id === editingHospital._id ? created : h)));
          setEditingHospital(null);
        } else {
          setHospitals((prev) => [created, ...prev]);
        }
        setNewHospital({ name: "", address: "", phone: "" });
        toast.success(`Hospital ${editingHospital ? "updated" : "created"} successfully!`);
      } else {
        toast.error(`Failed to ${editingHospital ? "update" : "create"} hospital`);
      }
    } catch (e) {
      toast.error(`Error ${editingHospital ? "updating" : "creating"} hospital`);
    }
  };

  const editHospital = (hospital: any) => {
    setEditingHospital(hospital);
    setNewHospital({ name: hospital.name, address: hospital.address, phone: hospital.phone || "" });
  };

  const deleteHospital = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this hospital?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/hospitals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHospitals((prev) => prev.filter((h) => h._id !== id));
        toast.success("Hospital deleted successfully!");
      } else {
        toast.error("Failed to delete hospital");
      }
    } catch (e) {
      toast.error("Error deleting hospital");
    }
  };

  const filteredHospitals = hospitals.filter((h) =>
    h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.phone?.includes(searchQuery)
  );

  const createPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const payload: any = {
        serviceType: newPricing.serviceType,
        basePrice: Number(newPricing.basePrice),
        isActive: newPricing.isActive,
      };
      if (newPricing.hospitalId) payload.hospitalId = newPricing.hospitalId;
      if (newPricing.discountPercent) payload.discountPercent = Number(newPricing.discountPercent);
      if (newPricing.discountAmount) payload.discountAmount = Number(newPricing.discountAmount);
      if (newPricing.validFrom) payload.validFrom = new Date(newPricing.validFrom);
      if (newPricing.validTo) payload.validTo = new Date(newPricing.validTo);

      const url = editingPricing
        ? `${API_BASE}/api/pricing/${editingPricing._id}`
        : `${API_BASE}/api/pricing`;
      const method = editingPricing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`Hospital service charge ${editingPricing ? "updated" : "created"} successfully!`);
        setShowAddPricingModal(false);
        setEditingPricing(null);
        setNewPricing({
          serviceType: "HOSPITAL_SERVICE",
          hospitalId: "",
          basePrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          isActive: true,
          validFrom: "",
          validTo: "",
        });
        // Refresh pricing
        const pricingRes = await fetch(`${API_BASE}/api/pricing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pricingData = pricingRes.ok ? await pricingRes.json() : [];
        setHospitalPricing(Array.isArray(pricingData) ? pricingData.filter((p: any) => 
          p.hospitalId || p.serviceType === "HOSPITAL_SERVICE"
        ) : []);
      } else {
        toast.error(`Failed to ${editingPricing ? "update" : "create"} service charge`);
      }
    } catch (e) {
      toast.error(`Error ${editingPricing ? "updating" : "creating"} service charge`);
    }
  };

  const deletePricing = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this service charge?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/pricing/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHospitalPricing((prev) => prev.filter((p) => p._id !== id));
        toast.success("Service charge deleted successfully!");
      } else {
        toast.error("Failed to delete service charge");
      }
    } catch (e) {
      toast.error("Error deleting service charge");
    }
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="hospital-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-black">
              Hospital Management
            </h2>
            <p className="text-sm text-black">
              Add, update, and manage hospitals and their service charges
            </p>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2">
          <motion.button
            onClick={() => setActiveTab("hospitals")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border-2 ${
              activeTab === "hospitals"
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "bg-white text-black border-black hover:bg-blue-50 hover:border-blue-600"
            }`}
          >
            <span>🏥</span>
            <span>Hospitals</span>
          </motion.button>
          <motion.button
            onClick={() => setActiveTab("pricing")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border-2 ${
              activeTab === "pricing"
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "bg-white text-black border-black hover:bg-blue-50 hover:border-blue-600"
            }`}
          >
            <span>💵</span>
            <span>Hospital Service Charges</span>
          </motion.button>
        </div>
      </div>

      {/* Hospitals Tab */}
      {activeTab === "hospitals" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add/Edit Hospital Form */}
          <AnimatedCard delay={0.1} className="lg:col-span-1">
          <h3 className="text-lg font-bold text-black mb-4">
            {editingHospital ? "Edit Hospital" : "Add New Hospital"}
          </h3>
          <form onSubmit={createHospital} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">Hospital Name</label>
              <input
                type="text"
                className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter hospital name"
                value={newHospital.name}
                onChange={(e) => setNewHospital((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">Address</label>
              <textarea
                className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter hospital address"
                rows={3}
                value={newHospital.address}
                onChange={(e) => setNewHospital((prev) => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">Phone (Optional)</label>
              <input
                type="tel"
                className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter phone number"
                value={newHospital.phone}
                onChange={(e) => setNewHospital((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              {editingHospital && (
                <motion.button
                  type="button"
                  onClick={() => {
                    setEditingHospital(null);
                    setNewHospital({ name: "", address: "", phone: "" });
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 rounded-lg bg-white border-2 border-black hover:bg-black hover:text-white text-black font-semibold py-2.5 text-sm transition-all"
                >
                  Cancel
                </motion.button>
              )}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${editingHospital ? "flex-1" : "w-full"} rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 text-sm shadow-lg transition-all`}
              >
                {editingHospital ? "Update Hospital" : "Add Hospital"}
              </motion.button>
            </div>
          </form>
        </AnimatedCard>

        {/* Hospitals List */}
        <AnimatedCard delay={0.2} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-black">Hospitals List</h3>
            <input
              type="text"
              placeholder="Search hospitals..."
              className="rounded-lg border-2 border-black px-4 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredHospitals.map((h, idx) => (
                <motion.div
                  key={h._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-2 border-blue-200 rounded-lg p-4 bg-white hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🏥</span>
                        <h4 className="font-bold text-lg text-black">{h.name}</h4>
                      </div>
                      <p className="text-sm text-black mb-1 break-words">{h.address}</p>
                      {h.phone && (
                        <p className="text-sm text-black">📞 {h.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <motion.button
                        onClick={() => editHospital(h)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium transition-all"
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button
                        onClick={() => deleteHospital(h._id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium transition-all"
                      >
                        🗑️ Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredHospitals.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🏥</div>
                  <p className="text-sm text-black font-medium">No hospitals found</p>
                  <p className="text-xs text-black mt-1">
                    {searchQuery ? "Try adjusting your search" : "Add a hospital to get started"}
                  </p>
                </div>
              )}
            </div>
          )}
          </AnimatedCard>
        </div>
      )}

      {/* Hospital Service Pricing Tab */}
      {activeTab === "pricing" && (
        <>
          <AnimatedCard delay={0.1} className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-black">Hospital Service Charges</h3>
              <motion.button
                onClick={() => {
                  setShowAddPricingModal(true);
                  setEditingPricing(null);
                  setNewPricing({
                    serviceType: "HOSPITAL_SERVICE",
                    hospitalId: "",
                    basePrice: 0,
                    discountPercent: 0,
                    discountAmount: 0,
                    isActive: true,
                    validFrom: "",
                    validTo: "",
                  });
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm shadow-lg transition-all"
              >
                + Add Service Charge
              </motion.button>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {hospitalPricing.map((p, idx) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-2 border-blue-200 rounded-lg p-4 bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                          {p.serviceType}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="font-semibold text-black mb-1">
                        Base Price: ₹{p.basePrice.toLocaleString()}
                      </p>
                      {p.hospitalId && (
                        <p className="text-sm text-black">
                          Hospital: {hospitals.find(h => h._id === p.hospitalId)?.name || p.hospitalId.slice(-8)}
                        </p>
                      )}
                      {(p.discountPercent || p.discountAmount) && (
                        <p className="text-sm text-green-600">
                          Discount: {p.discountPercent ? `${p.discountPercent}%` : `₹${p.discountAmount}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          setEditingPricing(p);
                          setNewPricing({
                            serviceType: p.serviceType,
                            hospitalId: p.hospitalId || "",
                            basePrice: p.basePrice,
                            discountPercent: p.discountPercent || 0,
                            discountAmount: p.discountAmount || 0,
                            isActive: p.isActive,
                            validFrom: p.validFrom ? new Date(p.validFrom).toISOString().split('T')[0] : "",
                            validTo: p.validTo ? new Date(p.validTo).toISOString().split('T')[0] : "",
                          });
                          setShowAddPricingModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium"
                      >
                        ✏️ Edit
                      </motion.button>
                      <motion.button
                        onClick={() => deletePricing(p._id)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium"
                      >
                        🗑️ Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {hospitalPricing.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💵</div>
                  <p className="text-sm text-black font-medium">No hospital service charges found</p>
                </div>
              )}
            </div>
          </AnimatedCard>

          {/* Add/Edit Pricing Modal */}
          {showAddPricingModal && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowAddPricingModal(false);
                setEditingPricing(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-black">
                    {editingPricing ? "Edit" : "Add"} Hospital Service Charge
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddPricingModal(false);
                      setEditingPricing(null);
                    }}
                    className="text-black hover:text-blue-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={createPricing} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Service Type</label>
                    <select
                      className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={newPricing.serviceType}
                      onChange={(e) => setNewPricing((prev) => ({ ...prev, serviceType: e.target.value }))}
                      required
                    >
                      <option value="HOSPITAL_SERVICE">Hospital Service</option>
                      <option value="EMERGENCY_SERVICE">Emergency Service</option>
                      <option value="OPD_SERVICE">OPD Service</option>
                      <option value="IPD_SERVICE">IPD Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Select Hospital (Optional)</label>
                    <select
                      className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={newPricing.hospitalId}
                      onChange={(e) => setNewPricing((prev) => ({ ...prev, hospitalId: e.target.value }))}
                    >
                      <option value="">All Hospitals</option>
                      {hospitals.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Base Price (₹)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={newPricing.basePrice}
                      onChange={(e) => setNewPricing((prev) => ({ ...prev, basePrice: Number(e.target.value) }))}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Discount %</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={newPricing.discountPercent}
                        onChange={(e) => setNewPricing((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Discount Amount (₹)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border-2 border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={newPricing.discountAmount}
                        onChange={(e) => setNewPricing((prev) => ({ ...prev, discountAmount: Number(e.target.value) }))}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      onClick={() => {
                        setShowAddPricingModal(false);
                        setEditingPricing(null);
                      }}
                      className="flex-1 rounded-lg bg-white border-2 border-black hover:bg-black hover:text-white text-black font-semibold py-2.5 text-sm transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 text-sm shadow-lg transition-all"
                    >
                      {editingPricing ? "Update" : "Create"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

