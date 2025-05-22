"use client";

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Product } from '../../types/product';

interface StatisticsProps {
  products: Product[];
}

const Statistics: React.FC<StatisticsProps> = ({ products = [] }) => {
  const priceChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const priceChartInstance = useRef<Chart | null>(null);
  const categoryChartInstance = useRef<Chart | null>(null);
  const trendChartInstance = useRef<Chart | null>(null);

  // Charts update effect
  useEffect(() => {
    if (!products.length) return;

    // Clean up existing charts
    if (priceChartInstance.current) {
      priceChartInstance.current.destroy();
    }
    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }
    if (trendChartInstance.current) {
      trendChartInstance.current.destroy();
    }

    // Price Distribution Chart
    const priceRanges = {
      'Under $50': 0,
      '$50-$100': 0,
      '$100-$200': 0,
      '$200-$300': 0,
      'Over $300': 0,
    };

    products.forEach((product) => {
      const price = product.price;
      if (price < 50) priceRanges['Under $50']++;
      else if (price < 100) priceRanges['$50-$100']++;
      else if (price < 200) priceRanges['$100-$200']++;
      else if (price < 300) priceRanges['$200-$300']++;
      else priceRanges['Over $300']++;
    });

    if (priceChartRef.current) {
      priceChartInstance.current = new Chart(priceChartRef.current, {
        type: 'bar',
        data: {
          labels: Object.keys(priceRanges),
          datasets: [
            {
              label: 'Number of Products',
              data: Object.values(priceRanges),
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          animation: {
            duration: 500
          },
          plugins: {
            title: {
              display: true,
              text: 'Price Distribution (Real-time)',
            },
          },
        },
      });
    }

    // Category Distribution Chart
    const categoryCounts = products.reduce((acc, product) => {
      acc[product.category_name] = (acc[product.category_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (categoryChartRef.current) {
      categoryChartInstance.current = new Chart(categoryChartRef.current, {
        type: 'doughnut',
        data: {
          labels: Object.keys(categoryCounts),
          datasets: [
            {
              data: Object.values(categoryCounts),
              backgroundColor: [
                'rgba(59, 130, 246, 0.5)',
                'rgba(16, 185, 129, 0.5)',
                'rgba(245, 158, 11, 0.5)',
                'rgba(239, 68, 68, 0.5)',
                'rgba(139, 92, 246, 0.5)',
              ],
              borderColor: [
                'rgb(59, 130, 246)',
                'rgb(16, 185, 129)',
                'rgb(245, 158, 11)',
                'rgb(239, 68, 68)',
                'rgb(139, 92, 246)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          animation: {
            duration: 500
          },
          plugins: {
            title: {
              display: true,
              text: 'Category Distribution (Real-time)',
            },
            legend: {
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 15
              }
            }
          },
        },
      });
    }

    // Price Trend Chart (last 20 products)
    const recentProducts = [...products].slice(-20);
    const priceTrendData = recentProducts.map((product) => product.price);

    if (trendChartRef.current) {
      trendChartInstance.current = new Chart(trendChartRef.current, {
        type: 'line',
        data: {
          labels: recentProducts.map((_, index) => `Product ${index + 1}`),
          datasets: [
            {
              label: 'Price',
              data: priceTrendData,
              borderColor: 'rgb(59, 130, 246)',
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          animation: {
            duration: 500
          },
          plugins: {
            title: {
              display: true,
              text: 'Recent Price Trend (Real-time)',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Price ($)'
              }
            }
          }
        },
      });
    }
  }, [products]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-4 rounded-lg shadow">
        <canvas ref={priceChartRef}></canvas>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <canvas ref={categoryChartRef}></canvas>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <canvas ref={trendChartRef}></canvas>
      </div>
    </div>
  );
};

export default Statistics;