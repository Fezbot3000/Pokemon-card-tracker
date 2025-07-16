import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardImage, AmountLabel, Icon } from '../../../design-system';

/**
 * CardSection - Displays card component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {Function} props.handleComponentAction - Handler for component actions
 */
const CardSection = ({ handleComponentAction }) => {
  // Sample card data for examples
  const sampleCards = [
    {
      id: '1',
      name: 'Charizard',
      set: 'Base Set',
      condition: 'Near Mint',
      value: 150.00,
      image: '/card-images/DefaultCard.png',
      rarity: 'Holo Rare',
      year: '1999',
    },
    {
      id: '2',
      name: 'Pikachu',
      set: 'Base Set',
      condition: 'Light Play',
      value: 25.00,
      image: '/card-images/DefaultCard.png',
      rarity: 'Common',
      year: '1999',
    },
    {
      id: '3',
      name: 'Blastoise',
      set: 'Base Set',
      condition: 'Mint',
      value: 200.00,
      image: '/card-images/DefaultCard.png',
      rarity: 'Holo Rare',
      year: '1999',
    },
  ];

  /**
   * Renders a card example with different variations
   * 
   * @param {Object} card - Card data
   * @param {string} variant - Card variant
   * @returns {JSX.Element} Card example
   */
  const renderCardExample = (card, variant = 'default') => {
    const cardProps = {
      card,
      onClick: () => handleComponentAction('card-click', { card, variant }),
      className: 'cursor-pointer transition-transform hover:scale-105',
    };

    switch (variant) {
      case 'compact':
        return (
          <Card
            {...cardProps}
            variant="compact"
            showDetails={false}
          />
        );
      
      case 'detailed':
        return (
          <Card
            {...cardProps}
            variant="detailed"
            showDetails={true}
          />
        );
      
      case 'minimal':
        return (
          <Card
            {...cardProps}
            variant="minimal"
            showImage={false}
          />
        );
      
      default:
        return <Card {...cardProps} />;
    }
  };

  /**
   * Renders a card variation showcase
   * 
   * @param {string} title - Section title
   * @param {Array} cards - Array of cards to display
   * @param {string} variant - Card variant
   * @returns {JSX.Element} Card showcase
   */
  const renderCardShowcase = (title, cards, variant = 'default') => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {renderCardExample(card, variant)}
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {card.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {card.set} • {card.condition}
              </p>
              <AmountLabel
                amount={card.value}
                currency="USD"
                className="text-sm font-semibold"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Renders interactive card examples
   * 
   * @returns {JSX.Element} Interactive examples
   */
  const renderInteractiveExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Interactive Examples
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card with Actions */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Card with Actions
          </h4>
          <div className="relative">
            <Card
              card={sampleCards[0]}
              onClick={() => handleComponentAction('card-click', { card: sampleCards[0] })}
              className="cursor-pointer transition-transform hover:scale-105"
            />
            <div className="absolute top-2 right-2 flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleComponentAction('card-edit', { card: sampleCards[0] });
                }}
                className="p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Icon name="edit" className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleComponentAction('card-delete', { card: sampleCards[0] });
                }}
                className="p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Icon name="trash" className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Card with Status */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Card with Status
          </h4>
          <div className="relative">
            <Card
              card={sampleCards[1]}
              onClick={() => handleComponentAction('card-click', { card: sampleCards[1] })}
              className="cursor-pointer transition-transform hover:scale-105"
            />
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                For Sale
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cards
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore card component variations and interactive states. Cards are used to display 
          Pokemon card information in various layouts and formats.
        </p>
      </div>

      {/* Default Cards */}
      {renderCardShowcase('Default Cards', sampleCards, 'default')}

      {/* Compact Cards */}
      {renderCardShowcase('Compact Cards', sampleCards, 'compact')}

      {/* Detailed Cards */}
      {renderCardShowcase('Detailed Cards', sampleCards, 'detailed')}

      {/* Minimal Cards */}
      {renderCardShowcase('Minimal Cards', sampleCards, 'minimal')}

      {/* Interactive Examples */}
      {renderInteractiveExamples()}

      {/* Card Anatomy */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Card Anatomy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <Icon name="image" className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Card Image</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">High-quality card artwork</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <Icon name="tag" className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Card Details</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Name, set, condition, rarity</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <Icon name="dollar-sign" className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Value Display</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Current market value</p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
              <Icon name="settings" className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Actions</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Edit, delete, view details</p>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Card Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Default:</strong> Use for general card display in lists and grids
          </div>
          <div>
            <strong>Compact:</strong> Use for dense layouts and mobile views
          </div>
          <div>
            <strong>Detailed:</strong> Use for card details pages and expanded views
          </div>
          <div>
            <strong>Minimal:</strong> Use for quick previews and search results
          </div>
          <div>
            <strong>Interactive:</strong> Always provide clear feedback for user actions
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• Cards are keyboard navigable with proper focus indicators</div>
          <div>• Card images have descriptive alt text</div>
          <div>• Card values are announced to screen readers</div>
          <div>• Interactive elements have proper ARIA labels</div>
        </div>
      </div>
    </div>
  );
};

CardSection.propTypes = {
  handleComponentAction: PropTypes.func.isRequired,
};

export default CardSection; 