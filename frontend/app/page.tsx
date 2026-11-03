"use client";

import { useState, useEffect } from "react";

// Update this to your exact backend URL (no trailing slash)
const API_URL = "https://scm-backend.wittycoast-8732c29e.centralindia.azurecontainerapps.io";

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [correlationResult, setCorrelationResult] = useState<any>(null);

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
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">SCM Portal Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 p-2 border rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 p-2 border rounded text-black"
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Supply Chain Control Tower</h1>
      
      {dashboardData && (
        <>
          {/* Actionable KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
              <h3 className="text-gray-500 text-sm font-semibold uppercase">Order Fill Rate</h3>
              <p className="text-3xl font-bold text-gray-800">{dashboardData.metrics.Order_Fill_Rate}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
              <h3 className="text-gray-500 text-sm font-semibold uppercase">On-Time Delivery</h3>
              <p className="text-3xl font-bold text-gray-800">{dashboardData.metrics.On_Time_Delivery}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500">
              <h3 className="text-gray-500 text-sm font-semibold uppercase">Open Orders</h3>
              <p className="text-3xl font-bold text-red-600">{dashboardData.metrics.Open_Orders}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
              <h3 className="text-gray-500 text-sm font-semibold uppercase">Pending Inv. Value</h3>
              <p className="text-3xl font-bold text-gray-800">{dashboardData.metrics.Pending_Inventory_Value}</p>
            </div>
          </div>

          {/* Upgraded Orders Table */}
          <div className="bg-white p-6 rounded-xl shadow mb-8 overflow-x-auto">
            <h3 className="text-xl font-bold mb-4">Operational Order Log</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 border-b">Order ID</th>
                  <th className="p-3 border-b">SKU</th>
                  <th className="p-3 border-b">Product Name</th>
                  <th className="p-3 border-b">Ordered</th>
                  <th className="p-3 border-b">Delivered</th>
                  <th className="p-3 border-b">Order Date</th>
                  <th className="p-3 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.orders.map((order: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3">{order.order_id}</td>
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
        </>
      )}

      {/* Demand Analytics Section */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-xl font-bold mb-4">Demand Analytics (Correlation)</h3>
        <form onSubmit={handleFileUpload} className="flex gap-4 items-center">
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="border p-2 rounded"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Analyze
          </button>
        </form>
        
        {correlationResult && (
          <div className="mt-4 p-4 bg-gray-50 border rounded">
            <p><strong>File:</strong> {correlationResult.filename}</p>
            <p><strong>Message:</strong> {correlationResult.message}</p>
            {correlationResult.correlation_score !== "Error" && (
              <p><strong>Pearson Correlation:</strong> {correlationResult.correlation_score}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}