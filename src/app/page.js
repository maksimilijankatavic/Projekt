/* eslint-disable react/no-unescaped-entities */

"use client"; {/* Bez ovog hook-ovi ne rade. */}

import Header from "@/components/shared/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CircleArrowUp } from "lucide-react";
import { useRef, useState } from "react";

export default function Home() {
  const inputValue = useRef("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const handleChange = (e) => {
    inputValue.current = e.target.value;
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      submit();
    }
  }

  const submit = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputValue.current }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="px-6 py-12 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">Let's get started.</span>
          </h1>
          <p className="text-4xl text-gray-400">What text would you like to analyze?</p>
        </div>
        <div className="mb-12">
          <h2 className="text-lg text-gray-400 mb-4">Analyze text with AI</h2>
          <div className="relative mb-6">
            <div className="relative bg-orange-500/5 backdrop-blur-sm rounded-xl p-6 focus-within:bg-orange-500/8">
              <Input onChange={handleChange} onKeyDown={handleKeyDown} className="bg-transparent border-none !text-lg text-gray-400 placeholder:text-gray-400 focus-visible:ring-0 p-0" placeholder="Type anything" /> {/* Iz nekog razloga ne radi bez ! uz text-lg. */}
              <div className="absolute bottom-6 right-6">
                <Button onClick={submit} disabled={loading} className="cursor-pointer text-gray-400 bg-orange-500/5 hover:text-orange-400 hover:bg-orange-500/10" aria-label="submit">
                  {loading ? "..." : <CircleArrowUp />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {error && <p className="text-red-500">{error}</p>}

        {data && (
          <div className="space-y-4">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
