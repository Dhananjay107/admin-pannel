import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { PharmacyIcon, PlusIcon, EditIcon, DeleteIcon, EyeIcon, EyeOffIcon } from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function PharmacyManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Pharmacy Management State
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Form states
  const [pharmacyForm, setPharmacyForm] = useState({ 
    name: "", 
    address: "", 
    phone: "",
    email: "",
    password: "",
    distributorId: ""
  });
  
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
    fetchDistributors();
  }, [token]);

  const fetchDistributors = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/master/distributors`, { headers });
      setDistributors(res.ok ? await res.json() : []);
    } catch (e) {
      console.error("Failed to fetch distributors:", e);
    }
  };

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

  const createPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      // First create the pharmacy
      const pharmacyRes = await fetch(`${API_BASE}/api/master/pharmacies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pharmacyForm.name,
          address: pharmacyForm.address,
          phone: pharmacyForm.phone,
          distributorId: pharmacyForm.distributorId || undefined, // Include distributorId if provided
        }),
      });
      
      if (!pharmacyRes.ok) {
        const error = await pharmacyRes.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create pharmacy");
      }

      const createdPharmacy = await pharmacyRes.json();

      // Then create login credentials if email and password are provided
      if (pharmacyForm.email && pharmacyForm.password) {
        const userRes = await fetch(`${API_BASE}/api/users/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: pharmacyForm.name,
            email: pharmacyForm.email,
            password: pharmacyForm.password,
            role: "PHARMACY_STAFF",
            pharmacyId: createdPharmacy._id,
          }),
        });

        if (!userRes.ok) {
          const error = await userRes.json().catch(() => ({}));
          // Pharmacy was created but user creation failed - still show pharmacy
          toast.error(error.message || "Pharmacy created but failed to create login credentials");
        } else {
          toast.success("Pharmacy and login credentials created successfully!");
        }
      } else {
        toast.success("Pharmacy created successfully! You can create login credentials later.");
      }

      setPharmacies((prev) => [createdPharmacy, ...prev]);
      setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "", distributorId: "" });
      setShowAddModal(false);
    } catch (e: any) {
      toast.error(e.message || "Error creating pharmacy");
    }
  };

  const updatePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingPharmacy) return;
    try {
      // Update pharmacy details
      const pharmacyRes = await fetch(`${API_BASE}/api/master/pharmacies/${editingPharmacy._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pharmacyForm.name,
          address: pharmacyForm.address,
          phone: pharmacyForm.phone,
          distributorId: pharmacyForm.distributorId || undefined, // Include distributorId if provided
        }),
      });
      
      if (!pharmacyRes.ok) {
        const error = await pharmacyRes.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update pharmacy");
      }

      // Update login credentials if email and password are provided
      if (pharmacyForm.email && pharmacyForm.password) {
        const userRes = await fetch(`${API_BASE}/api/users/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: pharmacyForm.name,
            email: pharmacyForm.email,
            password: pharmacyForm.password,
            role: "PHARMACY_STAFF",
            pharmacyId: editingPharmacy._id,
          }),
        });

        if (!userRes.ok) {
          const error = await userRes.json().catch(() => ({}));
          toast("Pharmacy updated but failed to update login credentials: " + (error.message || "Unknown error"), {
            icon: "⚠️",
            duration: 4000,
          });
        } else {
          toast.success("Pharmacy and login credentials updated successfully!");
        }
      } else {
        toast.success("Pharmacy updated successfully!");
      }

      const updated = await pharmacyRes.json();
      setPharmacies((prev) => prev.map((p) => (p._id === editingPharmacy._id ? updated : p)));
      setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "", distributorId: "" });
      setShowEditModal(false);
      setEditingPharmacy(null);
      setShowEditPassword(false);
    } catch (e: any) {
      toast.error(e.message || "Error updating pharmacy");
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

  const openEditModal = async (pharmacy: any) => {
    setEditingPharmacy(pharmacy);
    setPharmacyForm({ 
      name: pharmacy.name || "", 
      address: pharmacy.address || "", 
      phone: pharmacy.phone || "",
      email: "",
      password: "",
      distributorId: pharmacy.distributorId || ""
    });
    setShowEditModal(true);
    setShowEditPassword(false);

    // Fetch existing user email for this pharmacy
    if (token) {
      try {
        const userRes = await fetch(`${API_BASE}/api/users?pharmacyId=${pharmacy._id}&role=PHARMACY_STAFF`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const users = await userRes.json();
          // Handle both array and object responses
          const userList = Array.isArray(users) ? users : (users.users || []);
          if (userList.length > 0) {
            const pharmacyUser = userList[0];
            if (pharmacyUser && pharmacyUser.email) {
              setPharmacyForm(prev => ({
                ...prev,
                email: pharmacyUser.email
              }));
            }
          }
        }
      } catch (e) {
        // Silently fail - email field will just be empty
        console.log("Could not fetch pharmacy user email:", e);
      }
    }
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="pharmacy-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 mb-6 sm:mb-8 bg-transparent"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-gray-900">
                Pharmacy Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage pharmacies and create login credentials for pharmacy staff
              </p>
            </div>
            <motion.button
              onClick={() => {
                setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "", distributorId: "" });
                setShowPassword(false);
                setShowAddModal(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add New Pharmacy</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Pharmacies Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pharmacies.map((p, idx) => (
            <AnimatedCard key={p._id} delay={idx * 0.1}>
              <div className="p-6 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                      <PharmacyIcon className="w-6 h-6 text-blue-900" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">ID: {p._id.slice(-8)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">📍</span>
                    <p className="text-sm text-gray-600 flex-1">{p.address}</p>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📞</span>
                      <p className="text-sm text-gray-600">{p.phone}</p>
                    </div>
                  )}
                  {p.distributorId && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🚚</span>
                      <p className="text-sm text-gray-600">
                        Linked to: {distributors.find(d => d._id === p.distributorId)?.name || `Distributor ${p.distributorId.slice(-8)}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <motion.button
                    onClick={() => openEditModal(p)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </motion.button>
                  <motion.button
                    onClick={() => deletePharmacy(p._id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium transition-all flex items-center justify-center"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </AnimatedCard>
          ))}
          
          {pharmacies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                  <PharmacyIcon className="w-10 h-10 text-blue-900" />
                </div>
              </div>
              <p className="text-lg text-gray-700 font-medium mb-2">No pharmacies found</p>
              <p className="text-sm text-gray-600">Click "Add New Pharmacy" to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Add Pharmacy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Pharmacy</h2>
            <form onSubmit={createPharmacy} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pharmacy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pharmacyForm.name}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter pharmacy name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={pharmacyForm.address}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter pharmacy address"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={pharmacyForm.phone}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Distributor
                </label>
                <select
                  value={pharmacyForm.distributorId}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, distributorId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                >
                  <option value="">Select a distributor (optional)</option>
                  {distributors.map((distributor) => (
                    <option key={distributor._id} value={distributor._id}>
                      {distributor.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Link this pharmacy to a distributor</p>
              </div>

              <div className="pt-4 border-t border-gray-300">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Login Credentials</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="new-password"
                      value={pharmacyForm.email}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                      placeholder="pharmacy@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">This will be used to login to the pharmacy panel</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={pharmacyForm.password}
                        onChange={(e) => setPharmacyForm({ ...pharmacyForm, password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                        placeholder="Enter new password for pharmacy"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters - Create a new password for pharmacy access</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Create Pharmacy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "", distributorId: "" });
                    setShowPassword(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Pharmacy Modal */}
      {showEditModal && editingPharmacy && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Pharmacy</h2>
            <form onSubmit={updatePharmacy} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pharmacy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pharmacyForm.name}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={pharmacyForm.address}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={pharmacyForm.phone}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Distributor {editingPharmacy && editingPharmacy.distributorId && (
                    <span className="text-xs font-normal text-gray-500">
                      (Current: {distributors.find(d => d._id === editingPharmacy.distributorId)?.name || editingPharmacy.distributorId.slice(-8)})
                    </span>
                  )}
                </label>
                <select
                  value={pharmacyForm.distributorId}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, distributorId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                >
                  <option value="">Select a distributor (optional)</option>
                  {distributors.map((distributor) => (
                    <option key={distributor._id} value={distributor._id}>
                      {distributor.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Link this pharmacy to a distributor. This will show in the distributor portal.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-300">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Login Credentials</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      autoComplete="new-password"
                      value={pharmacyForm.email}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                      placeholder="pharmacy@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing credentials</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={pharmacyForm.password || ""}
                        onChange={(e) => setPharmacyForm({ ...pharmacyForm, password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                        placeholder="Enter new password (leave empty to keep existing)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
                        tabIndex={-1}
                      >
                        {showEditPassword ? (
                          <EyeOffIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters - Leave empty to keep existing password</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Update Pharmacy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPharmacy(null);
                    setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "", distributorId: "" });
                    setShowEditPassword(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </Layout>
  );
}
