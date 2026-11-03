"use client";

import { useState } from "react";

const API_URL = "https://scm-backend.wittycoast-8732c29e.centralindia.azurecontainerapps.io";

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [correlationResult, setCorrelationResult] = useState<any>(null);
  
  // Tab state for navigation
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        fetchDashboard(data.token);
      } else {
        alert(data.detail || "Login failed");
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

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">SCM Portal Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-black"
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded hover:bg-blue-700 transition">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      {/* Bright Corporate Blue Top Navigation Bar */}
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wide">Control Tower</h1>
          
          <div className="flex items-center space-x-6">
            <div className="flex space-x-2 border-r border-blue-400 pr-6">
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 rounded font-semibold transition ${activeTab === "dashboard" ? "bg-blue-700 shadow-inner" : "hover:bg-blue-500"}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 rounded font-semibold transition ${activeTab === "analytics" ? "bg-blue-700 shadow-inner" : "hover:bg-blue-500"}`}
              >
                Demand Analytics
              </button>
            </div>
            
            {/* Restored Logout Button */}
            <button 
              onClick={handleLogout}
              className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded font-bold transition shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === "dashboard" && dashboardData && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                <h3 className="text-gray-500 text-sm font-semibold uppercase">Order Fill Rate</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.metrics.Order_Fill_Rate}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                <h3 className="text-gray-500 text-sm font-semibold uppercase">On-Time Delivery</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.metrics.On_Time_Delivery}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500">
                <h3 className="text-gray-500 text-sm font-semibold uppercase">Open Orders</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">{dashboardData.metrics.Open_Orders}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                <h3 className="text-gray-500 text-sm font-semibold uppercase">Pending Inv. Value</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.metrics.Pending_Inventory_Value}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Operational Order Log</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b font-semibold">Order ID</th>
                    <th className="p-3 border-b font-semibold">SKU</th>
                    <th className="p-3 border-b font-semibold">Product Name</th>
                    <th className="p-3 border-b font-semibold">Ordered</th>
                    <th className="p-3 border-b font-semibold">Delivered</th>
                    <th className="p-3 border-b font-semibold">Order Date</th>
                    <th className="p-3 border-b font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.orders.map((order: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="p-3 font-medium">{order.order_id}</td>
                      <td className="p-3 text-gray-500">{order.sku}</td>
                      <td className="p-3">{order.product_name}</td>
                      <td className="p-3">{order.ordered_qty}</td>
                      <td className="p-3">{order.delivered_qty}</td>
                      <td className="p-3">{order.order_date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          order.status === 'Fulfilled' ? 'bg-green-100 text-green-800' :
                          order.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DEMAND ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="animate-fade-in bg-white p-8 rounded-xl shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Demand Analytics</h3>
            <p className="text-gray-600 mb-6">Upload a CSV file to calculate Pearson correlation between demand variables.</p>
            
            <form onSubmit={handleFileUpload} className="flex gap-4 items-center bg-gray-50 p-6 rounded border border-gray-200">
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="border bg-white p-2 rounded w-full md:w-auto text-black"
              />
              <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded hover:bg-blue-700 transition">
                Analyze Data
              </button>
            </form>
            
            {correlationResult && (
              <div className={`mt-6 p-6 rounded border ${correlationResult.correlation_score === "Error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <h4 className="font-bold text-lg mb-2">Analysis Results</h4>
                <p className="mb-1"><span className="font-semibold">File:</span> {correlationResult.filename}</p>
                <p className="mb-1"><span className="font-semibold">Status:</span> {correlationResult.message}</p>
                {correlationResult.correlation_score !== "Error" && (
                  <p className="text-xl mt-4"><span className="font-semibold">Correlation Score:</span> <span className="text-blue-700 font-bold">{correlationResult.correlation_score}</span></p>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}