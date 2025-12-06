import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type ReportStatus = "PENDING" | "FORMATTED" | "FINALIZED";

export default function ReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [generating, setGenerating] = useState(false);

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
    fetchPrescriptions();
  }, [token, filterStatus]);

  const fetchPrescriptions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all data in parallel
      const [prescriptionsRes, doctorsRes, patientsRes] = await Promise.all([
        fetch(`${API_BASE}/api/prescriptions/admin/reports${filterStatus !== "ALL" ? `?status=${filterStatus}` : ""}`, { headers }),
        fetch(`${API_BASE}/api/users?role=DOCTOR`, { headers }),
        fetch(`${API_BASE}/api/users?role=PATIENT`, { headers }),
      ]);
      
      const prescriptionsData = prescriptionsRes.ok ? await prescriptionsRes.json() : {};
      const prescriptionsList = Array.isArray(prescriptionsData.prescriptions) 
        ? prescriptionsData.prescriptions 
        : Array.isArray(prescriptionsData) 
        ? prescriptionsData 
        : [];
      
      setPrescriptions(prescriptionsList);
      setDoctors(doctorsRes.ok ? await doctorsRes.json() : []);
      setPatients(patientsRes.ok ? await patientsRes.json() : []);
    } catch (e: any) {
      toast.error("Error fetching prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const getDoctorName = (doctorId: any) => {
    if (!doctorId) return "N/A";
    // Handle if doctorId is already an object with name
    if (typeof doctorId === 'object' && doctorId.name) {
      return doctorId.name;
    }
    // Handle if it's a string ID
    const idString = typeof doctorId === 'string' ? doctorId : String(doctorId);
    const doctor = doctors.find(d => d._id === idString || d.id === idString);
    return doctor?.name || (idString.length > 8 ? idString.slice(-8) : idString);
  };

  const getPatientName = (patientId: any) => {
    if (!patientId) return "N/A";
    // Handle if patientId is already an object with name
    if (typeof patientId === 'object' && patientId.name) {
      return patientId.name;
    }
    // Handle if it's a string ID
    const idString = typeof patientId === 'string' ? patientId : String(patientId);
    const patient = patients.find(p => p._id === idString || p.id === idString);
    return patient?.name || (idString.length > 8 ? idString.slice(-8) : idString);
  };

  const generateReport = async (prescription: any) => {
    if (!token) return;
    try {
      setGenerating(true);
      const res = await fetch(`${API_BASE}/api/prescriptions/${prescription._id}/generate-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.rendered);
        setSelectedPrescription(prescription);
        toast.success("Report generated successfully!");
        await fetchPrescriptions();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to generate report");
      }
    } catch (e: any) {
      toast.error("Error generating report");
    } finally {
      setGenerating(false);
    }
  };

  const finalizeReport = async (prescription: any) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/prescriptions/${prescription._id}/finalize-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminId: user?.id || user?._id }),
      });
      if (res.ok) {
        toast.success("Report finalized and sent to patient!");
        setSelectedPrescription(null);
        setPreviewHtml("");
        await fetchPrescriptions();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to finalize report");
      }
    } catch (e: any) {
      toast.error("Error finalizing report");
    }
  };


  return (
    <Layout user={user} currentPage="reports">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-black">
          Prescription Reports
        </h2>
        <p className="text-sm text-gray-600">
          Generate and manage formatted prescription reports with complete details
        </p>
      </motion.header>

        {/* Filter Tabs */}
        <AnimatedCard delay={0.1} className="mb-6">
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "FORMATTED", "FINALIZED"].map((status) => (
              <motion.button
                key={status}
                onClick={() => setFilterStatus(status)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                  filterStatus === status
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                    : "bg-white text-black border-black hover:bg-blue-50 hover:border-blue-600"
                }`}
              >
                {status}
              </motion.button>
            ))}
          </div>
        </AnimatedCard>

        {/* Prescriptions List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
          </div>
        ) : prescriptions.length === 0 ? (
          <AnimatedCard delay={0.2}>
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm text-black font-medium">No prescriptions found</p>
            </div>
          </AnimatedCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((prescription: any, idx: number) => (
              <motion.div
                key={prescription._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => setSelectedPrescription(prescription)}
                className="medical-card cursor-pointer border-l-4 border-l-blue-600 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💊</span>
                    <h3 className="text-lg font-bold text-black">
                      Prescription #{prescription._id.slice(-8)}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prescription.reportStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : prescription.reportStatus === "FORMATTED"
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-green-100 text-green-700 border border-green-300"
                    }`}
                  >
                    {prescription.reportStatus || "PENDING"}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black">👨‍⚕️</span>
                    <span className="text-sm font-semibold text-black truncate">
                      {getDoctorName(prescription.doctorId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black">👤</span>
                    <span className="text-sm font-semibold text-black truncate">
                      {getPatientName(prescription.patientId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black">📅</span>
                    <span className="text-xs text-black">
                      {new Date(prescription.createdAt).toLocaleString('en-IN', {
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
                    {prescription.items?.length || 0} {prescription.items?.length === 1 ? 'Medicine' : 'Medicines'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Click to view details →</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Prescription Detail Modal */}
        {selectedPrescription && !previewHtml && (
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
              <div className="flex items-center justify-between p-6 border-b border-blue-200 bg-blue-50">
                <div>
                  <h3 className="text-xl font-bold text-black mb-1">
                    Prescription #{selectedPrescription._id.slice(-8)}
                  </h3>
                  <p className="text-sm text-black">
                    {getDoctorName(selectedPrescription.doctorId)} → {getPatientName(selectedPrescription.patientId)}
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
                {/* Basic Information */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-bold text-black mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs font-medium text-black">👨‍⚕️ Doctor:</span>
                      <p className="text-sm font-semibold text-black mt-1">
                        {getDoctorName(selectedPrescription.doctorId)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-black">👤 Patient:</span>
                      <p className="text-sm font-semibold text-black mt-1">
                        {getPatientName(selectedPrescription.patientId)}
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
                    <div>
                      <span className="text-xs font-medium text-black">Status:</span>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          selectedPrescription.reportStatus === "PENDING"
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                            : selectedPrescription.reportStatus === "FORMATTED"
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-green-100 text-green-700 border border-green-300"
                        }`}
                      >
                        {selectedPrescription.reportStatus || "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prescription Items */}
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

                {/* Additional Notes */}
                {selectedPrescription.notes && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-bold text-black mb-2">Additional Notes</h4>
                    <p className="text-sm text-black bg-white rounded p-3 border border-blue-200">
                      {selectedPrescription.notes}
                    </p>
                  </div>
                )}

                {/* Suggestions */}
                {selectedPrescription.suggestions && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-bold text-black mb-2">Suggestions</h4>
                    <p className="text-sm text-black bg-white rounded p-3 border border-green-200">
                      {selectedPrescription.suggestions}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-blue-200 bg-blue-50 flex gap-3">
                {selectedPrescription.reportStatus === "PENDING" && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateReport(selectedPrescription);
                    }}
                    disabled={generating}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Generate Report"}
                  </motion.button>
                )}
                {selectedPrescription.reportStatus === "FORMATTED" && (
                  <>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewHtml(selectedPrescription.formattedReport || "");
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Preview Report
                    </motion.button>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        finalizeReport(selectedPrescription);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Finalize & Send
                    </motion.button>
                  </>
                )}
                {selectedPrescription.reportStatus === "FINALIZED" && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewHtml(selectedPrescription.formattedReport || "");
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    View Report
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setSelectedPrescription(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-white border-2 border-black text-black rounded-lg font-semibold transition-colors hover:bg-black hover:text-white"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Preview Modal */}
        {selectedPrescription && previewHtml && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-200 bg-blue-50">
                <div>
                  <h2 className="text-xl font-bold text-black">Report Preview</h2>
                  <p className="text-sm text-black">
                    {getDoctorName(selectedPrescription.doctorId)} → {getPatientName(selectedPrescription.patientId)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPrescription(null);
                    setPreviewHtml("");
                  }}
                  className="text-black hover:text-blue-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-white">
                <div
                  className="bg-white rounded-lg p-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              <div className="p-6 border-t border-blue-200 bg-blue-50 flex gap-3">
                <motion.button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Prescription Report</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; }
                            </style>
                          </head>
                          <body>${previewHtml}</body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Print / Download
                </motion.button>
                {selectedPrescription.reportStatus === "FORMATTED" && (
                  <motion.button
                    onClick={() => finalizeReport(selectedPrescription)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Finalize & Send to Patient
                  </motion.button>
                )}
                <motion.button
                  onClick={() => {
                    setSelectedPrescription(null);
                    setPreviewHtml("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-white border-2 border-black text-black rounded-lg font-semibold transition-colors hover:bg-black hover:text-white"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
    </Layout>
  );
}

