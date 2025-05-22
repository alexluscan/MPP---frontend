"use client";

import { useEffect } from 'react';
import { useNetworkStatus } from '../services/networkStatus';
import { saveToLocalStorage, loadFromLocalStorage, syncWithServer } from '../services/localStorage';

export const useOfflineOperations = (apiEndpoint: string) => {
  const { isNetworkDown, isServerDown, pendingOperations } = useNetworkStatus();

  // Save pending operations to local storage
  useEffect(() => {
    if (pendingOperations.length > 0) {
      saveToLocalStorage(pendingOperations);
    }
  }, [pendingOperations]);

  // Attempt to sync when coming back online
  useEffect(() => {
    if (!isNetworkDown && !isServerDown) {
      syncWithServer(apiEndpoint);
    }
  }, [isNetworkDown, isServerDown, apiEndpoint]);

  // Check server status periodically
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(apiEndpoint, { method: 'HEAD' });
        useNetworkStatus.getState().setServerStatus(!response.ok);
      } catch (error) {
        useNetworkStatus.getState().setServerStatus(true);
      }
    };

    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [apiEndpoint]);

  return {
    isOffline: isNetworkDown || isServerDown,
    isServerDown,
    pendingOperations: loadFromLocalStorage(),
  };
};