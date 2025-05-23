import React, { useState, useEffect } from 'react';
import db from '../services/firestore/dbAdapter';
import firestoreService from '../services/firestore/firestoreService';
import { auth } from '../services/firebase';
import './MigrationStatus.css';

const MigrationStatus = () => {
  const [status, setStatus] = useState({
    adapter: 'checking',
    firestore: 'checking',
    user: 'checking',
    data: null
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const newStatus = {
      adapter: 'error',
      firestore: 'error',
      user: 'error',
      data: null
    };

    try {
      // Check user
      const user = auth.currentUser;
      if (user) {
        newStatus.user = 'success';
        
        // Check adapter
        const userId = db.getCurrentUserId();
        if (userId) {
          newStatus.adapter = 'success';
        }

        // Check Firestore
        const firestoreUserId = firestoreService.getCurrentUserId();
        if (firestoreUserId) {
          newStatus.firestore = 'success';
        }

        // Get data counts
        try {
          const collections = await db.getCollections();
          const soldItems = await db.getSoldCards();
          const profile = await db.getProfile();
          const invoices = await db.getPurchaseInvoices();
          
          newStatus.data = {
            collections: Object.keys(collections).length,
            soldItems: soldItems.data?.length || 0,
            profile: !!profile,
            invoices: invoices.length
          };
        } catch (error) {
          console.error('Error getting data counts:', error);
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
    }

    setStatus(newStatus);
  };

  const runDiagnostics = () => {
    if (window.migrationDiagnostics) {
      window.migrationDiagnostics.run();
    }
  };

  const checkMigration = () => {
    if (window.migrationDiagnostics) {
      window.migrationDiagnostics.checkMigration();
    }
  };

  const showCleanupReport = () => {
    if (window.migrationCleanup) {
      window.migrationCleanup.report();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'checking': return '⏳';
      default: return '❓';
    }
  };

  const getOverallStatus = () => {
    if (status.adapter === 'success' && status.firestore === 'success') {
      return 'success';
    } else if (status.adapter === 'checking' || status.firestore === 'checking') {
      return 'checking';
    } else {
      return 'error';
    }
  };

  return (
    <div className={`migration-status ${getOverallStatus()}`}>
      <div 
        className="status-indicator" 
        onClick={() => setShowDetails(!showDetails)}
        title="Click for details"
      >
        {getStatusIcon(getOverallStatus())} Migration Status
      </div>
      
      {showDetails && (
        <div className="status-details">
          <h4>Firestore Migration Status</h4>
          
          <div className="status-item">
            {getStatusIcon(status.user)} User Auth
          </div>
          
          <div className="status-item">
            {getStatusIcon(status.adapter)} DB Adapter
          </div>
          
          <div className="status-item">
            {getStatusIcon(status.firestore)} Firestore Service
          </div>
          
          {status.data && (
            <div className="data-summary">
              <h5>Data Summary:</h5>
              <div>Collections: {status.data.collections}</div>
              <div>Sold Items: {status.data.soldItems}</div>
              <div>Profile: {status.data.profile ? '✓' : '✗'}</div>
              <div>Invoices: {status.data.invoices}</div>
            </div>
          )}
          
          <div className="action-buttons">
            <button onClick={runDiagnostics}>Run Diagnostics</button>
            <button onClick={checkMigration}>Check Migration</button>
            <button onClick={showCleanupReport}>Cleanup Report</button>
          </div>
          
          <div className="close-button" onClick={() => setShowDetails(false)}>
            Close
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationStatus;
