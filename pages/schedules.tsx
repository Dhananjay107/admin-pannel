import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";
import { DoctorIcon, PlusIcon, EditIcon, DeleteIcon, ClockIcon } from "../components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function SchedulesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [formData, setFormData] = useState({
    doctorId: "",
    dayOfWeek: "monday",
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 15,
    isActive: true,
    maxAppointmentsPerSlot: 1,
    hospitalId: "",
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
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [doctorsRes, schedulesRes] = await Promise.all([
        fetch(`${API_BASE}/api/users?role=DOCTOR`, { headers }),
        fetch(`${API_BASE}/api/schedules/doctor-schedule`, { headers }),
      ]);

      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json();
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      }
    } catch (e) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const url = `${API_BASE}/api/schedules/doctor-schedule`;
      const method = "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingSchedule ? "Schedule updated successfully!" : "Schedule created successfully!");
        setShowModal(false);
        setEditingSchedule(null);
        resetForm();
        fetchData();
      } else {
        const error = await res.json().catch(() => ({ message: "Failed to save schedule" }));
        toast.error(error.message || "Failed to save schedule");
      }
    } catch (e) {
      toast.error("Error saving schedule");
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotDuration: schedule.slotDuration,
      isActive: schedule.isActive,
      maxAppointmentsPerSlot: schedule.maxAppointmentsPerSlot || 1,
      hospitalId: schedule.hospitalId || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/schedules/doctor-schedule/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Schedule deleted successfully!");
        fetchData();
      } else {
        toast.error("Failed to delete schedule");
      }
    } catch (e) {
      toast.error("Error deleting schedule");
    }
  };

  const resetForm = () => {
    setFormData({
      doctorId: "",
      dayOfWeek: "monday",
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 15,
      isActive: true,
      maxAppointmentsPerSlot: 1,
      hospitalId: "",
    });
    setEditingSchedule(null);
  };

  const generateSlotsForDoctor = async (doctorId: string) => {
    if (!confirm("Generate slots for the next 30 days for this doctor?")) return;
    if (!token) return;

    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);

      const res = await fetch(`${API_BASE}/api/schedules/slots/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctorId,
          startDate: today.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Generated ${data.count || 0} slots successfully!`);
      } else {
        const error = await res.json().catch(() => ({ message: "Failed to generate slots" }));
        toast.error(error.message || "Failed to generate slots");
      }
    } catch (e) {
      toast.error("Error generating slots");
    }
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find((d) => d._id === doctorId || d.id === doctorId);
    return doctor?.name || doctorId.slice(-8);
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="schedules">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 mb-6 sm:mb-8 bg-transparent"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-gray-900">
                Doctor Schedules
              </h2>
              <p className="text-sm text-gray-600">Manage doctor availability and time slots</p>
            </div>
            <motion.button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Schedule</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((schedule, index) => (
            <AnimatedCard key={schedule._id || index} delay={index * 0.05}>
              <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <DoctorIcon className="w-5 h-5 text-blue-900" />
                      <h3 className="font-bold text-lg text-black">{getDoctorName(schedule.doctorId)}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          schedule.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {schedule.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Day</p>
                        <p className="font-semibold text-gray-900 capitalize">{schedule.dayOfWeek}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Time</p>
                        <p className="font-semibold text-gray-900">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Slot Duration</p>
                        <p className="font-semibold text-gray-900">{schedule.slotDuration} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Max per Slot</p>
                        <p className="font-semibold text-gray-900">{schedule.maxAppointmentsPerSlot || 1}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => generateSlotsForDoctor(schedule.doctorId)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium rounded-lg text-sm flex items-center gap-2"
                      title="Generate slots"
                    >
                      <ClockIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Generate</span>
                    </motion.button>
                    <motion.button
                      onClick={() => handleEdit(schedule)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-medium rounded-lg text-sm flex items-center gap-2"
                    >
                      <EditIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(schedule._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-900 font-medium rounded-lg text-sm flex items-center gap-2"
                    >
                      <DeleteIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ))}
          {schedules.length === 0 && (
            <AnimatedCard delay={0.1}>
              <div className="text-center py-12">
                <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No schedules found</p>
                <p className="text-sm text-gray-500">Create a schedule to start managing doctor availability</p>
              </div>
            </AnimatedCard>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor *</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id || doctor.id} value={doctor._id || doctor.id}>
                      {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week *</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (minutes) *</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={formData.slotDuration}
                    onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Appointments per Slot</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxAppointmentsPerSlot}
                    onChange={(e) =>
                      setFormData({ ...formData, maxAppointmentsPerSlot: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-lg transition-all"
                >
                  {editingSchedule ? "Update" : "Create"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}

