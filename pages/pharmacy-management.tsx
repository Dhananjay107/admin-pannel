import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { PharmacyIcon, PlusIcon, EditIcon, DeleteIcon } from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function PharmacyManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Pharmacy Management State
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<any>(null);
  const [selectedPharmacyForUser, setSelectedPharmacyForUser] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState({ email: "", password: "", name: "" });
  
  // Form states
  const [pharmacyForm, setPharmacyForm] = useState({ 
    name: "", 
    address: "", 
    phone: "",
    email: "",
    password: ""
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
  }, [token]);

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
      setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "" });
      setShowAddModal(false);
    } catch (e: any) {
      toast.error(e.message || "Error creating pharmacy");
    }
  };

  const updatePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingPharmacy) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/pharmacies/${editingPharmacy._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pharmacyForm),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setPharmacies((prev) => prev.map((p) => (p._id === editingPharmacy._id ? updated : p)));
      setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "" });
      setShowEditModal(false);
      setEditingPharmacy(null);
      toast.success("Pharmacy updated successfully!");
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || "Failed to update pharmacy");
      }
    } catch (e) {
      toast.error("Error updating pharmacy");
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

  const openEditModal = (pharmacy: any) => {
    setEditingPharmacy(pharmacy);
    setPharmacyForm({ name: pharmacy.name, address: pharmacy.address, phone: pharmacy.phone || "" });
    setShowEditModal(true);
  };

  const openUserModal = (pharmacy: any) => {
    setSelectedPharmacyForUser(pharmacy);
    setUserCredentials({ email: "", password: "", name: pharmacy.name });
    setShowUserModal(true);
  };

  const createPharmacyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPharmacyForUser) return;
    
    try {
      // Create login account for the pharmacy (not staff)
      const userRes = await fetch(`${API_BASE}/api/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userCredentials.name || selectedPharmacyForUser.name,
          email: userCredentials.email,
          password: userCredentials.password,
          role: "PHARMACY_STAFF",
          pharmacyId: selectedPharmacyForUser._id,
        }),
      });

      if (!userRes.ok) {
        const error = await userRes.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create login credentials");
      }

      toast.success("Pharmacy login credentials created successfully! Use these credentials to access the pharmacy panel.");
      setShowUserModal(false);
      setUserCredentials({ email: "", password: "", name: "" });
      setSelectedPharmacyForUser(null);
    } catch (e: any) {
      toast.error(e.message || "Error creating pharmacy login credentials");
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
                setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "" });
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
                    onClick={() => openUserModal(p)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium transition-all"
                  >
                    Create Login
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={pharmacyForm.password}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                      placeholder="Enter new password for pharmacy"
                      minLength={6}
                    />
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
                    setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "" });
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                    setPharmacyForm({ name: "", address: "", phone: "", email: "", password: "" });
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

      {/* Create Login Credentials Modal */}
      {showUserModal && selectedPharmacyForUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create Pharmacy Login Credentials
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Create <strong>NEW</strong> login credentials for <strong>{selectedPharmacyForUser.name}</strong> to access the pharmacy management panel.
            </p>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> These are new credentials for the pharmacy. They are different from your admin login.
              </p>
            </div>
            <form onSubmit={createPharmacyLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pharmacy Name
                </label>
                <input
                  type="text"
                  value={userCredentials.name}
                  onChange={(e) => setUserCredentials({ ...userCredentials, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  placeholder={selectedPharmacyForUser.name}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="new-password"
                  value={userCredentials.email}
                  onChange={(e) => setUserCredentials({ ...userCredentials, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="pharmacy@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">This will be used to login to the pharmacy panel</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={userCredentials.password}
                  onChange={(e) => setUserCredentials({ ...userCredentials, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter new password for pharmacy"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters - Create a new password for pharmacy access</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Create Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedPharmacyForUser(null);
                    setUserCredentials({ email: "", password: "", name: "" });
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
