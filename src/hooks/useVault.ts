import { useContext } from 'react';
import { VaultContext, type VaultContextType } from '@/contexts/VaultContext';

export function useVault(): VaultContextType {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return ctx;
}
