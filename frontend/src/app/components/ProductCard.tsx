import React from "react";
import Image from "next/image";
import { Product } from "@/types/product";
import { FaEdit, FaTrash, FaDownload } from 'react-icons/fa';

interface ProductCardProps {
  product: Product;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  priceStats?: {
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  priceStats,
}) => {
  const { id, name, description, price, category_name, image, video } = product;
  
  // Handle both path formats (with or without /assets)
  const imagePath = image.startsWith('/assets') ? image : `/assets${image}`;

  // Determine price highlighting
  const getPriceHighlightClass = () => {
    if (!priceStats) return '';
    
    const { maxPrice, minPrice, avgPrice } = priceStats;
    const priceDiff = Math.abs(price - avgPrice);
    const avgPriceRange = (maxPrice - minPrice) * 0.1; // 10% of price range

    if (price === maxPrice) return 'bg-red-100 text-red-800';
    if (price === minPrice) return 'bg-green-100 text-green-800';
    if (priceDiff <= avgPriceRange) return 'bg-yellow-100 text-yellow-800';
    return '';
  };

  const handleDownload = async () => {
    if (!video) return;
    
    try {
      const response = await fetch(video);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = video.split('/').pop() || 'video';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video');
    }
  };

  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48 w-full">
        <Image
          src={imagePath}
          alt={name}
          fill
          className="object-cover bg-gray-200"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={() => onEdit(id)}
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
            aria-label="Edit product"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => onDelete(id)}
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
            aria-label="Delete product"
          >
            <FaTrash />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {category_name}
          </span>
        </div>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className={`text-xl font-bold px-3 py-1 rounded ${getPriceHighlightClass()}`}>
            ${Number(price).toFixed(2)}
          </p>
          {priceStats && (
            <div className="text-xs text-gray-500">
              {price === priceStats.maxPrice && 'Most Expensive'}
              {price === priceStats.minPrice && 'Least Expensive'}
              {Math.abs(price - priceStats.avgPrice) <= (priceStats.maxPrice - priceStats.minPrice) * 0.1 && 'Average Price'}
            </div>
          )}
        </div>
        {video && (
          <button
            onClick={handleDownload}
            className="absolute bottom-2 right-2 flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            title="Download product video"
          >
            <FaDownload />
            <span className="text-sm">Video</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
