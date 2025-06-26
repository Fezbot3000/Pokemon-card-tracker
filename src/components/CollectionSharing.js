import React, { useState, useEffect } from 'react';
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

const CollectionSharing = () => {
  const { currentUser } = useAuth();
  const { collections, cards } = useCards();
  const [sharedCollections, setSharedCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    collectionId: 'all',
    expiresIn: 'never',
    isActive: true
  });

  // Debug logging
  useEffect(() => {
    console.log('CollectionSharing - collections:', collections);
    console.log('CollectionSharing - cards:', cards);
    console.log('CollectionSharing - currentUser:', currentUser);
  }, [collections, cards, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadSharedCollections();
    }
  }, [currentUser]);

  const loadSharedCollections = async () => {
    try {
      setLoading(true);
      console.log('Loading shared collections for user:', currentUser.uid);
      
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
      
      console.log('Loaded shared collections:', shared);
      setSharedCollections(shared);
    } catch (error) {
      console.error('Error loading shared collections:', error);
      toast.error(`Failed to load shared collections: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateShareId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
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

      const shareData = {
        id: shareId,
        userId: currentUser.uid,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        collectionId: createForm.collectionId,
        isActive: createForm.isActive,
        expiresAt: expirationDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0
      };

      console.log('Creating shared collection:', shareData);

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
    if (!window.confirm('Are you sure you want to delete this shared collection?')) {
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

  // Get available collections - handle both array and object formats
  const getAvailableCollections = () => {
    if (!collections) return [];
    
    // If collections is an array (from CardContext)
    if (Array.isArray(collections)) {
      return collections.map(col => ({
        id: col.id || col.name,
        name: col.name || col.id,
        cardCount: col.cards ? col.cards.length : 0
      }));
    }
    
    // If collections is an object (legacy format)
    return Object.entries(collections).map(([name, cards]) => ({
      id: name,
      name: name,
      cardCount: Array.isArray(cards) ? cards.length : 0
    }));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Collection Sharing</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Share your collections with others through public links
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowQuickStart(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>📖</span>
            <span>How It Works</span>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <span>🔗</span>
            <span>Share Collection</span>
          </Button>
        </div>
      </div>

      {/* Shared Collections List */}
      {sharedCollections.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Shared Collections
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create shareable links to showcase your collections to others
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => setShowQuickStart(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>📖</span>
              <span>How It Works</span>
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2"
            >
              <span>🔗</span>
              <span>Share Your First Collection</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sharedCollections.map((shared) => (
            <Card key={shared.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {shared.title}
                    </h3>
                    <Badge variant={shared.isActive ? 'success' : 'secondary'}>
                      {shared.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  {shared.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {shared.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Collection: {shared.collectionId === 'all' ? 'All Collections' : shared.collectionId}</span>
                    <span>Views: {shared.viewCount || 0}</span>
                    <span>Created: {shared.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => copyShareLink(shared.id)}
                    variant="outline"
                    size="sm"
                  >
                    Copy Link
                  </Button>
                  <Button
                    onClick={() => toggleActive(shared.id, shared.isActive)}
                    variant="outline"
                    size="sm"
                  >
                    {shared.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => deleteSharedCollection(shared.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Share Collection
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                  placeholder="My Amazing Card Collection"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection to Share
                </label>
                <Select
                  value={createForm.collectionId}
                  onChange={(e) => setCreateForm({...createForm, collectionId: e.target.value})}
                >
                  <option value="all">All Collections</option>
                  {availableCollections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({collection.cardCount} cards)
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={createSharedCollection}
                disabled={!createForm.title.trim()}
              >
                Create Share Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Modal */}
      {showQuickStart && (
        <SharingQuickStart onClose={() => setShowQuickStart(false)} />
      )}
    </div>
  );
};

export default CollectionSharing;
