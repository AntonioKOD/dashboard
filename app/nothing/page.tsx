'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Coffee, Moon, Sun } from 'lucide-react';
import Link from 'next/link';

export default function NothingEverHappensPage() {
  const [isGlowing, setIsGlowing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Glow effect animation
    const glowInterval = setInterval(() => {
      setIsGlowing(prev => !prev);
    }, 2000);

    // Update time
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(glowInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const funFacts = [
    "🔍 Investigation reveals: The world is actually quite peaceful right now",
    "📊 Data analysis shows: More coffee was consumed than conflicts started today",
    "🕵️ Secret intelligence: Cats are still plotting world domination (that's classified as normal)",
    "📱 Surveillance indicates: Someone is probably watching Netflix instead of news",
    "🌱 Field report: A tree grew somewhere while you read this",
    "🎯 Critical finding: Video game conflicts are more intense than real ones",
    "🍕 Verified fact: Pizza delivery is more reliable than most news sources"
  ];

  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % funFacts.length);
    }, 3000);

    return () => clearInterval(factInterval);
  }, [funFacts.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Back button */}
        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center space-x-2 text-slate-400 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Main title */}
        <div className="text-center mb-12">
          <h1 className={`text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-6 transition-all duration-1000 ${
            isGlowing ? 'drop-shadow-2xl filter blur-[1px]' : 'drop-shadow-lg'
          }`}>
            NOTHING
          </h1>
          <h2 className={`text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400 mb-6 transition-all duration-1000 ${
            isGlowing ? 'drop-shadow-2xl filter blur-[1px]' : 'drop-shadow-lg'
          }`}>
            EVER
          </h2>
          <h3 className={`text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 transition-all duration-1000 ${
            isGlowing ? 'drop-shadow-2xl filter blur-[1px]' : 'drop-shadow-lg'
          }`}>
            HAPPENS!!!
          </h3>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-300 text-center mb-8 max-w-2xl leading-relaxed">
          🕵️ You wanted to know the real truth? Here it is...
        </p>
        <p className="text-lg text-slate-400 text-center mb-12 max-w-xl leading-relaxed">
          Sometimes the best news is no news. Take a deep breath, the world is still spinning, 
          and your coffee is probably getting cold.
        </p>

        {/* Investigation Results */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-600/50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-2xl">🔍</span>
            <h4 className="text-lg font-semibold text-purple-300">Investigation Complete</h4>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-center text-slate-300 text-lg transition-all duration-500">
            {funFacts[currentFact]}
          </p>
        </div>

        {/* Current time display */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-8">
          <div className="flex items-center space-x-3">
            {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? 
              <Sun className="w-5 h-5 text-yellow-400" /> : 
              <Moon className="w-5 h-5 text-blue-400" />
            }
            <span className="text-slate-300">
              Nothing is still happening at {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Coffee support button */}
        <div className="text-center">
          <p className="text-slate-400 mb-4">Enjoying the peace and quiet?</p>
          <a
            href="https://coff.ee/codewithtoni"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Coffee className="w-5 h-5 animate-bounce" />
            <span className="font-medium">Buy me a coffee for this zen experience</span>
          </a>
        </div>
      </div>

      {/* Floating peaceful elements */}
      <div className="absolute bottom-10 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>
        😴
      </div>
      <div className="absolute top-1/4 right-10 text-4xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>
        ☮️
      </div>
      <div className="absolute bottom-1/3 right-1/4 text-5xl animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>
        🕊️
      </div>
    </div>
  );
} 