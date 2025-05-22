"use client";

import { create } from 'zustand';

interface NetworkStatus {
  isNetworkDown: boolean;
  isServerDown: boolean;
  pendingOperations: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    data: any;
    timestamp: number;
  }>;
  setNetworkStatus: (status: boolean) => void;
  setServerStatus: (status: boolean) => void;
  addPendingOperation: (operation: { type: 'CREATE' | 'UPDATE' | 'DELETE'; data: any }) => void;
  clearPendingOperations: () => void;
}

export const useNetworkStatus = create<NetworkStatus>((set) => ({
  isNetworkDown: false,
  isServerDown: false,
  pendingOperations: [],
  setNetworkStatus: (status) => set({ isNetworkDown: status }),
  setServerStatus: (status) => set({ isServerDown: status }),
  addPendingOperation: (operation) => 
    set((state) => ({
      pendingOperations: [...state.pendingOperations, { ...operation, timestamp: Date.now() }]
    })),
  clearPendingOperations: () => set({ pendingOperations: [] }),
}));

// Initialize network status listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStatus.getState().setNetworkStatus(false);
  });
  
  window.addEventListener('offline', () => {
    useNetworkStatus.getState().setNetworkStatus(true);
  });

  // Initial check
  useNetworkStatus.getState().setNetworkStatus(!navigator.onLine);
}