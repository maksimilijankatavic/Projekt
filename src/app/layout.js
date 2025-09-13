import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Background from "@/components/shared/Background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SentimentLab",
  description: "Advanced sentiment analysis platform featuring VADER, Naive Bayes, and RoBERTa models.",
  keywords: [
    "sentiment analysis",
    "VADER sentiment",
    "Naive Bayes classifier",
    "RoBERTa model",
    "text analysis",
    "machine learning",
    "natural language processing",
    "NLP",
    "emotion detection",
    "text mining",
    "AI sentiment tool",
    "Maksimilijan Katavić"
  ],
  authors: [{ name: "Maksimilijan Katavić" }],
  creator: "Maksimilijan Katavić",
  publisher: "Maksimilijan Katavić",
  robots: {
    index: true,
    follow: true,
  },
  category: 'technology',
  classification: 'Machine Learning Tools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030712]`}
      >
        <Background />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
