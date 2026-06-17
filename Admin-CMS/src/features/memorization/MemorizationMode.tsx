import { useState } from 'react';
import { Play, Pause, ChevronLeft, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MemorizationMode() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fontSize, setFontSize] = useState(4); // rem
  const [lineHeight, setLineHeight] = useState(2);
  const navigate = useNavigate();

  const toggleControls = () => setShowControls(!showControls);

  return (
    <div 
      className="fixed inset-0 bg-white flex items-center justify-center cursor-pointer transition-colors duration-700 z-50"
      onClick={toggleControls}
    >
      {/* Top Controls - Fades out */}
      <div 
        className={`absolute top-0 left-0 right-0 p-6 flex justify-between items-center transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-gray-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-100" onClick={(e) => e.stopPropagation()}>
          <Type className="w-4 h-4 text-gray-400" />
          <input 
            type="range" 
            min="2" max="8" step="0.5" 
            value={fontSize} 
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-24 accent-primary-500"
          />
          <div className="w-px h-4 bg-gray-200 mx-2" />
          <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Spacing</span>
          <input 
            type="range" 
            min="1.5" max="4" step="0.5" 
            value={lineHeight} 
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="w-24 accent-primary-500"
          />
        </div>
      </div>

      {/* Main Content - The Ayah */}
      <div 
        className="max-w-5xl px-8 w-full text-center"
        onClick={(e) => {
          e.stopPropagation();
          toggleControls();
        }}
      >
        <p 
          className="font-arabic text-gray-800 transition-all duration-300"
          style={{ 
            fontSize: `${fontSize}rem`,
            lineHeight: lineHeight,
            direction: 'rtl'
          }}
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      </div>

      {/* Bottom Controls - Fades out */}
      <div 
        className={`absolute bottom-12 left-0 right-0 flex justify-center transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-16 h-16 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 hover:scale-105 transition-all shadow-sm"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </button>
      </div>
    </div>
  );
}

export default MemorizationMode;
