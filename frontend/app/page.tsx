'use client';
import { useState } from 'react';

export default function App() {
  const [tab, setTab] = useState('login');
  const [data, setData] = useState<any>(null);
  const [correlationResult, setCorrelationResult] = useState<any>(null);

  // Added https:// prefix to ensure standard web protocol routing
  const API_URL = "https://scm-backend.wittycoast-8732c29e.centralindia.azurecontainerapps.io"; 

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/login?username=admin`, { method: 'POST' });
      const json = await res.json();
      if (json.token) {
        setTab('dashboard');
        loadDashboard();
      }
    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`);
      setData(await res.json());
    } catch (error) {
      console.error("Dashboard failed", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/correlate`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      setCorrelationResult(result);
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
          <h1 className="text-2xl font-bold">Supply Chain Analytics</h1>
          <div className="flex gap-4">
            <button onClick={() => setTab('login')} className={`px-3 py-1 rounded ${tab === 'login' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>Login</button>
            <button onClick={() => { setTab('dashboard'); loadDashboard(); }} className={`px-3 py-1 rounded ${tab === 'dashboard' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>Dashboard</button>
            <button onClick={() => setTab('correlation')} className={`px-3 py-1 rounded ${tab === 'correlation' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>Demand Correlation</button>
          </div>
        </div>

        <div className="p-8 min-h-[400px]">
          {tab === 'login' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 pt-16">
              <h2 className="text-xl font-semibold">System Authentication</h2>
              <button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded shadow">
                Mock Login (Admin)
              </button>
            </div>
          )}

          {tab === 'dashboard' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Live Logistics Metrics</h2>
              <div className="grid grid-cols-3 gap-6">
                {data ? (
                  Object.entries(data.metrics).map(([key, value]) => (
                    <div key={key} className="bg-slate-100 p-6 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 uppercase font-bold">{key.replace(/_/g, ' ')}</p>
                      <p className="text-3xl font-light text-blue-900 mt-2">{String(value)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 animate-pulse">Fetching telemetry from backend...</p>
                )}
              </div>
            </div>
          )}

          {tab === 'correlation' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Demand Correlation Engine</h2>
              <div className="border-dashed border-2 border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center text-slate-700 bg-slate-50">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="mb-4 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                
                {correlationResult && (
                  <div className="mt-8 text-center bg-white p-4 rounded shadow-sm border w-full max-w-md">
                    <p className="text-sm text-slate-500">Processed: {correlationResult.filename}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">Score: {correlationResult.correlation_score}</p>
                    <p className="text-sm text-green-600 mt-1">{correlationResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}