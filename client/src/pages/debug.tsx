import React, { useState, useEffect } from 'react';

export default function Debug() {
  const [apiStatus, setApiStatus] = useState<string>("Loading...");
  const [testResponse, setTestResponse] = useState<any>(null);
  
  useEffect(() => {
    async function testApiEndpoint() {
      try {
        // Test the simple test endpoint
        const response = await fetch('/api/test');
        const data = await response.json();
        setTestResponse(data);
        setApiStatus("Connected");
      } catch (error) {
        console.error("API test failed:", error);
        setApiStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    testApiEndpoint();
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Connection Debug</h1>
      <div className="mb-4">
        <strong>Status:</strong> <span className={apiStatus === "Connected" ? "text-green-500" : "text-red-500"}>{apiStatus}</span>
      </div>
      
      {testResponse && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Test Endpoint Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(testResponse, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">API Endpoints:</h2>
        <ul className="list-disc pl-5">
          <li><code>/api/test</code> - Simple test endpoint</li>
          <li><code>/api/users</code> - User data</li>
          <li><code>/api/posts</code> - Feed posts</li>
          <li><code>/api/workouts</code> - Workout data</li>
        </ul>
      </div>
    </div>
  );
} 