import React from 'react';
import { getSurfaceStyle, getTextColorStyle, getInteractiveStyle } from '../utils/styleUtils.js';

const EmptyCollectionEntryComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  selectedCollection,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors,
  onAddCard
}) => {
  const handleAddCardClick = () => {
    if (onAddCard) {
      onAddCard();
    } else {
      // Fallback behavior
      console.log('Add card clicked for collection:', selectedCollection?.name || 'Current Collection');
    }
  };

  const collectionName = selectedCollection?.name || selectedCollection?.id || 'this collection';

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div 
        className={`text-center p-12 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-[1.02] cursor-pointer group`}
        style={{
          borderColor: colors.border,
          ...getSurfaceStyle('secondary'),
          '--tw-ring-color': `${colors.primary}33`
        }}
        onClick={handleAddCardClick}
      >
        {/* Empty State Icon */}
        <div className="mb-6">
          <div className={`mx-auto size-20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110`}
               style={{ 
                 backgroundColor: isDarkMode ? `${colors.primary}20` : `${colors.primary}10`, 
                 color: colors.primary 
               }}>
            <svg className="size-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <h3 className={`font-bold text-xl mb-2`}
              style={{
                ...getTypographyStyle('heading'),
                ...getTextColorStyle('primary')
              }}>
            {collectionName === 'this collection' ? 'Add Your First Card' : `Add Cards to ${collectionName}`}
          </h3>
          <p className={`text-sm leading-relaxed`}
             style={{
               ...getTypographyStyle('body'),
               ...getTextColorStyle('secondary')
             }}>
            {collectionName === 'this collection' ? 
              'Start building your collection by adding your first card. Upload photos, set values, and track your investments.' :
              `This collection is empty. Click here to add your first card to ${collectionName} and start tracking your investments.`
            }
          </p>
        </div>

        {/* Add Card Button */}
        <div className="mb-6">
          <button
            onClick={handleAddCardClick}
            className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4`}
            style={{
              ...getPrimaryButtonStyle(),
              '--tw-ring-color': `${colors.primary}33`
            }}
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Card</span>
          </button>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {[
            { icon: '📸', text: 'Upload Images' },
            { icon: '💰', text: 'Track Values' },
            { icon: '📊', text: 'Monitor Profit' }
          ].map((feature, index) => (
            <div key={index} className="flex items-center justify-center space-x-2 opacity-60">
              <span className="text-sm">{feature.icon}</span>
              <span 
                className={`font-medium`}
                style={{
                  ...getTypographyStyle('caption'),
                  ...getTextColorStyle('secondary')
                }}
              >
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmptyCollectionEntryComponent; 