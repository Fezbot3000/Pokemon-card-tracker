import React, { useState, useEffect } from 'react';
import { useTheme } from '../design-system';

const CollectionList = ({ collections, cards, onAddCollection, onSelectCollection, onDeleteCollection }) => {
  const { isDark } = useTheme();

  // Add "All Cards" collection to the beginning of collections
  const allCollections = [
    {
      id: 'all-cards',
      name: 'All Cards',
      description: 'All cards in your collection',
      cardCount: cards.length,
      isSystem: true
    },
    ...collections
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Collections</h2>
        <button
          onClick={onAddCollection}
          className={`btn btn-primary text-sm ${
            isDark ? 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700' : ''
          }`}
        >
          <span className="material-icons text-base">add</span>
          New Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCollections.map(collection => (
          <div
            key={collection.id}
            className={`p-4 rounded-lg border border-border dark:border-border-dark cursor-pointer transition-all duration-200 ${
              isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => onSelectCollection(collection.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{collection.name}</h3>
              {!collection.isSystem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCollection(collection.id);
                  }}
                  className="text-error dark:text-error hover:text-error/80 dark:hover:text-error/80"
                >
                  <span className="material-icons text-base">delete</span>
                </button>
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>{collection.description}</p>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {collection.cardCount} {collection.cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionList; 
