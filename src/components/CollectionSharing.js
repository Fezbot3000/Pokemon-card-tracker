import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useAuth } from '../design-system';
import { useCards } from '../contexts/CardContext';
import { 
  Card, 
  Button, 
  TextField,
  Toggle, 
  Modal
} from '../design-system';
import { toast } from 'react-hot-toast';
import SharingQuickStart from './SharingQuickStart';
import sharingService from '../services/sharingService';

// Simple components to replace missing design system components
const Spinner = ({ size = 'medium' }) => (
  <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${
    size === 'large' ? 'h-12 w-12' : 'h-6 w-6'
  }`}></div>
);

const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    {...props}
  />
);

const Select = ({ className = '', children, ...props }) => (
  <select
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    {...props}
  >
    {children}
  </select>
);

const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${className}`}
    {...props}
  />
);

const Switch = ({ checked, onChange, label, ...props }) => (
  <div className="flex items-center">
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    {label && <span className="ml-3 text-sm text-gray-900 dark:text-white">{label}</span>}
  </div>
);

const CollectionSharing = ({ isInModal = false }) => {
  const { currentUser } = useAuth();
  const { collections, cards, repository } = useCards();
  const [sharedCollections, setSharedCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    collectionId: 'all',
    expiresIn: 'never',
    isActive: true
  });

  useEffect(() => {
    if (currentUser) {
      loadSharedCollections();
    }
  }, [currentUser]);

  const loadSharedCollections = async () => {
    try {
      setLoading(true);
      
      const sharedRef = collection(firestoreDb, 'shared-collections');
      const q = query(
        sharedRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const shared = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSharedCollections(shared);
    } catch (error) {
      console.error('Error loading shared collections:', error);
      toast.error(`Failed to load shared collections: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateShareId = () => {
    // Use crypto.getRandomValues for cryptographically secure random generation
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Convert to base36 string
    const randomString = Array.from(array, byte => byte.toString(36)).join('');
    
    // Add timestamp component for additional uniqueness
    const timestamp = Date.now().toString(36);
    
    // Combine and ensure we have a good length
    return (randomString + timestamp).substring(0, 24);
  };

  const createSharedCollection = async () => {
    try {
      if (!createForm.title.trim()) {
        toast.error('Please enter a title for your shared collection');
        return;
      }

      const shareId = generateShareId();
      const expirationDate = createForm.expiresIn === 'never' ? null : 
        new Date(Date.now() + getExpirationMs(createForm.expiresIn));

      // Find the best preview image from the selected collection
      let previewImage = null;
      if (Array.isArray(cards) && cards.length > 0) {
        let collectionCards = cards;
        
        // Filter cards by collection if not "all"
        if (createForm.collectionId !== 'all') {
          collectionCards = cards.filter(card => {
            return (
              card.collectionId === createForm.collectionId ||
              card.collection === createForm.collectionId ||
              card.collectionName === createForm.collectionId
            );
          });
        }
        
        // Use the sharingService to find the best image
        previewImage = sharingService.findBestCardImage(collectionCards);
      }

      const shareData = {
        id: shareId,
        userId: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email || 'Anonymous',
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        collectionId: createForm.collectionId,
        isActive: createForm.isActive,
        expiresAt: expirationDate,
        previewImage: previewImage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0
      };

      await setDoc(doc(firestoreDb, 'shared-collections', shareId), shareData);
      
      toast.success('Collection shared successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        collectionId: 'all',
        expiresIn: 'never',
        isActive: true
      });
      
      // Reload shared collections
      await loadSharedCollections();
    } catch (error) {
      console.error('Error creating shared collection:', error);
      toast.error(`Failed to create shared collection: ${error.message}`);
    }
  };

  const getExpirationMs = (expiresIn) => {
    switch (expiresIn) {
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      case '1y': return 365 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const toggleActive = async (shareId, currentActive) => {
    try {
      await updateDoc(doc(firestoreDb, 'shared-collections', shareId), {
        isActive: !currentActive,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Collection ${!currentActive ? 'activated' : 'deactivated'}`);
      await loadSharedCollections();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to update collection status');
    }
  };

  const deleteSharedCollection = async (shareId) => {
    if (!window.confirm('Are you sure you want to delete this shared collection? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(firestoreDb, 'shared-collections', shareId));
      toast.success('Shared collection deleted');
      await loadSharedCollections();
    } catch (error) {
      console.error('Error deleting shared collection:', error);
      toast.error('Failed to delete shared collection');
    }
  };

  const copyShareLink = (shareId) => {
    const shareUrl = `${window.location.origin}/shared/${shareId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Share link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const refreshCardCounts = async () => {
    try {
      setIsRefreshing(true);
      
      // Force refresh of collections and cards from the CardContext
      if (repository && repository.loadCollections) {
        await repository.loadCollections();
      }
      
      if (repository && repository.loadCards) {
        await repository.loadCards();
      }
      
      // If collections is an array and has updateCollectionCardCount method
      if (repository && collections && Array.isArray(collections)) {
        for (const collection of collections) {
          if (collection.id && repository.updateCollectionCardCount) {
            try {
              await repository.updateCollectionCardCount(collection.id);
            } catch (error) {
              console.warn(`Failed to update card count for collection ${collection.name}:`, error);
            }
          }
        }
      }
      
      // Additional step: Force re-calculation of card counts using current card data
      if (Array.isArray(cards) && Array.isArray(collections)) {
        collections.forEach(collection => {
          const collectionName = collection.name || collection.id;
          const collectionId = collection.id || collection.name;
          
          // Count cards using all possible field combinations
          const matchingCards = cards.filter(card => {
            return (
              card.collectionId === collectionId ||
              card.collectionId === collectionName ||
              card.collection === collectionId ||
              card.collection === collectionName ||
              card.collectionName === collectionName ||
              card.collectionName === collectionId
            );
          });
          
          // Update the collection object with the new count
          collection.cardCount = matchingCards.length;
        });
      }
      
      // Force a re-render by updating a state variable
      setCreateForm(prev => ({ ...prev }));
      
      toast.success('Collections refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing collections:', error);
      toast.error('Failed to refresh collections');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getAvailableCollections = () => {
    if (!collections) return [];
    
    // If collections is an array (new format)
    if (Array.isArray(collections)) {
      const filteredCollections = collections
        .filter(collection => {
          const collectionName = (collection.name || collection.id || '').toLowerCase();
          // Filter out 'sold' collection
          return collectionName !== 'sold';
        })
        .map(collection => {
          // Try multiple ways to get card count
          let cardCount = 0;
          
          // Method 1: Direct cardCount property (most reliable)
          if (collection.cardCount && collection.cardCount > 0) {
            cardCount = collection.cardCount;
          }
          // Method 2: cards array in collection
          else if (collection.cards && Array.isArray(collection.cards)) {
            cardCount = collection.cards.length;
          }
          // Method 3: Count from global cards array (most accurate for current data)
          else if (Array.isArray(cards) && cards.length > 0) {
            // Try different field names for collection matching
            const collectionName = collection.name || collection.id;
            const collectionId = collection.id || collection.name;
            
            const matchingCards = cards.filter(card => {
              // Check all possible field combinations
              const matches = (
                card.collectionId === collectionId ||
                card.collectionId === collectionName ||
                card.collection === collectionId ||
                card.collection === collectionName ||
                card.collectionName === collectionName ||
                card.collectionName === collectionId
              );
              
              return matches;
            });
            cardCount = matchingCards.length;
          }
          // Method 4: If cards is object, try to find collection
          else if (cards && typeof cards === 'object' && !Array.isArray(cards)) {
            const collectionName = collection.name || collection.id;
            if (cards[collectionName]) {
              cardCount = Array.isArray(cards[collectionName]) ? cards[collectionName].length : 0;
            }
          }
          
          const result = {
            id: collection.id || collection.name,
            name: collection.name || collection.id,
            cardCount: cardCount
          };
          
          return result;
        });
      
      return filteredCollections;
    }
    
    // If collections is an object (legacy format)
    if (collections && typeof collections === 'object') {
      const filteredEntries = Object.entries(collections)
        .filter(([name]) => name.toLowerCase() !== 'sold') // Filter out 'sold' collection
        .map(([name, collectionData]) => {
          let cardCount = 0;
          
          // If collectionData is an array of cards
          if (Array.isArray(collectionData)) {
            cardCount = collectionData.length;
          }
          // If we need to count from global cards array
          else if (Array.isArray(cards)) {
            cardCount = cards.filter(card => 
              card.collectionId === name || 
              card.collection === name ||
              card.collectionName === name
            ).length;
          }
          
          return {
            id: name,
            name: name,
            cardCount: cardCount
          };
        });
      
      return filteredEntries;
    }
    
    return [];
  };

  const availableCollections = getAvailableCollections();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading shared collections...</span>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-6 ${isInModal ? '' : 'p-4 sm:p-6'}`}>
        {/* Header - FIXED FOR MOBILE */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Collection Sharing</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Share your collections with others through public links
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={() => setShowQuickStart(true)}
              variant="outline"
              className="flex items-center justify-center space-x-2 text-sm"
              size="sm"
            >
              <span>📖</span>
              <span className="hidden xs:inline">How It Works</span>
              <span className="xs:hidden">Help</span>
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center space-x-2 text-sm"
              size="sm"
            >
              <span>🔗</span>
              <span className="hidden xs:inline">Share Collection</span>
              <span className="xs:hidden">Share</span>
            </Button>
          </div>
        </div>

        {/* Shared Collections List */}
        {sharedCollections.length === 0 ? (
          <Card className={`text-center py-8 sm:py-12 ${isInModal ? 'bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-200 border-opacity-30 dark:border-gray-700 dark:border-opacity-30' : ''}`}>
            <div className="text-4xl sm:text-6xl mb-4">🔗</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Shared Collections
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 px-4">
              Create shareable links to showcase your collections to others
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sharedCollections.map((shared) => (
              <Card key={shared.id} className={`p-4 sm:p-6 ${isInModal ? 'bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-200 border-opacity-30 dark:border-gray-700 dark:border-opacity-30' : ''}`}>
                <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {shared.title}
                      </h3>
                      <Badge variant={shared.isActive ? 'success' : 'secondary'} className="self-start sm:self-auto">
                        {shared.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {shared.description && (
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {shared.description}
                      </p>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate">Collection: {shared.collectionId === 'all' ? 'All Collections' : shared.collectionId}</span>
                      <span>Views: {shared.viewCount || 0}</span>
                      <span className="hidden sm:inline">Created: {shared.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  {/* FIXED MOBILE BUTTON LAYOUT */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:ml-4 w-full sm:w-auto">
                    <Button
                      onClick={() => copyShareLink(shared.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => toggleActive(shared.id, shared.isActive)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      {shared.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => deleteSharedCollection(shared.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Start Modal */}
        {showQuickStart && (
          <SharingQuickStart onClose={() => setShowQuickStart(false)} />
        )}
      </div>

      {/* Create Modal - RENDERED AS PORTAL TO AVOID NESTING */}
      {showCreateModal && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99999
          }}
        >
          <div 
            className="rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'rgb(0, 0, 0)',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              zIndex: 100000
            }}
          >
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Share Collection
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title *
                  </label>
                  <Input
                    value={createForm.title}
                    onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                    placeholder="My Amazing Card Collection"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    placeholder="Tell others about your collection..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-300">
                      Collection to Share
                    </label>
                    <Button
                      onClick={refreshCardCounts}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      {isRefreshing ? '🔄' : '🔄'} {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  <Select
                    value={createForm.collectionId}
                    onChange={(e) => setCreateForm({...createForm, collectionId: e.target.value})}
                  >
                    <option value="all">All Collections</option>
                    {availableCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Expires After
                  </label>
                  <Select
                    value={createForm.expiresIn}
                    onChange={(e) => setCreateForm({...createForm, expiresIn: e.target.value})}
                  >
                    <option value="never">Never</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                    <option value="1y">1 year</option>
                  </Select>
                </div>
                
                <div>
                  <Switch
                    checked={createForm.isActive}
                    onChange={(checked) => setCreateForm({...createForm, isActive: checked})}
                    label="Make active immediately"
                  />
                </div>

                {/* Preview Image Section */}
                {(() => {
                  if (!Array.isArray(cards) || cards.length === 0) return null;
                  
                  let collectionCards = cards;
                  if (createForm.collectionId !== 'all') {
                    collectionCards = cards.filter(card => {
                      return (
                        card.collectionId === createForm.collectionId ||
                        card.collection === createForm.collectionId ||
                        card.collectionName === createForm.collectionId
                      );
                    });
                  }
                  
                  const previewImage = sharingService.findBestCardImage(collectionCards);
                  
                  if (!previewImage) return null;
                  
                  return (
                    <div className="border-t border-gray-700 pt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Share Preview Image
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                        <img 
                          src={previewImage} 
                          alt="Share preview" 
                          className="w-16 h-20 object-cover rounded border border-gray-600"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300">
                            This image will be shown when your collection is shared on social media
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            From your highest value card with an image
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createSharedCollection}
                  disabled={!createForm.title.trim()}
                  className="w-full sm:w-auto"
                >
                  Create Share Link
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CollectionSharing;
