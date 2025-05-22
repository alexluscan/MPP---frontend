"use client";

import { useNetworkStatus } from '@/services/networkStatus';

export default function StatusIndicator() {
  const { isNetworkDown, isServerDown } = useNetworkStatus();

  return (
    <div className={`fixed top-0 left-0 right-0 p-4 border-b ${
      isNetworkDown || isServerDown 
        ? 'bg-yellow-100 border-yellow-200' 
        : 'bg-green-100 border-green-200'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isNetworkDown ? (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Network Connection Lost</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Network Connected</span>
            </div>
          )}
          {isServerDown ? (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Server Unavailable</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Server Connected</span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {isNetworkDown || isServerDown 
            ? 'Working offline - Changes will sync when connection is restored'
            : 'All systems operational'}
        </div>
      </div>
    </div>
  );
} 