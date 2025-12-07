import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { HospitalIcon, PlusIcon, EditIcon, DeleteIcon } from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function HospitalManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Hospital Management State
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);
  
  // Form states
  const [hospitalForm, setHospitalForm] = useState({ 
    name: "", 
    address: "", 
    phone: "",
    registrationNumber: "",
    type: "Clinic" as "Clinic" | "Multi-Speciality" | "Diagnostic" | "Government" | "Private",
    establishedYear: "",
    description: "",
    registrationCharge: ""
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
    fetchHospitals();
  }, [token]);

  const fetchHospitals = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/master/hospitals`, { headers });
      setHospitals(res.ok ? await res.json() : []);
    } catch (e) {
      toast.error("Failed to fetch hospitals");
    } finally {
      setLoading(false);
    }
  };

  const createHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/hospitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: hospitalForm.name,
          address: hospitalForm.address,
          contactNumber: hospitalForm.phone,
          registrationNumber: hospitalForm.registrationNumber,
          type: hospitalForm.type,
          establishedYear: hospitalForm.establishedYear ? parseInt(hospitalForm.establishedYear) : undefined,
          description: hospitalForm.description,
          registrationCharge: hospitalForm.registrationCharge ? parseFloat(hospitalForm.registrationCharge) : undefined,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create hospital");
      }

      const createdHospital = await res.json();
      setHospitals((prev) => [createdHospital, ...prev]);
      setHospitalForm({ 
        name: "", 
        address: "", 
        phone: "", 
        registrationNumber: "",
        type: "Clinic",
        establishedYear: "",
        description: "",
        registrationCharge: ""
      });
      setShowAddModal(false);
      toast.success("Hospital created successfully!");
    } catch (e: any) {
      toast.error(e.message || "Error creating hospital");
    }
  };

  const updateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingHospital) return;
    try {
      const res = await fetch(`${API_BASE}/api/master/hospitals/${editingHospital._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: hospitalForm.name,
          address: hospitalForm.address,
          contactNumber: hospitalForm.phone,
          registrationNumber: hospitalForm.registrationNumber,
          type: hospitalForm.type,
          establishedYear: hospitalForm.establishedYear ? parseInt(hospitalForm.establishedYear) : undefined,
          description: hospitalForm.description,
          registrationCharge: hospitalForm.registrationCharge ? parseFloat(hospitalForm.registrationCharge) : undefined,
        }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setHospitals((prev) => prev.map((h) => (h._id === editingHospital._id ? updated : h)));
        setHospitalForm({ 
          name: "", 
          address: "", 
          phone: "", 
          registrationNumber: "",
          type: "Clinic",
          establishedYear: "",
          description: "",
          registrationCharge: ""
        });
        setShowEditModal(false);
        setEditingHospital(null);
        toast.success("Hospital updated successfully!");
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || "Failed to update hospital");
      }
    } catch (e) {
      toast.error("Error updating hospital");
    }
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

  const openEditModal = (hospital: any) => {
    setEditingHospital(hospital);
    setHospitalForm({ 
      name: hospital.name || "", 
      address: hospital.address || "", 
      phone: hospital.contactNumber || hospital.phone || "",
      registrationNumber: hospital.registrationNumber || "",
      type: hospital.type || "Clinic",
      establishedYear: hospital.establishedYear ? String(hospital.establishedYear) : "",
      description: hospital.description || "",
      registrationCharge: hospital.registrationCharge ? String(hospital.registrationCharge) : ""
    });
    setShowEditModal(true);
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="hospital-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 mb-6 sm:mb-8 bg-transparent"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-gray-900">
                Hospital Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage hospitals and their information
              </p>
            </div>
            <motion.button
              onClick={() => {
                setHospitalForm({ 
                  name: "", 
                  address: "", 
                  phone: "", 
                  registrationNumber: "",
                  type: "Clinic",
                  establishedYear: "",
                  description: ""
                });
                setShowAddModal(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add New Hospital</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hospitals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.map((h, idx) => (
            <AnimatedCard key={h._id} delay={idx * 0.1}>
              <div className="p-6 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                      <HospitalIcon className="w-6 h-6 text-blue-900" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{h.name}</h3>
                      <p className="text-xs text-gray-500">ID: {h._id.slice(-8)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">📍</span>
                    <p className="text-sm text-gray-600 flex-1">{h.address}</p>
                  </div>
                  {h.contactNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📞</span>
                      <p className="text-sm text-gray-600">{h.contactNumber}</p>
                    </div>
                  )}
                  {h.registrationNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📋</span>
                      <p className="text-sm text-gray-600">Reg: {h.registrationNumber}</p>
                    </div>
                  )}
                  {h.type && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🏷️</span>
                      <p className="text-sm text-gray-600">{h.type}</p>
                    </div>
                  )}
                  {h.establishedYear && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📅</span>
                      <p className="text-sm text-gray-600">Est: {h.establishedYear}</p>
                    </div>
                  )}
                  {h.registrationCharge && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">💰</span>
                      <p className="text-sm text-gray-600 font-semibold">Registration Charge: ₹{h.registrationCharge.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <motion.button
                    onClick={() => openEditModal(h)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </motion.button>
                  <motion.button
                    onClick={() => deleteHospital(h._id)}
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
          
          {hospitals.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                  <HospitalIcon className="w-10 h-10 text-blue-900" />
                </div>
              </div>
              <p className="text-lg text-gray-700 font-medium mb-2">No hospitals found</p>
              <p className="text-sm text-gray-600">Click "Add New Hospital" to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Add Hospital Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Hospital</h2>
            <form onSubmit={createHospital} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter hospital name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Number / License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hospitalForm.registrationNumber}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, registrationNumber: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter registration number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={hospitalForm.type}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                >
                  <option value="Clinic">Clinic</option>
                  <option value="Multi-Speciality">Multi-Speciality</option>
                  <option value="Diagnostic">Diagnostic Center</option>
                  <option value="Government">Government</option>
                  <option value="Private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter hospital address"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Established Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={hospitalForm.establishedYear}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, establishedYear: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter established year"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={hospitalForm.description}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter hospital description"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Time Registration Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hospitalForm.registrationCharge}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, registrationCharge: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter registration charge"
                />
                <p className="text-xs text-gray-500 mt-1">Charge for first time registration/number booking</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Create Hospital
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setHospitalForm({ 
                      name: "", 
                      address: "", 
                      phone: "", 
                      registrationNumber: "",
                      type: "Clinic",
                      establishedYear: "",
                      description: "",
                      registrationCharge: ""
                    });
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

      {/* Edit Hospital Modal */}
      {showEditModal && editingHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Hospital</h2>
            <form onSubmit={updateHospital} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Number / License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hospitalForm.registrationNumber}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, registrationNumber: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={hospitalForm.type}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                >
                  <option value="Clinic">Clinic</option>
                  <option value="Multi-Speciality">Multi-Speciality</option>
                  <option value="Diagnostic">Diagnostic Center</option>
                  <option value="Government">Government</option>
                  <option value="Private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
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
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Established Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={hospitalForm.establishedYear}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, establishedYear: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={hospitalForm.description}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Time Registration Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hospitalForm.registrationCharge}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, registrationCharge: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  placeholder="Enter registration charge"
                />
                <p className="text-xs text-gray-500 mt-1">Charge for first time registration/number booking</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Update Hospital
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingHospital(null);
                    setHospitalForm({ 
                      name: "", 
                      address: "", 
                      phone: "", 
                      registrationNumber: "",
                      type: "Clinic",
                      establishedYear: "",
                      description: "",
                      registrationCharge: ""
                    });
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
