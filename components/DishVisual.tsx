
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChefHat, 
  Flame, 
  Utensils, 
  Soup, 
  Leaf, 
  Pizza, 
  Globe2,
  IceCream
} from 'lucide-react';
import { DishCategory } from '../types';
import { getDishImageCandidates } from '../utils/dishImageSources';

interface DishVisualProps {
  category: DishCategory;
  className?: string;
  iconSize?: number;
  imageUrl?: string;
  dishId?: string;
}

const DishVisual: React.FC<DishVisualProps> = ({ category, className = "", iconSize = 48, imageUrl, dishId }) => {
  const imageCandidates = useMemo(() => getDishImageCandidates(dishId, imageUrl), [dishId, imageUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = imageCandidates[candidateIndex] || null;

  useEffect(() => {
    setImageError(false);
    setIsLoaded(false);
    setCandidateIndex(0);
  }, [imageCandidates]);

  const handleImageError = () => {
    setIsLoaded(false);
    if (candidateIndex + 1 < imageCandidates.length) setCandidateIndex(candidateIndex + 1);
    else setImageError(true);
  };

  const getVisualConfig = (cat: DishCategory) => {
    switch (cat) {
      case 'stew': return { bg: 'bg-gradient-to-br from-emerald-600 to-teal-800', icon: Leaf, pattern: 'opacity-20' };
      case 'polo': return { bg: 'bg-gradient-to-br from-amber-400 to-orange-600', icon: Utensils, pattern: 'opacity-10' };
      case 'kabab': return { bg: 'bg-gradient-to-br from-red-600 to-rose-900', icon: Flame, pattern: 'opacity-20' };
      case 'ash': return { bg: 'bg-gradient-to-br from-lime-600 to-green-800', icon: Soup, pattern: 'opacity-20' };
      case 'soup': return { bg: 'bg-gradient-to-br from-orange-400 to-red-600', icon: Soup, pattern: 'opacity-20' };
      case 'khorak': return { bg: 'bg-gradient-to-br from-yellow-500 to-amber-700', icon: ChefHat, pattern: 'opacity-20' };
      case 'fastfood': return { bg: 'bg-gradient-to-br from-pink-500 to-rose-700', icon: Pizza, pattern: 'opacity-20' };
      case 'international': return { bg: 'bg-gradient-to-br from-indigo-500 to-violet-800', icon: Globe2, pattern: 'opacity-20' };
      case 'dessert': return { bg: 'bg-gradient-to-br from-amber-500 to-amber-800', icon: IceCream, pattern: 'opacity-20' };
      default: return { bg: 'bg-gradient-to-br from-gray-500 to-gray-700', icon: ChefHat, pattern: 'opacity-10' };
    }
  };

  const config = getVisualConfig(category);
  const Icon = config.icon;

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${config.bg} ${className}`}>
      <div className={`absolute inset-0 ${config.pattern} bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]`}></div>
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
      
      {(!resolvedSrc || imageError || !isLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300">
          <Icon size={iconSize} className="text-white opacity-40 drop-shadow-lg" strokeWidth={1.5} />
        </div>
      )}
      
      {resolvedSrc && !imageError && (
        <img 
          src={resolvedSrc} 
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 z-20 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError} 
          loading="lazy" decoding="async"
        />
      )}
      <div className="absolute inset-0 bg-black/10 z-30 pointer-events-none"></div>
    </div>
  );
};

export default DishVisual;
