"use client";

import { useState } from "react";
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API_URL = "https://scm-backend.wittycoast-8732c29e.centralindia.azurecontainerapps.io";

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [correlationResult, setCorrelationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isRegistering) {
          alert(data.message);
          setIsRegistering(false); // Flip back to login view
          setPassword(""); // Clear password for safety
        } else {
          setToken(data.token);
          fetchDashboard(data.token);
        }
      } else {
        alert(data.detail || "Authentication failed");
      }
    } catch (error) {
      alert("Error connecting to backend.");
    }
  };

  const handleLogout = () => {
    setToken("");
    setUsername("");
    setPassword("");
    setDashboardData(null);
    setCorrelationResult(null);
    setFile(null);
    setActiveTab("dashboard");
  };

  const fetchDashboard = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/correlate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setCorrelationResult(data);
    } catch (error) {
      console.error("File upload failed");
    }
  };

  const getInterpretation = (score: number | string) => {
    if (score === "Error" || typeof score !== "number") return "";
    if (score >= 0.7) return "Strong positive relationship (+1)";
    if (score <= -0.7) return "Strong negative relationship (-1)";
    if (score > -0.3 && score < 0.3) return "No linear relationship (0)";
    if (score > 0) return "Moderate positive relationship";
    return "Moderate negative relationship";
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <form onSubmit={handleAuth} className="bg-[#1e293b] p-8 rounded-xl shadow-lg w-96 text-white border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">
            {isRegistering ? "Create Account" : "SCM Portal Login"}
          </h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-3 border border-gray-600 rounded bg-[#0f172a] text-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-3 border border-gray-600 rounded bg-[#0f172a] text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded hover:bg-blue-700 transition">
            {isRegistering ? "Sign Up" : "Login"}
          </button>
          
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="text-sm text-gray-400 hover:text-blue-400 transition"
            >
              {isRegistering ? "Already have an account? Log in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-blue-400 tracking-wide">Supply Chain Control Tower</h1>
        <div className="flex space-x-4 items-center">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded font-semibold transition ${activeTab === "dashboard" ? "bg-blue-600" : "bg-[#1e293b] hover:bg-gray-700"}`}
          >
            Operational Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded font-semibold transition ${activeTab === "analytics" ? "bg-blue-600" : "bg-[#1e293b] hover:bg-gray-700"}`}
          >
            Demand Correlation
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition ml-4"
          >
            Logout
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        
        {activeTab === "dashboard" && dashboardData && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-[#1e293b] p-6 rounded-lg shadow-sm">
                <h3 className="text-gray-400 text-sm mb-2">Order Fill Rate</h3>
                <p className="text-4xl font-bold text-blue-400">{dashboardData.metrics.Order_Fill_Rate}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-lg shadow-sm">
                <h3 className="text-gray-400 text-sm mb-2">On Time Delivery</h3>
                <p className="text-4xl font-bold text-blue-400">{dashboardData.metrics.On_Time_Delivery}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-lg shadow-sm">
                <h3 className="text-gray-400 text-sm mb-2">Open Orders</h3>
                <p className="text-4xl font-bold text-blue-400">{dashboardData.metrics.Open_Orders}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-lg shadow-sm">
                <h3 className="text-gray-400 text-sm mb-2">Pending Inv. Value</h3>
                <p className="text-4xl font-bold text-blue-400">{dashboardData.metrics.Pending_Inventory_Value}</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">Detailed Order Fulfillment Log</h2>
            <div className="bg-[#1e293b] rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e293b] border-b border-gray-700">
                    <th className="p-4 font-semibold text-white">Order ID</th>
                    <th className="p-4 font-semibold text-white">SKU</th>
                    <th className="p-4 font-semibold text-white">Product</th>
                    <th className="p-4 font-semibold text-white">Ordered Qty</th>
                    <th className="p-4 font-semibold text-white">Delivered Qty</th>
                    <th className="p-4 font-semibold text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.orders.map((order: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f172a] transition">
                      <td className="p-4">{order.order_id}</td>
                      <td className="p-4 text-blue-400">{order.sku}</td>
                      <td className="p-4">{order.product_name}</td>
                      <td className="p-4">{order.ordered_qty}</td>
                      <td className="p-4">{order.delivered_qty}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          order.status === 'Fulfilled' ? 'bg-green-900 text-green-400' :
                          order.status === 'Partial' ? 'bg-yellow-900 text-yellow-400' :
                          'bg-red-900 text-red-400'
                        }`}>
                          {order.status === 'Fulfilled' ? 'Yes' : order.status === 'Partial' ? 'Partial' : 'Delayed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="animate-fade-in bg-[#1e293b] p-8 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6">Demand Analytics</h2>
            
            <form onSubmit={handleFileUpload} className="flex gap-4 items-center mb-8">
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="bg-[#0f172a] border border-gray-600 text-white p-2 rounded"
              />
              <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded hover:bg-blue-700 transition">
                Analyze
              </button>
            </form>
            
            {correlationResult && (
              <div className="bg-[#0f172a] p-6 rounded border border-gray-700">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Pearson Correlation</h3>
                    <p className="text-gray-400">X-Axis: <span className="text-blue-400">{correlationResult.col_x}</span></p>
                    <p className="text-gray-400">Y-Axis: <span className="text-blue-400">{correlationResult.col_y}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-blue-400">{correlationResult.correlation_score}</p>
                    <p className="text-gray-400 mt-1">{getInterpretation(correlationResult.correlation_score)}</p>
                  </div>
                </div>

                {correlationResult.data_points && (
                  <div className="h-80 w-full mt-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                        <XAxis dataKey="x" type="number" name={correlationResult.col_x} stroke="#94a3b8" />
                        <YAxis dataKey="y" type="number" name={correlationResult.col_y} stroke="#94a3b8" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }}
                        />
                        <Scatter data={correlationResult.data_points} fill="#60a5fa" />
                        <Line 
                          data={correlationResult.trend_line} 
                          type="linear" 
                          dataKey="trend" 
                          stroke="#ef4444" 
                          strokeWidth={3} 
                          dot={false} 
                          activeDot={false} 
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}