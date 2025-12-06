import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import AnimatedCard from "../components/AnimatedCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function FinancePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
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

  const [reportType, setReportType] = useState<"summary" | "hospital" | "unit" | "time">("summary");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("MONTHLY");
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [hRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/api/master/hospitals`, { headers }),
          fetch(`${API_BASE}/api/finance/summary`, { headers }),
        ]);
        setHospitals(hRes.ok ? await hRes.json() : []);
        setSummary(summaryRes.ok ? await summaryRes.json() : { total: 0, count: 0, entries: [] });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const fetchReport = async (type: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let url = "";
      if (type === "hospital" && selectedHospital) {
        url = `${API_BASE}/api/finance/reports/hospital/${selectedHospital}`;
      } else if (type === "unit" && selectedUnit) {
        url = `${API_BASE}/api/finance/reports/unit/${selectedUnit}?id=${selectedUnit}`;
      } else if (type === "time") {
        url = `${API_BASE}/api/finance/reports/time?period=${selectedPeriod}`;
      } else {
        url = `${API_BASE}/api/finance/summary`;
      }
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (type === "time") {
        setSummary({ entries: [], ...data });
      } else {
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const entries = summary?.entries ?? [];
  const revenue = entries
    .filter((e: any) => e.type?.includes("REVENUE") || e.amount > 0)
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const expenses = entries
    .filter((e: any) => e.type?.includes("EXPENSE") || e.amount < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount || 0), 0);

  if (!user) return null;

  return (
    <Layout user={user} currentPage="finance">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
          Finance Overview
        </h2>
        <p className="text-xs sm:text-sm text-indigo-300/70">
          Aggregated financial view across consultations, medicine sales, delivery, commissions and stock movements.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as any);
              fetchReport(e.target.value);
            }}
            className="rounded-xl bg-slate-950/50 border border-indigo-800/50 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="summary">Summary</option>
            <option value="hospital">Hospital-wise</option>
            <option value="unit">Unit-wise</option>
            <option value="time">Time-wise</option>
          </select>
          {reportType === "hospital" && (
            <select
              value={selectedHospital}
              onChange={(e) => {
                setSelectedHospital(e.target.value);
                if (e.target.value) fetchReport("hospital");
              }}
              className="rounded-xl bg-slate-950/50 border border-indigo-800/50 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Select Hospital</option>
              {hospitals.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
          {reportType === "time" && (
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                fetchReport("time");
              }}
              className="rounded-xl bg-slate-950/50 border border-indigo-800/50 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="DAILY">Daily</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          )}
        </div>
      </motion.header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatCard
              title="Total Amount"
              value={`₹${(summary?.total || 0).toLocaleString()}`}
              subtitle={`${summary?.count || 0} entries`}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
              shadowColor="shadow-emerald-500/50"
              delay={0.1}
            />
            <StatCard
              title="Revenue"
              value={`₹${revenue.toLocaleString()}`}
              subtitle="Total income"
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
              shadowColor="shadow-blue-500/50"
              delay={0.2}
            />
            <StatCard
              title="Expenses"
              value={`₹${expenses.toLocaleString()}`}
              subtitle="Total costs"
              gradient="bg-gradient-to-br from-red-500 to-pink-500"
              shadowColor="shadow-red-500/50"
              delay={0.3}
            />
            <StatCard
              title="Net Profit"
              value={`₹${(revenue - expenses).toLocaleString()}`}
              subtitle="Revenue - Expenses"
              gradient="bg-gradient-to-br from-purple-500 to-indigo-500"
              shadowColor="shadow-purple-500/50"
              delay={0.4}
            />
          </div>

          <AnimatedCard delay={0.5}>
            <h3 className="text-lg font-semibold mb-4 text-emerald-300">Recent Entries</h3>
            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {entries.map((e: any, idx: number) => {
                const isPositive = e.amount > 0;
                return (
                  <motion.div
                    key={e._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border border-indigo-900/30 rounded-xl p-4 bg-slate-950/30 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <p className="font-semibold text-sm text-indigo-100 break-words">{e.type || "Transaction"}</p>
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            isPositive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}>
                            {isPositive ? "Income" : "Expense"}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-400/60 break-words">
                          Hospital: {e.hospitalId?.slice(-8) || "-"} · Pharmacy: {e.pharmacyId?.slice(-8) || "-"}
                        </p>
                        {e.occurredAt && (
                          <p className="text-xs text-indigo-400/50 mt-1">
                            {new Date(e.occurredAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right sm:ml-4 flex-shrink-0 w-full sm:w-auto">
                        <p className={`text-lg font-bold ${isPositive ? "text-emerald-300" : "text-red-300"}`}>
                          {isPositive ? "+" : "-"}₹{Math.abs(e.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {entries.length === 0 && (
                <p className="text-sm text-indigo-400/60 text-center py-8">
                  No finance entries yet. They will be created by your business flows (consultations, orders, stock, etc.).
                </p>
              )}
            </div>
          </AnimatedCard>
        </>
      )}
    </Layout>
  );
}
