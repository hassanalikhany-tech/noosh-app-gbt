
import React, { useState, useEffect, useRef } from 'react';
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

interface DishVisualProps {
  category: DishCategory;
  className?: string;
  iconSize?: number;
  imageUrl?: string;
  dishId?: string;
}

const DishVisual: React.FC<DishVisualProps> = ({ category, className = "", iconSize = 48, imageUrl, dishId }) => {
  const [imageError, setImageError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageError(false);
    setIsLoaded(false);
    setRetryCount(0);
    
    const isGitHubId = dishId && (dishId.startsWith('dish-') || /^[a-f0-9-]{8,}/i.test(dishId) || dishId.includes('-'));
    
    if (imageUrl?.trim()) {
      setResolvedSrc(imageUrl);
    } else if (isGitHubId) {
      const githubUrl = `https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/public/images/dishes/${dishId}.png`;
      setResolvedSrc(githubUrl);
    } else if (imageUrl && imageUrl.trim() !== "" && !imageUrl.includes('unsplash.com')) {
      setResolvedSrc(imageUrl);
    } else if (dishId) {
      const githubUrl = `https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/public/images/dishes/${dishId}.png`;
      setResolvedSrc(githubUrl);
    } else if (imageUrl && imageUrl.trim() !== "") {
      setResolvedSrc(imageUrl);
    } else {
      setResolvedSrc(null);
    }
  }, [imageUrl, dishId]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    }
  }, [resolvedSrc]);

  const handleImageError = () => {
    if (!dishId) {
      setImageError(true);
      return;
    }

    const isGitHub = resolvedSrc?.includes('raw.githubusercontent.com');

    if (retryCount === 0) { 
      const ext = 'jpg';
      const nextSrc = isGitHub 
        ? `https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/public/images/dishes/${dishId}.${ext}`
        : `images/dishes/${dishId}.${ext}`;
      setResolvedSrc(nextSrc);
      setRetryCount(1); 
    } else if (retryCount === 1) { 
      const ext = 'jpeg';
      const nextSrc = isGitHub 
        ? `https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/public/images/dishes/${dishId}.${ext}`
        : `images/dishes/${dishId}.${ext}`;
      setResolvedSrc(nextSrc);
      setRetryCount(2); 
    } else { 
      setImageError(true); 
    }
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
          ref={imgRef}
          src={resolvedSrc} 
          alt="Dish" 
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
