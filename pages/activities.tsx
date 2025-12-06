import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

interface Activity {
  _id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
  pharmacyId?: string;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isPolling] = useState(true);
  const [loading, setLoading] = useState(true);
  const previousActivityIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!storedUser || !token) {
      router.replace("/");
      return;
    }
    setUser(JSON.parse(storedUser));

    // Fetch activities
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/activities?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const fetchedActivities = Array.isArray(data) ? data : [];
          
          // Detect new activities
          const currentActivityIds = new Set(fetchedActivities.map((a: Activity) => a._id));
          const newActivities = fetchedActivities.filter((a: Activity) => 
            !previousActivityIdsRef.current.has(a._id)
          );
          
          // Show toast for new activities (only if not initial load)
          if (previousActivityIdsRef.current.size > 0 && newActivities.length > 0) {
            newActivities.forEach((activity: Activity) => {
              toast.success(activity.title, {
                description: activity.description,
                duration: 4000,
              });
            });
          }
          
          previousActivityIdsRef.current = currentActivityIds;
          setActivities(fetchedActivities);
          setLoading(false);
        }
      } catch (e: any) {
        // Silently handle connection errors (backend might be starting)
        if (e.message?.includes("Failed to fetch") || e.message?.includes("ERR_CONNECTION_REFUSED")) {
          // Backend is not running, show user-friendly message on initial load
          if (loading) {
            toast.error("Cannot connect to backend server", {
              description: "Please make sure the backend server is running on port 4000",
              duration: 5000,
            });
          }
        } else {
          console.error("Failed to fetch activities", e);
        }
        setLoading(false);
      }
    };

    fetchActivities();

    // Poll for updates every 5 seconds
    const pollInterval = setInterval(() => {
      fetchActivities();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [router]);

  const getActivityIcon = (type: string) => {
    if (type.includes("APPOINTMENT")) return "📅";
    if (type.includes("PRESCRIPTION")) return "💊";
    if (type.includes("ORDER")) return "📦";
    if (type.includes("INVENTORY")) return "📋";
    if (type.includes("FINANCE")) return "💰";
    if (type.includes("USER")) return "👤";
    return "🔔";
  };

  const getActivityColor = (type: string) => {
    if (type.includes("APPOINTMENT")) return "text-blue-700 bg-blue-100 border-blue-300";
    if (type.includes("PRESCRIPTION")) return "text-green-700 bg-green-100 border-green-300";
    if (type.includes("ORDER")) return "text-blue-700 bg-blue-100 border-blue-300";
    if (type.includes("INVENTORY")) return "text-green-700 bg-green-100 border-green-300";
    if (type.includes("FINANCE")) return "text-green-700 bg-green-100 border-green-300";
    if (type.includes("USER")) return "text-blue-700 bg-blue-100 border-blue-300";
    return "text-black bg-white border-black";
  };

  if (!user) return null;

  return (
    <Layout user={user} currentPage="activities">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-green-600">
            Live Activities
          </h2>
          <p className="text-xs sm:text-sm text-black">
            Real-time updates from all system activities
          </p>
        </div>
        <motion.div
          animate={{
            scale: isPolling ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white border-2 border-black w-full sm:w-auto"
        >
          <div
            className={`h-3 w-3 rounded-full ${isPolling ? "bg-green-600" : "bg-black"} shadow-lg`}
          />
          <span className="text-xs text-black font-semibold">
            {isPolling ? "Live" : "Paused"}
          </span>
        </motion.div>
      </motion.header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <AnimatedCard delay={0.1}>
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
            {activities.map((activity, idx) => (
              <motion.div
                key={activity._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="border-2 border-blue-200 rounded-xl p-4 bg-white hover:border-green-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="text-2xl sm:text-3xl flex-shrink-0">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm text-black break-words">{activity.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap border ${getActivityColor(activity.type)}`}>
                        {activity.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-black mb-3 break-words">{activity.description}</p>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs text-black flex-wrap">
                      {activity.patientId && (
                        <span className="font-medium">👤 Patient: {activity.patientId.slice(-8)}</span>
                      )}
                      {activity.doctorId && (
                        <span className="font-medium">👨‍⚕️ Doctor: {activity.doctorId.slice(-8)}</span>
                      )}
                      {activity.pharmacyId && (
                        <span className="font-medium">💊 Pharmacy: {activity.pharmacyId.slice(-8)}</span>
                      )}
                      {activity.hospitalId && (
                        <span className="font-medium">🏥 Hospital: {activity.hospitalId.slice(-8)}</span>
                      )}
                      <span className="ml-auto font-medium">
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-black text-center py-8 font-medium">
                No activities yet. Activities will appear here in real-time.
              </p>
            )}
          </div>
        </AnimatedCard>
      )}
    </Layout>
  );
}
