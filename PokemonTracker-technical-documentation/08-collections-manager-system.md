# Collections Manager System - Technical Documentation

## Overview
The Collections Manager handles creating, editing, deleting, and organizing card collections with protection for default collections and bulk operations support.

## File Locations
- **Main Component**: `src/components/CollectionsManager.js`
- **Modal Components**: `src/components/NewCollectionModal.js`, `src/components/EditCollectionModal.js`
- **Service Layer**: `src/services/collectionsService.js`

## Core Collection Operations

### Collection Creation
```javascript
const createCollection = async (collectionData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const newCollection = {
      id: generateId(),
      name: collectionData.name.trim(),
      description: collectionData.description?.trim() || '',
      color: collectionData.color || '#3B82F6',
      icon: collectionData.icon || '📁',
      isDefault: false,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      cardCount: 0,
      totalValue: 0
    };

    await saveCollection(user.uid, newCollection);
    return newCollection;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};
```

### Collection Updates
```javascript
const updateCollection = async (collectionId, updates) => {
  try {
    const user = getCurrentUser();
    const collection = await getCollection(user.uid, collectionId);
    
    if (collection.isDefault) {
      throw new Error('Cannot modify default collections');
    }

    const updatedCollection = {
      ...collection,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid
    };

    await saveCollection(user.uid, updatedCollection);
    return updatedCollection;
  } catch (error) {
    console.error('Error updating collection:', error);
    throw error;
  }
};
```

### Collection Deletion
```javascript
const deleteCollection = async (collectionId) => {
  try {
    const user = getCurrentUser();
    const collection = await getCollection(user.uid, collectionId);
    
    if (collection.isDefault) {
      throw new Error('Cannot delete default collections');
    }

    // Check if collection has cards
    const cards = await getCardsByCollection(user.uid, collectionId);
    if (cards.length > 0) {
      throw new Error('Cannot delete collection with cards. Move cards first.');
    }

    await deleteCollectionFromFirestore(user.uid, collectionId);
    return true;
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw error;
  }
};
```

## Collections Manager Component

### Main Manager Interface
```javascript
const CollectionsManager = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([]);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const user = getCurrentUser();
      const userCollections = await getUserCollections(user.uid);
      setCollections(userCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collections-manager">
      <div className="collections-header">
        <h2>Manage Collections</h2>
        <button onClick={() => setShowNewModal(true)}>
          New Collection
        </button>
      </div>

      <CollectionsList
        collections={collections}
        onEdit={setEditingCollection}
        onDelete={handleDelete}
        selectedCollections={selectedCollections}
        onSelectionChange={setSelectedCollections}
      />

      {showNewModal && (
        <NewCollectionModal
          onClose={() => setShowNewModal(false)}
          onSave={handleCreate}
        />
      )}

      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};
```

### Collection List Display
```javascript
const CollectionsList = ({ 
  collections, 
  onEdit, 
  onDelete, 
  selectedCollections, 
  onSelectionChange 
}) => {
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (aVal < bVal) return -1 * modifier;
      if (aVal > bVal) return 1 * modifier;
      return 0;
    });
  }, [collections, sortField, sortDirection]);

  return (
    <div className="collections-list">
      <div className="list-header">
        <div className="bulk-actions">
          {selectedCollections.length > 0 && (
            <button onClick={() => onDelete(selectedCollections)}>
              Delete Selected ({selectedCollections.length})
            </button>
          )}
        </div>
        <SortControls
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
        />
      </div>

      <div className="collections-grid">
        {sortedCollections.map(collection => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onEdit={onEdit}
            onDelete={onDelete}
            isSelected={selectedCollections.includes(collection.id)}
            onToggleSelect={(id) => {
              onSelectionChange(prev => 
                prev.includes(id) 
                  ? prev.filter(cId => cId !== id)
                  : [...prev, id]
              );
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

## New Collection Modal

### Collection Creation Form
```javascript
const NewCollectionModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📁'
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Collection name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }
    
    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Create New Collection">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <FormField
          label="Collection Name"
          type="text"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          error={errors.name}
          required
        />

        <FormField
          label="Description"
          type="textarea"
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          error={errors.description}
        />

        <div className="form-row">
          <ColorPicker
            label="Collection Color"
            value={formData.color}
            onChange={(color) => setFormData(prev => ({ ...prev, color }))}
          />

          <IconPicker
            label="Collection Icon"
            value={formData.icon}
            onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
          />
        </div>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Collection'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

## Bulk Operations

### Multi-Collection Management
```javascript
const BulkCollectionOperations = {
  async deleteMultiple(collectionIds) {
    const user = getCurrentUser();
    const results = { success: [], failed: [] };

    for (const id of collectionIds) {
      try {
        await deleteCollection(id);
        results.success.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message });
      }
    }

    return results;
  },

  async moveCardsToCollection(fromCollectionIds, toCollectionId) {
    const user = getCurrentUser();
    let totalMoved = 0;

    for (const fromId of fromCollectionIds) {
      const cards = await getCardsByCollection(user.uid, fromId);
      
      for (const card of cards) {
        await updateCard(user.uid, card.id, { 
          collection: toCollectionId,
          collectionId: toCollectionId 
        });
        totalMoved++;
      }
    }

    return totalMoved;
  }
};
```

## Error Handling and Validation

### Collection Validation
```javascript
const CollectionValidator = {
  validateName(name) {
    if (!name || !name.trim()) {
      return 'Collection name is required';
    }
    if (name.length > 50) {
      return 'Name must be 50 characters or less';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  },

  validateDescription(description) {
    if (description && description.length > 200) {
      return 'Description must be 200 characters or less';
    }
    return null;
  },

  validateColor(color) {
    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return 'Please select a valid color';
    }
    return null;
  },

  isProtectedCollection(collection) {
    return collection.isDefault || 
           ['Sold', 'Default', 'Favorites'].includes(collection.name);
  }
};
```

## Collection State Persistence

### NavigationStateManager Integration
Collection selection state is now persisted across browser sessions using the NavigationStateManager:

```javascript
import { NavigationStateManager } from '../utils/NavigationStateManager';

// Collection selection with persistence
const handleCollectionChange = (collection) => {
  setSelectedCollection(collection);
  NavigationStateManager.setSelectedCollection(collection);
  
  // Update URL to reflect collection change
  const currentPath = NavigationStateManager.getCurrentView();
  const newPath = NavigationStateManager.getPathFromView(currentPath);
  navigate(newPath);
};

// Initialize collection from persistent state
const initializeSelectedCollection = () => {
  const persistedCollection = NavigationStateManager.getSelectedCollection();
  if (persistedCollection && collections.some(c => c.id === persistedCollection.id)) {
    setSelectedCollection(persistedCollection);
  } else {
    // Fall back to default collection
    const defaultCollection = collections.find(c => c.isDefault);
    setSelectedCollection(defaultCollection);
    NavigationStateManager.setSelectedCollection(defaultCollection);
  }
};
```

### Collection Creation with Auto-Selection
New collections are automatically selected and persisted:

```javascript
const createNewCollection = async (collectionData) => {
  try {
    const newCollection = await createCollection(collectionData);
    
    // Automatically select the new collection
    setSelectedCollection(newCollection);
    NavigationStateManager.setSelectedCollection(newCollection);
    
    // Refresh collections list
    await loadCollections();
    
    toast.success('Collection created and selected!');
    return newCollection;
  } catch (error) {
    toast.error('Failed to create collection');
    throw error;
  }
};
```

### Collection Deletion Handling
When deleting the currently selected collection, automatically switch to a safe default:

```javascript
const handleCollectionDelete = async (collectionId) => {
  const selectedCollection = NavigationStateManager.getSelectedCollection();
  
  // If deleting currently selected collection
  if (selectedCollection?.id === collectionId) {
    const remainingCollections = collections.filter(c => c.id !== collectionId);
    const defaultCollection = remainingCollections.find(c => c.isDefault) || remainingCollections[0];
    
    if (defaultCollection) {
      setSelectedCollection(defaultCollection);
      NavigationStateManager.setSelectedCollection(defaultCollection);
    }
  }
  
  await deleteCollection(collectionId);
  await loadCollections();
};
```

## Future Enhancements

1. **Collection Templates**: Pre-configured collection types
2. **Collection Sharing**: Share collections with other users
3. **Advanced Filtering**: Filter collections by various criteria
4. **Collection Analytics**: Track collection performance
5. **Import/Export**: Backup and restore collection structures
6. **Collection Themes**: Custom styling for collections
7. **Collection Hierarchy**: Nested collections support
