import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { DoctorIcon, PlusIcon, EditIcon, DeleteIcon, ReportsIcon, TemplatesIcon } from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function DoctorManagementPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Active Tab State
  const [activeTab, setActiveTab] = useState<"management" | "records" | "prescriptions" | "documents">("management");
  
  // Doctor Management State
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  
  // Form states
  const [doctorForm, setDoctorForm] = useState({ 
    name: "", 
    email: "", 
    password: "",
    phone: "",
    specialization: "",
    qualification: "",
    hospitalId: "",
    serviceCharge: ""
  });
  
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [doctorsRes, hospitalsRes, patientsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users?role=DOCTOR`, { headers }),
        fetch(`${API_BASE}/api/master/hospitals`, { headers }),
        fetch(`${API_BASE}/api/users?role=PATIENT`, { headers }),
        fetch(`${API_BASE}/api/appointments`, { headers }),
        fetch(`${API_BASE}/api/prescriptions`, { headers }),
      ]);
      
      setDoctors(doctorsRes.ok ? await doctorsRes.json() : []);
      setHospitals(hospitalsRes.ok ? await hospitalsRes.json() : []);
      setPatients(patientsRes.ok ? await patientsRes.json() : []);
      setAppointments(appointmentsRes.ok ? await appointmentsRes.json() : []);
      setPrescriptions(prescriptionsRes.ok ? await prescriptionsRes.json() : []);
    } catch (e) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const createDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: doctorForm.name,
          email: doctorForm.email,
          password: doctorForm.password,
          phone: doctorForm.phone,
          role: "DOCTOR",
          specialization: doctorForm.specialization,
          qualification: doctorForm.qualification,
          hospitalId: doctorForm.hospitalId || undefined,
          serviceCharge: doctorForm.serviceCharge ? parseFloat(doctorForm.serviceCharge) : undefined,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create doctor");
      }

      const createdDoctor = await res.json();
      setDoctors((prev) => [createdDoctor, ...prev]);
      setDoctorForm({ 
        name: "", 
        email: "", 
        password: "",
        phone: "",
        specialization: "",
        qualification: "",
        hospitalId: "",
        serviceCharge: ""
      });
      setShowAddModal(false);
      toast.success("Doctor created successfully!");
      fetchAllData();
    } catch (e: any) {
      toast.error(e.message || "Error creating doctor");
    }
  };

  const updateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingDoctor) return;
    try {
      const updateData: any = {
        name: doctorForm.name,
        email: doctorForm.email,
        phone: doctorForm.phone,
        specialization: doctorForm.specialization,
        qualification: doctorForm.qualification,
        hospitalId: doctorForm.hospitalId || undefined,
        serviceCharge: doctorForm.serviceCharge ? parseFloat(doctorForm.serviceCharge) : undefined,
      };

      if (doctorForm.password) {
        updateData.password = doctorForm.password;
      }

      const res = await fetch(`${API_BASE}/api/users/${editingDoctor._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setDoctors((prev) => prev.map((d) => (d._id === editingDoctor._id ? updated : d)));
        setDoctorForm({ 
          name: "", 
          email: "", 
          password: "",
          phone: "",
          specialization: "",
          qualification: "",
          hospitalId: "",
          serviceCharge: ""
        });
        setShowEditModal(false);
        setEditingDoctor(null);
        toast.success("Doctor updated successfully!");
        fetchAllData();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || "Failed to update doctor");
      }
    } catch (e) {
      toast.error("Error updating doctor");
    }
  };

  const deleteDoctor = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this doctor?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDoctors((prev) => prev.filter((d) => d._id !== id));
        toast.success("Doctor deleted successfully!");
        fetchAllData();
      } else {
        toast.error("Failed to delete doctor");
      }
    } catch (e) {
      toast.error("Error deleting doctor");
    }
  };

  const openEditModal = (doctor: any) => {
    setEditingDoctor(doctor);
    setDoctorForm({ 
      name: doctor.name || "", 
      email: doctor.email || "", 
      password: "",
      phone: doctor.phone || "",
      specialization: doctor.specialization || "",
      qualification: doctor.qualification || "",
      hospitalId: doctor.hospitalId || "",
      serviceCharge: doctor.serviceCharge ? String(doctor.serviceCharge) : ""
    });
    setShowEditModal(true);
  };

  const getDoctorStats = (doctorId: string) => {
    const doctorAppointments = appointments.filter((apt) => apt.doctorId === doctorId);
    const doctorPrescriptions = prescriptions.filter((pres) => pres.doctorId === doctorId);
    
    return {
      totalAppointments: doctorAppointments.length,
      completedAppointments: doctorAppointments.filter((apt) => apt.status === "COMPLETED").length,
      totalPrescriptions: doctorPrescriptions.length,
    };
  };

  const getDoctorNameForPrescription = (doctorId: any) => {
    if (!doctorId) return "N/A";
    if (typeof doctorId === 'object' && doctorId.name) {
      return doctorId.name;
    }
    const idString = typeof doctorId === 'string' ? doctorId : String(doctorId);
    const doctor = doctors.find(d => d._id === idString || d.id === idString);
    return doctor?.name || (idString.length > 8 ? idString.slice(-8) : idString);
  };

  const getPatientNameForPrescription = (patientId: any) => {
    if (!patientId) return "N/A";
    if (typeof patientId === 'object' && patientId.name) {
      return patientId.name;
    }
    const idString = typeof patientId === 'string' ? patientId : String(patientId);
    const patient = patients.find(p => p._id === idString || p.id === idString);
    return patient?.name || (idString.length > 8 ? idString.slice(-8) : idString);
  };


  const filteredDoctors = doctors.filter((doc) =>
    doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <Layout user={user} currentPage="doctor-management">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 mb-6 sm:mb-8 bg-transparent"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-gray-900">
                Doctor Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage doctors and their information
              </p>
            </div>
            {activeTab === "management" && (
              <motion.button
                onClick={() => {
                  setDoctorForm({ 
                    name: "", 
                    email: "", 
                    password: "",
                    phone: "",
                    specialization: "",
                    qualification: "",
                    hospitalId: "",
                    serviceCharge: ""
                  });
                  setShowAddModal(true);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm sm:text-base"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add New Doctor</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AnimatedCard delay={0.1}>
          <motion.button
            onClick={() => setActiveTab("records")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-6 border rounded-lg transition-all text-left ${
              activeTab === "records"
                ? "border-blue-900 bg-blue-50 shadow-sm"
                : "border-gray-300 bg-white hover:border-blue-900 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                <ReportsIcon className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-black">Doctor Records</h3>
                <p className="text-xs text-gray-500">View all records</p>
              </div>
            </div>
          </motion.button>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <motion.button
            onClick={() => setActiveTab("prescriptions")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-6 border rounded-lg transition-all text-left ${
              activeTab === "prescriptions"
                ? "border-blue-900 bg-blue-50 shadow-sm"
                : "border-gray-300 bg-white hover:border-blue-900 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                <ReportsIcon className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-black">Prescription Reports</h3>
                <p className="text-xs text-gray-500">View prescriptions</p>
              </div>
            </div>
          </motion.button>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <motion.button
            onClick={() => setActiveTab("documents")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
              activeTab === "documents"
                ? "border-yellow-500 bg-yellow-50 shadow-lg"
                : "border-gray-300 bg-white hover:border-blue-900 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                <TemplatesIcon className="w-6 h-6 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-black">Document Panel</h3>
                <p className="text-xs text-gray-500">Manage documents</p>
              </div>
            </div>
          </motion.button>
        </AnimatedCard>
      </div>

      {/* Doctor Management Tab */}
      {activeTab === "management" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((d, idx) => (
                <AnimatedCard key={d._id} delay={idx * 0.1}>
                  <div className="p-6 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                          <DoctorIcon className="w-6 h-6 text-blue-900" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{d.name}</h3>
                          <p className="text-xs text-gray-500">ID: {d._id.slice(-8)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📧</span>
                        <p className="text-sm text-gray-600">{d.email}</p>
                      </div>
                      {d.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📞</span>
                          <p className="text-sm text-gray-600">{d.phone}</p>
                        </div>
                      )}
                      {d.specialization && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🏥</span>
                          <p className="text-sm text-gray-600">{d.specialization}</p>
                        </div>
                      )}
                      {d.qualification && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🎓</span>
                          <p className="text-sm text-gray-600">{d.qualification}</p>
                        </div>
                      )}
                      {d.serviceCharge && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">💰</span>
                          <p className="text-sm text-gray-600 font-semibold">Service Charge: ₹{d.serviceCharge.toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <motion.button
                        onClick={() => openEditModal(d)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </motion.button>
                      <motion.button
                        onClick={() => deleteDoctor(d._id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium transition-all"
                      >
                        🗑️
                      </motion.button>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
              
              {doctors.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                      <DoctorIcon className="w-10 h-10 text-blue-900" />
                    </div>
                  </div>
                  <p className="text-lg text-gray-600 font-medium mb-2">No doctors found</p>
                  <p className="text-sm text-gray-500">Click "Add New Doctor" to get started</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Doctor Records Tab */}
      {activeTab === "records" && (
        <>
          <AnimatedCard delay={0.1} className="mb-6">
            <input
              type="text"
              placeholder="Search doctors by name or email..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </AnimatedCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDoctors.map((doctor, idx) => {
              const stats = getDoctorStats(doctor._id || doctor.id);
              return (
                <motion.div
                  key={doctor._id || doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 border border-gray-300 rounded-lg bg-white hover:border-blue-900 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {doctor.name?.charAt(0).toUpperCase() || "D"}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-black">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Appointments</p>
                      <p className="text-lg font-bold text-black">{stats.totalAppointments}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Prescriptions</p>
                      <p className="text-lg font-bold text-black">{stats.totalPrescriptions}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Prescription Reports Tab */}
      {activeTab === "prescriptions" && (
        <>
          <AnimatedCard delay={0.1}>
            <h3 className="text-lg font-bold text-black mb-4">Prescription Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {prescriptions.map((pres, idx) => (
                <motion.div
                  key={pres._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => setSelectedPrescription(pres)}
                  className="p-6 border border-gray-300 rounded-lg bg-white hover:border-blue-900 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-900"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💊</span>
                      <h4 className="text-lg font-bold text-black">
                        Prescription #{pres._id.slice(-8)}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <DoctorIcon className="w-4 h-4 text-gray-700" />
                      <span className="text-sm font-semibold text-black truncate">
                        {getDoctorNameForPrescription(pres.doctorId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black">👤</span>
                      <span className="text-sm font-semibold text-black truncate">
                        {getPatientNameForPrescription(pres.patientId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black">📅</span>
                      <span className="text-xs text-black">
                        {new Date(pres.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs text-black font-medium">
                      {pres.items?.length || 0} {pres.items?.length === 1 ? 'Medicine' : 'Medicines'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Click to view details →</p>
                  </div>
                </motion.div>
              ))}
              {prescriptions.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-sm text-black font-medium">No prescription reports found</p>
                </div>
              )}
            </div>
          </AnimatedCard>

          {/* Prescription Detail Modal */}
          {selectedPrescription && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPrescription(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-300 bg-gray-50">
                  <div>
                    <h3 className="text-xl font-bold text-black mb-1">
                      Prescription #{selectedPrescription._id.slice(-8)}
                    </h3>
                    <p className="text-sm text-black">
                      {getDoctorNameForPrescription(selectedPrescription.doctorId)} → {getPatientNameForPrescription(selectedPrescription.patientId)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="text-black hover:text-blue-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                    <h4 className="text-sm font-bold text-black mb-3">Basic Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <DoctorIcon className="w-3 h-3" />
                          Doctor:
                        </span>
                        <p className="text-sm font-semibold text-black mt-1">
                          {getDoctorNameForPrescription(selectedPrescription.doctorId)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-black">👤 Patient:</span>
                        <p className="text-sm font-semibold text-black mt-1">
                          {getPatientNameForPrescription(selectedPrescription.patientId)}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs font-medium text-black">📅 Date & Time:</span>
                        <p className="text-sm text-black mt-1">
                          {new Date(selectedPrescription.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedPrescription.items && selectedPrescription.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-black mb-3">
                        Medicines ({selectedPrescription.items.length} {selectedPrescription.items.length === 1 ? 'item' : 'items'})
                      </h4>
                      <div className="space-y-3">
                        {selectedPrescription.items.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <p className="font-bold text-base text-black mb-2">{item.medicineName}</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-semibold text-black">Dosage:</span>
                                <p className="text-black mt-1">{item.dosage || "N/A"}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-black">Frequency:</span>
                                <p className="text-black mt-1">{item.frequency || "N/A"}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="font-semibold text-black">Duration:</span>
                                <p className="text-black mt-1">{item.duration || "N/A"}</p>
                              </div>
                              {item.notes && (
                                <div className="col-span-2 bg-white rounded p-2 border border-green-200">
                                  <span className="font-semibold text-black text-xs">Notes:</span>
                                  <p className="text-sm text-black mt-1">{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPrescription.notes && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                      <h4 className="text-sm font-bold text-black mb-2">Additional Notes</h4>
                      <p className="text-sm text-black bg-white rounded p-3 border border-blue-200">
                        {selectedPrescription.notes}
                      </p>
                    </div>
                  )}

                  {selectedPrescription.suggestions && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="text-sm font-bold text-black mb-2">Suggestions</h4>
                      <p className="text-sm text-black bg-white rounded p-3 border border-green-200">
                        {selectedPrescription.suggestions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-300 bg-gray-50">
                  <motion.button
                    onClick={() => setSelectedPrescription(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 bg-white border-2 border-black text-black rounded-lg font-semibold transition-colors hover:bg-black hover:text-white"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* Document Panel Tab */}
      {activeTab === "documents" && (
        <AnimatedCard delay={0.1}>
          <h3 className="text-lg font-bold text-black mb-4">Document Panel</h3>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm text-gray-600 font-medium">Document Management</p>
            <p className="text-xs text-gray-500 mt-1">Document panel feature coming soon</p>
          </div>
        </AnimatedCard>
      )}


      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDoctor(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Doctor Details</h3>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Name</h4>
                <p className="text-black">{selectedDoctor.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Email</h4>
                <p className="text-black">{selectedDoctor.email}</p>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(getDoctorStats(selectedDoctor._id || selectedDoctor.id)).map(
                    ([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </p>
                        <p className="text-lg font-bold text-black">{value}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Doctor</h2>
            <form onSubmit={createDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="new-password"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter doctor name"
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
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="doctor@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">This will be used to login</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={doctorForm.password}
                  onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter password"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.specialization}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="e.g., Cardiology, Pediatrics"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Qualification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.qualification}
                  onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="e.g., MBBS, MD"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital (Optional)
                </label>
                <select
                  value={doctorForm.hospitalId}
                  onChange={(e) => setDoctorForm({ ...doctorForm, hospitalId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={doctorForm.serviceCharge}
                  onChange={(e) => setDoctorForm({ ...doctorForm, serviceCharge: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter service charge"
                />
                <p className="text-xs text-gray-500 mt-1">Consultation/service charge for this doctor</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Create Doctor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setDoctorForm({ 
                      name: "", 
                      email: "", 
                      password: "",
                      phone: "",
                      specialization: "",
                      qualification: "",
                      hospitalId: "",
                      serviceCharge: ""
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

      {/* Edit Doctor Modal */}
      {showEditModal && editingDoctor && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Doctor</h2>
            <form onSubmit={updateDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={doctorForm.password}
                  onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.specialization}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Qualification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.qualification}
                  onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hospital (Optional)
                </label>
                <select
                  value={doctorForm.hospitalId}
                  onChange={(e) => setDoctorForm({ ...doctorForm, hospitalId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={doctorForm.serviceCharge}
                  onChange={(e) => setDoctorForm({ ...doctorForm, serviceCharge: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  placeholder="Enter service charge"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  Update Doctor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDoctor(null);
                    setDoctorForm({ 
                      name: "", 
                      email: "", 
                      password: "",
                      phone: "",
                      specialization: "",
                      qualification: "",
                      hospitalId: "",
                      serviceCharge: ""
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
