'use client';

import { Coffee, Heart } from 'lucide-react';
import { useState } from 'react';

export function CoffeeButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href="https://coff.ee/codewithtoni"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Support this free project"
      >
        <Coffee className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'animate-bounce' : ''}`} />
        
        {/* Expandable text */}
        <div className={`overflow-hidden transition-all duration-300 ${isHovered ? 'max-w-32 opacity-100' : 'max-w-0 opacity-0'}`}>
          <span className="whitespace-nowrap font-medium text-sm">Buy me a coffee</span>
        </div>
        
        {/* Heart icon when hovered */}
        <Heart className={`w-4 h-4 text-red-300 transition-all duration-300 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
      </a>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
          <div className="text-center">
            <p className="font-medium">Support WW3 Dashboard</p>
            <p className="text-slate-300">Help keep this project free & updated</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
} 