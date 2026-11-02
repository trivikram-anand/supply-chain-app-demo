"use client";
import { useState } from "react";

export default function Home() {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [metrics, setMetrics] = useState<Record<string, any> | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [corrResult, setCorrResult] = useState<any>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://scm-backend.wittycoast-8732c29e.centralindia.azurecontainerapps.io";

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid username or password");
      }

      const json = await res.json();
      if (json.token) {
        setTab("dashboard");
        loadDashboard();
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError(error.message || "Login failed");
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`);
      const json = await res.json();
      setMetrics(json.metrics);
      setOrders(json.orders || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/correlate`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setCorrResult(json);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-blue-400">
            Supply Chain Control Tower
          </h1>
          {tab !== "login" && (
            <div className="space-x-4">
              <button
                onClick={() => setTab("dashboard")}
                className={`px-4 py-2 rounded ${
                  tab === "dashboard" ? "bg-blue-600" : "bg-slate-800"
                }`}
              >
                SQL KPI Dashboard
              </button>
              <button
                onClick={() => setTab("correlate")}
                className={`px-4 py-2 rounded ${
                  tab === "correlate" ? "bg-blue-600" : "bg-slate-800"
                }`}
              >
                Demand Correlation
              </button>
              <button
                onClick={() => setTab("login")}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* LOGIN TAB */}
        {tab === "login" && (
          <div className="max-w-sm mx-auto mt-16 bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-xl font-bold mb-4">SCM Portal Login</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white"
                />
              </div>
              {loginError && (
                <p className="text-red-400 text-sm">{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign In with SQLite JWT
              </button>
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Live SQL-Calculated KPIs
              </h2>
              {metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(metrics).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-slate-800 p-6 rounded-lg border border-slate-700"
                    >
                      <p className="text-slate-400 text-sm">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-3xl font-bold text-blue-400 mt-2">
                        {String(val)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Querying SQLite database...</p>
              )}
            </div>

            {/* RAW SQL TABLE VIEW */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Underlying SQL Table: <code>supply_chain_orders</code>
              </h3>
              <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Ordered Qty</th>
                      <th className="p-3">Delivered Qty</th>
                      <th className="p-3">On Time</th>
                      <th className="p-3">COGS ($)</th>
                      <th className="p-3">Inventory Val ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr
                        key={o.order_id}
                        className="border-b border-slate-700/50"
                      >
                        <td className="p-3">{o.order_id}</td>
                        <td className="p-3 font-mono text-blue-300">{o.sku}</td>
                        <td className="p-3">{o.ordered_qty}</td>
                        <td className="p-3">{o.delivered_qty}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              o.on_time === "Yes"
                                ? "bg-green-900 text-green-300"
                                : "bg-red-900 text-red-300"
                            }`}
                          >
                            {o.on_time}
                          </span>
                        </td>
                        <td className="p-3">${o.cogs.toLocaleString()}</td>
                        <td className="p-3">
                          ${o.inventory_value.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CORRELATE TAB */}
        {tab === "correlate" && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-xl">
            <h2 className="text-xl font-bold mb-4">
              Upload Demand CSV for Correlation
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-4 block w-full text-sm text-slate-300"
            />
            <button
              onClick={handleUpload}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
            >
              Calculate Pearson Correlation
            </button>

            {corrResult && (
              <div className="mt-6 p-4 bg-slate-900 rounded border border-slate-700">
                <p>
                  <strong>Processed:</strong> {corrResult.filename}
                </p>
                <p className="text-xl font-bold text-green-400 mt-1">
                  Score: {corrResult.correlation_score}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {corrResult.message}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}