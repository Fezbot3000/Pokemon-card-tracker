import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal states
 * Reduces repetitive modal state management code
 */
export function useModalManager() {
  const [modals, setModals] = useState({
    newCardForm: false,
    importModal: false,
    settings: false,
    profitChange: false,
    cardDetails: false
  });

  const openModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const toggleModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev => 
      Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    );
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals
  };
}

// Individual modal hooks for backward compatibility
export function useNewCardModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return { isOpen, open, close, toggle };
}

export function useSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return { isOpen, open, close, toggle };
}

export function useImportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('priceUpdate');
  
  const open = useCallback((importMode = 'priceUpdate') => {
    setMode(importMode);
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => setIsOpen(false), []);
  
  return { isOpen, mode, open, close };
}
