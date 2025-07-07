import { useState, useRef } from 'react';

/**
 * Custom hook for managing settings modal state and functionality
 */
export const useSettingsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionToRename, setCollectionToRename] = useState('');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: '',
  });

  // File input refs
  const importBaseDataRef = useRef(null);
  const imageUploadRef = useRef(null);

  // Progress states
  const [cloudSyncProgress, setCloudSyncProgress] = useState(0);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('');
  const [isImportingBaseData, setIsImportingBaseData] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isCloudMigrating, setIsCloudMigrating] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const openSettings = (tab = 'general') => {
    setActiveTab(tab);
    setIsOpen(true);
  };

  const closeSettings = () => {
    setIsOpen(false);
    // Reset states
    setIsRenaming(false);
    setNewCollectionName('');
    setCollectionToRename('');
    setCollectionToDelete('');
    setShowResetConfirm(false);
    setResetConfirmText('');
  };

  return {
    // Modal state
    isOpen,
    openSettings,
    closeSettings,

    // Tab state
    activeTab,
    setActiveTab,

    // Rename state
    isRenaming,
    setIsRenaming,
    newCollectionName,
    setNewCollectionName,
    collectionToRename,
    setCollectionToRename,

    // Delete state
    collectionToDelete,
    setCollectionToDelete,

    // Reset state
    showResetConfirm,
    setShowResetConfirm,
    resetConfirmText,
    setResetConfirmText,

    // Profile state
    profile,
    setProfile,

    // File refs
    importBaseDataRef,
    imageUploadRef,

    // Progress states
    cloudSyncProgress,
    setCloudSyncProgress,
    cloudSyncStatus,
    setCloudSyncStatus,
    isImportingBaseData,
    setIsImportingBaseData,
    isForceSyncing,
    setIsForceSyncing,
    isCloudMigrating,
    setIsCloudMigrating,
    isUploadingImages,
    setIsUploadingImages,
  };
};
