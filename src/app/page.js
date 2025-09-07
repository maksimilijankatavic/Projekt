/* eslint-disable react/no-unescaped-entities */

"use client"; {/* Bez ovog hook-ovi ne rade. */}

import Header from "@/components/shared/Header";
import { Textarea } from "@/components/ui/textarea"; // Changed from input to textarea
import { Button } from "@/components/ui/button";
import { CircleArrowUp } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    
    if (!inputValue.trim()) return; // Don't submit empty input
    
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputValue }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="px-6 py-12 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Let's get started.
            </span>
          </h1>
          <p className="text-4xl text-gray-400">What text would you like to analyze?</p>
        </div>
        
        <div className="mb-12">
          <h2 className="text-lg text-gray-400 mb-4">Analyze text with AI</h2>
          
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative bg-orange-500/5 backdrop-blur-sm rounded-xl p-6 focus-within:bg-orange-500/8">
              <Textarea 
                value={inputValue}
                onChange={handleChange} 
                className="bg-transparent border-none !text-lg text-gray-400 placeholder:text-gray-400 focus-visible:ring-0 p-0 pr-16 resize-none !min-h-6 h-6 leading-6" 
                placeholder="Type anything"
                disabled={loading}
                aria-label="Text to analyze"
                rows={1}
              />
              <div className="absolute top-1/2 right-6 -translate-y-1/2">
                <Button 
                  type="submit"
                  disabled={loading || !inputValue.trim()} 
                  className="cursor-pointer text-gray-400 bg-orange-500/5 hover:text-orange-400 hover:bg-orange-500/10" 
                  aria-label="Submit text for analysis"
                >
                  {loading ? "..." : <CircleArrowUp />}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-4">
            <p className="text-red-500" role="alert">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-300">Analysis Results:</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}