import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Button } from '../../design-system';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { 
  getPSADatabaseStatistics, 
  getRecentPSAActivity,
  getAllPSARecords,
  findDuplicatePSARecords,
  deletePSARecord,
  movePSARecord,
  bulkMergePSACollections,
  previewBulkMerge,
  PSA_CARDS_HYPHEN,
  PSA_CARDS_UNDERSCORE
} from '../../services/psaDatabaseManager';

/**
 * PSA Collection Tab Component - Moved outside to prevent recreation
 */
const PSACollectionTab = ({ collectionName }) => {
  const [collectionData, setCollectionData] = useState([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const recordsPerPage = 10;

  const loadCollectionData = useCallback(async () => {
    if (collectionLoading || hasLoaded) {
      console.log(`Skipping load for ${collectionName} - already loading or loaded`);
      return;
    }

    console.log(`Starting load for collection: ${collectionName}`);
    setCollectionLoading(true);
    
    try {
      logger.info(`Loading data from collection: ${collectionName}`);
      const records = await getAllPSARecords(collectionName);
      setCollectionData(records);
      setHasLoaded(true);
      logger.info(`Loaded ${records.length} records from ${collectionName}`);
      console.log(`Successfully loaded ${records.length} records from ${collectionName}`);
    } catch (error) {
      logger.error(`Error loading ${collectionName} data:`, error);
      console.error(`Failed to load ${collectionName}:`, error);
      toast.error(`Failed to load ${collectionName} data: ${error.message}`);
      setHasLoaded(true); // Mark as loaded even on error to prevent retry loops
    } finally {
      setCollectionLoading(false);
    }
  }, [collectionName, collectionLoading, hasLoaded]);

  // Load data when component mounts - only once
  useEffect(() => {
    console.log(`PSACollectionTab mounted for: ${collectionName}, hasLoaded: ${hasLoaded}`);
    if (!hasLoaded) {
      loadCollectionData();
    }
  }, []); // Empty dependency array - only run on mount

  // Filter records based on search term
  const filteredRecords = collectionData.filter(record => 
    record.certNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.cardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.grade.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);

  const deleteRecord = async (certNumber) => {
    if (!window.confirm(`Are you sure you want to delete PSA record ${certNumber}?`)) {
      return;
    }

    try {
      await deletePSARecord(collectionName, certNumber);
      toast.success(`Deleted PSA record ${certNumber}`);
      
      // Remove from local state
      setCollectionData(prev => prev.filter(record => record.certNumber !== certNumber));
    } catch (error) {
      logger.error(`Error deleting PSA record ${certNumber}:`, error);
      toast.error(`Failed to delete record: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Collection: {collectionName} ({collectionData.length} records)
        </h3>
        <Button
          variant="secondary"
          iconLeft={<Icon name="refresh" />}
          onClick={() => {
            console.log(`Manual refresh triggered for ${collectionName}`);
            setHasLoaded(false);
            setCollectionData([]);
            loadCollectionData();
          }}
          disabled={collectionLoading}
        >
          {collectionLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <Icon name="search" className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by cert number, card name, brand, or grade..."
            className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-0"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </div>

      {collectionLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Icon name="refresh" className="text-blue-500 text-4xl mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading PSA records...</p>
          </div>
        </div>
      ) : collectionData.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-8 text-center">
          <Icon name="inbox" className="text-gray-400 text-4xl mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No PSA Records Found
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            This collection appears to be empty or you may not have access to view it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {startIndex + 1}-{Math.min(startIndex + recordsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              {searchTerm && ` (filtered from ${collectionData.length} total)`}
            </span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {/* PSA Records Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PSA Cert #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Card
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Population
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Access Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedRecords.map((record) => (
                    <tr key={record.certNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon name="credit_card" className="text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.certNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {record.cardName || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.grade >= 9 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : record.grade >= 7 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {record.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.brand || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.totalPopulation || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.lastUpdated 
                          ? new Date(record.lastUpdated).toLocaleDateString()
                          : 'Unknown'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.accessCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="danger"
                          iconLeft={<Icon name="delete" />}
                          onClick={() => deleteRecord(record.certNumber)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                iconLeft={<Icon name="chevron_left" />}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 3 || 
                    pageNum === currentPage + 3
                  ) {
                    return <span key={pageNum} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="secondary"
                iconRight={<Icon name="chevron_right" />}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * PSA Database Manager Component
 * 
 * Provides a comprehensive interface to view and manage PSA card data
 * from both collections (psa-cards and psa_cards), identify duplicates,
 * and resolve conflicts between collections.
 */
const PSADatabaseManager = () => {
  // State management
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  const [stats, setStats] = useState({
    psaCardsCount: 0,
    psa_cardsCount: 0,
    duplicatesCount: 0,
    totalRecords: 0
  });
  const [psaCardsData, setPsaCardsData] = useState([]);
  const [psa_cardsData, setPsa_cardsData] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [bulkMergeLoading, setBulkMergeLoading] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(null);

  // Load initial data
  useEffect(() => {
    if (!dataLoaded) {
      loadDashboardData();
    }
  }, [dataLoaded]);

  // Load conflict data when conflicts tab is accessed
  useEffect(() => {
    if (selectedTab === 'conflicts' && stats.duplicatesCount > 0 && conflicts.length === 0) {
      loadConflictData();
    }
  }, [selectedTab, stats.duplicatesCount, conflicts.length]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      logger.info('Loading PSA database dashboard data...');
      
      // Load statistics from both collections
      const statistics = await getPSADatabaseStatistics();
      setStats(statistics);

      // Load recent activity
      const recentActivity = await getRecentPSAActivity(10);
      logger.debug('Recent PSA activity:', recentActivity);

      toast.success('PSA database data loaded successfully');
      setDataLoaded(true); // Mark data as loaded to prevent duplicate calls
    } catch (error) {
      logger.error('Error loading PSA database data:', error);
      toast.error('Failed to load PSA database data');
      
      // Set fallback data on error
      setStats({
        psaCardsCount: 0,
        psa_cardsCount: 0,
        duplicatesCount: 0,
        totalRecords: 0,
        error: error.message
      });
      setDataLoaded(true); // Still mark as loaded even on error to prevent retries
    } finally {
      setLoading(false);
    }
  };

  const loadConflictData = async () => {
    if (conflicts.length > 0) return; // Don't reload if already loaded
    
    setConflictsLoading(true);
    try {
      logger.info('Loading PSA conflict data...');
      toast.loading('Loading conflict details...', { id: 'conflicts-loading' });
      
      const duplicateRecords = await findDuplicatePSARecords();
      setConflicts(duplicateRecords);
      
      logger.info(`Loaded ${duplicateRecords.length} conflicts successfully`);
      toast.success(`Loaded ${duplicateRecords.length} conflict records`, { id: 'conflicts-loading' });
      
      if (duplicateRecords.length === 0) {
        toast.success('No conflicts found - all records are unique!');
      }
    } catch (error) {
      logger.error('Error loading conflict data:', error);
      console.error('Detailed conflict loading error:', error);
      toast.error(`Failed to load conflicts: ${error.message}`, { id: 'conflicts-loading' });
    } finally {
      setConflictsLoading(false);
    }
  };

  const resolveConflict = async (conflictIndex, resolution) => {
    const conflict = conflicts[conflictIndex];
    if (!conflict) return;

    setResolutionLoading(true);
    try {
      const { certNumber, psaCardsRecord, psa_cardsRecord } = conflict;
      
      switch (resolution) {
        case 'keep_psa_cards':
          // Delete from psa_cards, keep psa-cards
          await deletePSARecord(PSA_CARDS_UNDERSCORE, certNumber);
          toast.success(`Kept PSA record ${certNumber} from psa-cards collection`);
          break;
          
        case 'keep_psa_cards_underscore':
          // Delete from psa-cards, keep psa_cards
          await deletePSARecord(PSA_CARDS_HYPHEN, certNumber);
          toast.success(`Kept PSA record ${certNumber} from psa_cards collection`);
          break;
          
        case 'move_to_psa_cards':
          // Move from psa_cards to psa-cards (merge into main)
          await movePSARecord(PSA_CARDS_UNDERSCORE, PSA_CARDS_HYPHEN, certNumber);
          toast.success(`Moved PSA record ${certNumber} to psa-cards collection`);
          break;
          
        default:
          throw new Error('Invalid resolution option');
      }
      
      // Remove resolved conflict from list
      const updatedConflicts = conflicts.filter((_, index) => index !== conflictIndex);
      setConflicts(updatedConflicts);
      
      // Update stats
      await loadDashboardData();
      
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      toast.error(`Failed to resolve conflict: ${error.message}`);
    } finally {
      setResolutionLoading(false);
    }
  };

  const handleBulkMerge = async () => {
    try {
      setBulkMergeLoading(true);
      setMergeProgress(null);
      
      // First, get a preview of what we're about to do
      logger.info('Getting bulk merge preview...');
      toast.loading('Analyzing PSA collections...', { id: 'bulk-merge' });
      
      const preview = await previewBulkMerge(PSA_CARDS_UNDERSCORE, PSA_CARDS_HYPHEN);
      
      // Show confirmation dialog with details
      const confirmMessage = `
Bulk Merge Preview:
• Source: ${preview.fromCollection} (${preview.totalRecordsInSource} records)
• Destination: ${preview.toCollection} (${preview.totalRecordsInDestination} records)
• Unique records to move: ${preview.uniqueRecordsToMove}
• Duplicate records to overwrite: ${preview.duplicateRecordsToOverwrite}
• Final total: ${preview.finalRecordCount} records

This will move ALL ${preview.totalRecordsInSource} records from "${preview.fromCollection}" to "${preview.toCollection}".
Existing duplicates will be overwritten with newer data.

Continue with bulk merge?`;

      if (!window.confirm(confirmMessage)) {
        toast.dismiss('bulk-merge');
        return;
      }
      
      logger.info('Starting bulk merge operation...');
      toast.loading('Merging PSA collections...', { id: 'bulk-merge' });
      
      // Perform the bulk merge with progress updates
      const results = await bulkMergePSACollections(
        PSA_CARDS_UNDERSCORE, 
        PSA_CARDS_HYPHEN,
        (progress) => {
          setMergeProgress(progress);
          const progressText = `Processing ${progress.current}/${progress.total}: ${progress.currentRecord} ${progress.isUnique ? '(new)' : '(updating)'}`;
          toast.loading(progressText, { id: 'bulk-merge' });
        }
      );
      
      // Show results
      if (results.success) {
        toast.success(
          `Bulk merge completed! ${results.summary}`, 
          { id: 'bulk-merge', duration: 6000 }
        );
        logger.info('Bulk merge completed successfully:', results);
      } else {
        toast.error(
          `Bulk merge completed with errors: ${results.summary}`, 
          { id: 'bulk-merge', duration: 8000 }
        );
        logger.warn('Bulk merge completed with errors:', results);
      }
      
      // Clear progress and refresh data
      setMergeProgress(null);
      setConflicts([]); // Clear conflicts since they should be resolved
      await loadDashboardData(); // Refresh stats
      
    } catch (error) {
      logger.error('Error during bulk merge:', error);
      toast.error(`Bulk merge failed: ${error.message}`, { id: 'bulk-merge' });
      setMergeProgress(null);
    } finally {
      setBulkMergeLoading(false);
    }
  };

  const handlePreviewMerge = async () => {
    try {
      logger.info('Generating merge preview...');
      toast.loading('Analyzing collections...', { id: 'preview' });
      
      const preview = await previewBulkMerge(PSA_CARDS_UNDERSCORE, PSA_CARDS_HYPHEN);
      
      toast.success('Preview generated - check console for details', { id: 'preview' });
      
      // Show detailed preview in console and alert
      console.log('=== BULK MERGE PREVIEW ===');
      console.log('Source collection:', preview.fromCollection, `(${preview.totalRecordsInSource} records)`);
      console.log('Destination collection:', preview.toCollection, `(${preview.totalRecordsInDestination} records)`);
      console.log('Unique records to move:', preview.uniqueRecordsToMove);
      console.log('Duplicate records to overwrite:', preview.duplicateRecordsToOverwrite);
      console.log('Final record count:', preview.finalRecordCount);
      console.log('Unique cert numbers:', preview.uniqueCertNumbers);
      console.log('Duplicate cert numbers:', preview.duplicateCertNumbers);
      
      alert(`Preview Results:
• ${preview.uniqueRecordsToMove} unique records will be moved
• ${preview.duplicateRecordsToOverwrite} duplicates will be overwritten  
• Final total: ${preview.finalRecordCount} records
• See browser console for full details`);
      
    } catch (error) {
      logger.error('Error generating preview:', error);
      toast.error(`Preview failed: ${error.message}`, { id: 'preview' });
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'psa-cards', label: 'psa-cards Collection', icon: 'storage', badge: stats.psaCardsCount },
    { id: 'psa_cards', label: 'psa_cards Collection', icon: 'storage', badge: stats.psa_cardsCount },
    { id: 'conflicts', label: 'Conflicts', icon: 'warning', badge: stats.duplicatesCount }
  ];

  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Icon name={tab.icon} className="mr-2" />
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Icon name="storage" className="text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">psa-cards (hyphen)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.psaCardsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Icon name="storage" className="text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">psa_cards (underscore)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.psa_cardsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Icon name="warning" className="text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conflicts Found</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.duplicatesCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Icon name="analytics" className="text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRecords}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="primary"
            iconLeft={<Icon name="refresh" />}
            onClick={loadDashboardData}
            disabled={loading}
            fullWidth
          >
            Refresh Data
          </Button>
          
          <Button
            variant="secondary"
            iconLeft={<Icon name="warning" />}
            onClick={() => setSelectedTab('conflicts')}
            disabled={stats.duplicatesCount === 0}
            fullWidth
          >
            View Conflicts ({stats.duplicatesCount})
          </Button>
        </div>
      </div>

      {/* Bulk Merge Section */}
      {stats.psa_cardsCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
          <div className="flex items-start">
            <Icon name="merge_type" className="text-orange-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-orange-900 dark:text-orange-200 mb-2">
                Bulk Merge Collections
              </h3>
              <p className="text-sm text-orange-800 dark:text-orange-300 mb-4">
                You have {stats.psa_cardsCount} records in the "{PSA_CARDS_UNDERSCORE}" collection that need to be merged 
                into the main "{PSA_CARDS_HYPHEN}" collection. This will unify your PSA database and resolve the naming inconsistency.
              </p>
              
              {mergeProgress && (
                <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Merging PSA Collections...
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {mergeProgress.current}/{mergeProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(mergeProgress.current / mergeProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Processing: {mergeProgress.currentRecord} {mergeProgress.isUnique ? '(new record)' : '(updating duplicate)'}
                  </p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  iconLeft={<Icon name="preview" />}
                  onClick={handlePreviewMerge}
                  disabled={bulkMergeLoading}
                >
                  Preview Merge
                </Button>
                
                <Button
                  variant="primary"
                  iconLeft={<Icon name="merge_type" />}
                  onClick={handleBulkMerge}
                  disabled={bulkMergeLoading || stats.psa_cardsCount === 0}
                >
                  {bulkMergeLoading ? 'Merging...' : `Merge All ${stats.psa_cardsCount} Records`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Information */}
      <div className={`rounded-lg border p-4 ${
        stats.permissionIssue 
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }`}>
        <div className="flex items-start">
          <Icon 
            name={stats.permissionIssue ? "warning" : "info"} 
            className={`mr-3 mt-0.5 ${
              stats.permissionIssue ? 'text-orange-500' : 'text-blue-500'
            }`} 
          />
          <div>
            <h4 className={`text-sm font-medium mb-1 ${
              stats.permissionIssue 
                ? 'text-orange-900 dark:text-orange-200'
                : 'text-blue-900 dark:text-blue-200'
            }`}>
              {stats.permissionIssue ? 'Partial Access Only' : 'About PSA Collections'}
            </h4>
            <p className={`text-sm ${
              stats.permissionIssue 
                ? 'text-orange-800 dark:text-orange-300'
                : 'text-blue-800 dark:text-blue-300'
            }`}>
              Your app currently has two PSA collections due to a naming inconsistency:
            </p>
            <ul className={`text-sm mt-2 space-y-1 ${
              stats.permissionIssue 
                ? 'text-orange-800 dark:text-orange-300'
                : 'text-blue-800 dark:text-blue-300'
            }`}>
              <li>• <strong>psa-cards</strong> (hyphen) - Used by frontend for reading {stats.accessibleCollections?.includes('psa-cards') && '✅ Accessible'}</li>
              <li>• <strong>psa_cards</strong> (underscore) - Used by backend for writing {stats.inaccessibleCollections?.includes('psa_cards') && '🔒 No permissions'}</li>
            </ul>
            <p className={`text-sm mt-2 ${
              stats.permissionIssue 
                ? 'text-orange-800 dark:text-orange-300'
                : 'text-blue-800 dark:text-blue-300'
            }`}>
              {stats.permissionIssue 
                ? 'Currently showing data only from the accessible psa-cards collection. The psa_cards collection requires backend access to view.'
                : 'This tool helps you visualize and manage data from both collections.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConflictsTab = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Duplicate PSA Records ({stats.duplicatesCount})
          </h3>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              iconLeft={<Icon name="refresh" />}
              onClick={async () => {
                // Force reload by clearing conflicts first
                setConflicts([]);
                
                // Add a small delay to ensure state is cleared
                setTimeout(async () => {
                  try {
                    setConflictsLoading(true);
                    logger.info('Force refreshing PSA conflict data...');
                    toast.loading('Refreshing conflict details...', { id: 'conflicts-refresh' });
                    
                    const duplicateRecords = await findDuplicatePSARecords();
                    setConflicts(duplicateRecords);
                    
                    logger.info(`Refreshed ${duplicateRecords.length} conflicts successfully`);
                    toast.success(`Refreshed ${duplicateRecords.length} conflict records`, { id: 'conflicts-refresh' });
                    
                    if (duplicateRecords.length === 0) {
                      toast.success('No conflicts found - all records are unique!');
                    }
                  } catch (error) {
                    logger.error('Error refreshing conflict data:', error);
                    console.error('Detailed conflict refresh error:', error);
                    toast.error(`Failed to refresh conflicts: ${error.message}`, { id: 'conflicts-refresh' });
                  } finally {
                    setConflictsLoading(false);
                  }
                }, 100);
              }}
              disabled={conflictsLoading}
            >
              {conflictsLoading ? 'Loading...' : 'Refresh Conflicts'}
            </Button>
            <Button
              variant="secondary"
              iconLeft={<Icon name="visibility" />}
              onClick={async () => {
                try {
                  setConflictsLoading(true);
                  toast.loading('Loading all PSA cards for comparison...', { id: 'show-cards' });
                  
                  // Load all records from both collections
                  const psaCardsRecords = await getAllPSARecords(PSA_CARDS_HYPHEN);
                  const psa_cardsRecords = await getAllPSARecords(PSA_CARDS_UNDERSCORE);
                  
                  console.log('=== PSA CARDS LOADED ===');
                  console.log(`psa-cards (hyphen): ${psaCardsRecords.length} records`);
                  console.log(`psa_cards (underscore): ${psa_cardsRecords.length} records`);
                  
                  // Find actual duplicates by cert number
                  const duplicates = [];
                  const psa_cardsMap = new Map();
                  
                  psa_cardsRecords.forEach(record => {
                    psa_cardsMap.set(record.certNumber, record);
                  });
                  
                  psaCardsRecords.forEach(psaCardsRecord => {
                    const psa_cardsRecord = psa_cardsMap.get(psaCardsRecord.certNumber);
                    if (psa_cardsRecord) {
                      duplicates.push({
                        certNumber: psaCardsRecord.certNumber,
                        psaCardsRecord,
                        psa_cardsRecord,
                        conflicts: [] // We'll populate this if needed
                      });
                    }
                  });
                  
                  console.log(`Found ${duplicates.length} actual conflicts`);
                  console.log('Conflicts:', duplicates);
                  
                  setConflicts(duplicates);
                  toast.success(`Found ${duplicates.length} duplicate PSA records to resolve`, { id: 'show-cards' });
                  
                } catch (error) {
                  console.error('Error loading PSA cards:', error);
                  toast.error(`Failed to load PSA cards: ${error.message}`, { id: 'show-cards' });
                } finally {
                  setConflictsLoading(false);
                }
              }}
              disabled={conflictsLoading}
            >
              Show All PSA Cards
            </Button>
            {stats.psa_cardsCount > 0 && (
              <Button
                variant="primary"
                iconLeft={<Icon name="auto_fix_high" />}
                onClick={() => {
                  // Move all records from psa_cards to psa-cards collection
                  if (window.confirm(`Move all ${stats.psa_cardsCount} records from psa_cards collection to psa-cards collection? This will consolidate your PSA database.`)) {
                    handleBulkMerge();
                  }
                }}
                disabled={bulkMergeLoading || resolutionLoading}
              >
                Auto-Resolve All
              </Button>
            )}
          </div>
        </div>

        {conflictsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Icon name="refresh" className="text-blue-500 text-4xl mb-4 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">Loading conflict data...</p>
            </div>
          </div>
        ) : stats.duplicatesCount === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-8 text-center">
            <Icon name="check_circle" className="text-green-500 text-4xl mb-4" />
            <h4 className="text-lg font-medium text-green-900 dark:text-green-200 mb-2">
              No Conflicts Found
            </h4>
            <p className="text-green-800 dark:text-green-300">
              All PSA records are clean with no duplicates detected.
            </p>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 text-center">
              <Icon name="info" className="text-blue-500 text-3xl mb-3" />
              <h4 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-2">
                Ready to Load {stats.duplicatesCount} Duplicate PSA Records
              </h4>
              <p className="text-blue-800 dark:text-blue-300 mb-4">
                Your database has {stats.psaCardsCount} records in the "psa-cards" collection and {stats.psa_cardsCount} records in the "psa_cards" collection.
                Click "Show All PSA Cards" to see which PSA certificates exist in both collections and resolve the duplicates.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">psa-cards Collection</h5>
                  <p className="text-2xl font-bold text-blue-600">{stats.psaCardsCount} records</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Frontend reads from here</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">psa_cards Collection</h5>
                  <p className="text-2xl font-bold text-green-600">{stats.psa_cardsCount} records</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Backend writes here</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conflict Summary */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
              <div className="flex items-start">
                <Icon name="warning" className="text-orange-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                    Resolution Strategy
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    For each conflict, you can choose to keep the record from either collection or merge them.
                    The <strong>psa-cards</strong> collection has {stats.psaCardsCount} records (older, frontend reads from here).
                    The <strong>psa_cards</strong> collection has {stats.psa_cardsCount} records (newer, backend writes here).
                  </p>
                </div>
              </div>
            </div>

            {/* Conflict List */}
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div
                  key={conflict.certNumber}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <Icon name="credit_card" className="text-blue-500 mr-2" />
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                          PSA Cert #{conflict.certNumber}
                        </h5>
                        {conflict.conflicts && conflict.conflicts.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            {conflict.conflicts.length} difference{conflict.conflicts.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Side-by-side comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* psa-cards record */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <h6 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center">
                            <Icon name="storage" className="mr-1" />
                            psa-cards (hyphen)
                          </h6>
                          <div className="text-sm space-y-1">
                            <div><strong>Card:</strong> {conflict.psaCardsRecord.cardName || 'Unknown'}</div>
                            <div><strong>Grade:</strong> {conflict.psaCardsRecord.grade || 'Unknown'}</div>
                            <div><strong>Brand:</strong> {conflict.psaCardsRecord.brand || 'Unknown'}</div>
                            <div><strong>Population:</strong> {conflict.psaCardsRecord.totalPopulation || 0}</div>
                            <div><strong>Last Updated:</strong> {conflict.psaCardsRecord.lastUpdated 
                              ? new Date(conflict.psaCardsRecord.lastUpdated).toLocaleDateString()
                              : 'Unknown'}</div>
                            <div><strong>Access Count:</strong> {conflict.psaCardsRecord.accessCount || 0}</div>
                          </div>
                        </div>

                        {/* psa_cards record */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <h6 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2 flex items-center">
                            <Icon name="storage" className="mr-1" />
                            psa_cards (underscore)
                          </h6>
                          <div className="text-sm space-y-1">
                            <div><strong>Card:</strong> {conflict.psa_cardsRecord.cardName || 'Unknown'}</div>
                            <div><strong>Grade:</strong> {conflict.psa_cardsRecord.grade || 'Unknown'}</div>
                            <div><strong>Brand:</strong> {conflict.psa_cardsRecord.brand || 'Unknown'}</div>
                            <div><strong>Population:</strong> {conflict.psa_cardsRecord.totalPopulation || 0}</div>
                            <div><strong>Last Updated:</strong> {conflict.psa_cardsRecord.lastUpdated 
                              ? new Date(conflict.psa_cardsRecord.lastUpdated).toLocaleDateString()
                              : 'Unknown'}</div>
                            <div><strong>Access Count:</strong> {conflict.psa_cardsRecord.accessCount || 0}</div>
                          </div>
                        </div>
                      </div>

                      {/* Conflicts details */}
                      {conflict.conflicts && conflict.conflicts.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Differences:</h6>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                            {conflict.conflicts.map((conf, confIndex) => (
                              <div key={confIndex} className="text-xs text-gray-600 dark:text-gray-300">
                                <strong>{conf.field}:</strong> "{conf.psaCardsValue}" vs "{conf.psa_cardsValue}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resolution Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => resolveConflict(index, 'keep_psa_cards')}
                        disabled={resolutionLoading}
                        className="text-blue-700 hover:text-blue-800"
                      >
                        Keep psa-cards
                      </Button>
                      <Button
                        size="sm" 
                        variant="secondary"
                        onClick={() => resolveConflict(index, 'keep_psa_cards_underscore')}
                        disabled={resolutionLoading}
                        className="text-green-700 hover:text-green-800"
                      >
                        Keep psa_cards
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary" 
                        onClick={() => resolveConflict(index, 'move_to_psa_cards')}
                        disabled={resolutionLoading}
                        className="text-purple-700 hover:text-purple-800"
                      >
                        Merge to psa-cards
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Icon name="refresh" className="text-blue-500 text-4xl mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading PSA database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderTabNavigation()}
      
      <div className="mt-6">
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'psa-cards' && <PSACollectionTab key="psa-cards" collectionName="psa-cards" />}
        {selectedTab === 'psa_cards' && <PSACollectionTab key="psa_cards" collectionName="psa_cards" />}
        {selectedTab === 'conflicts' && renderConflictsTab()}
      </div>
    </div>
  );
};

export default PSADatabaseManager;