/* eslint-disable react/no-unescaped-entities */

"use client";

import Header from "@/components/shared/Header";
import SentimentResults from "@/components/shared/SentimentResults";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CircleArrowUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const sentimentRef = useRef(null);
  
  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
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

  useEffect(() => {
    if (data && sentimentRef.current) {
      sentimentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [data]);

  return (
    <div>
      <Header />
      <main className="px-6 py-12 max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Let's get started.
            </span>
          </h1>
          <p className="text-4xl text-gray-400">What text would you like to analyze?</p>
        </div>
        
        <div>
          <h2 className="text-lg text-gray-400 mb-4">Analyze text with AI</h2>
          
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative bg-orange-500/5 backdrop-blur-sm rounded-xl p-6 focus-within:bg-orange-500/8">
              <Textarea 
                id="text-analysis-input"
                name="textInput"
                value={inputValue}
                onChange={handleChange} 
                className="bg-transparent border-none !text-lg text-gray-400 placeholder:text-gray-400 focus-visible:ring-0 p-0 pr-16 resize-none !min-h-6 leading-6" 
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
                  {loading ? (
                    <svg 
                      className="w-5 h-5 animate-spin text-gray-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      ></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  ) : (
                    <CircleArrowUp />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400" role="alert">{error}</p>
            </div>
          </div>
        )}

        {data && (
          <div ref={sentimentRef} className="space-y-6 pt-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-300 mb-2">Analysis Results</h3>
              <p className="text-gray-400">Comprehensive sentiment analysis from multiple AI models</p>
            </div>
            <SentimentResults data={data} />
          </div>
        )}
      </main>
    </div>
  );
}