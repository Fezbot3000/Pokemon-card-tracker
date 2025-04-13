import React, { useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../design-system';

const ImportBackupButton = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Show loading toast
      const loadingToast = toast.loading('Importing backup...');
      
      // Create loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Importing backup...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file...</p>
          <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingEl);
      
      const updateImportStatus = (status, progress = null) => {
        const statusEl = document.getElementById('import-status');
        const progressEl = document.getElementById('import-progress');
        
        if (statusEl) {
          statusEl.textContent = status;
        }
        
        if (progressEl && progress !== null) {
          progressEl.style.width = `${progress}%`;
        }
      };
      
      if (user) {
        updateImportStatus('Processing backup...', 20);
        
        // Import the migration utility dynamically
        const { importFromZip } = await import('../utils/migration');
        const result = await importFromZip(user.uid, file);
        
        // Remove loading overlay
        document.body.removeChild(loadingEl);
        toast.dismiss(loadingToast);
        
        if (result.success) {
          toast.success(result.message);
          
          // Force a page reload to refresh all data
          setTimeout(() => {
            const timestamp = Date.now();
            window.location.href = window.location.href.split('?')[0] + `?reload=${timestamp}`;
          }, 1500);
        } else {
          toast.error(result.message);
        }
      } else {
        // Remove loading overlay
        document.body.removeChild(loadingEl);
        toast.dismiss(loadingToast);
        toast.error('You must be logged in to import a backup');
      }
    } catch (error) {
      console.error('Error importing backup:', error);
      toast.error(`Error importing backup: ${error.message}`);
      
      // Remove loading overlay if it exists
      const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
      if (loadingEl) {
        document.body.removeChild(loadingEl);
      }
    }
    
    // Reset the file input
    e.target.value = '';
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="btn-primary w-full py-2 text-center"
      >
        Import Backup
      </button>
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.json"
        className="hidden"
      />
    </div>
  );
};

export default ImportBackupButton; 