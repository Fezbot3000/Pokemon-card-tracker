import { useState } from 'react';

/**
 * Custom hook for managing components in the design configurator
 * Extracts all component management logic from the main configurator file
 */
export const useComponentManagement = (initialComponents = []) => {
  const [components, setComponents] = useState(initialComponents);

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type,
      ...getComponentData(type)
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const removeComponent = (id) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const getComponentData = (type) => {
    const componentData = {
      statistics: {
        totalCards: 1247,
        totalValue: 45230.50,
        monthlyGrowth: 12.5,
        avgCardValue: 36.29,
        topGrade: 'PSA 10',
        recentActivity: 15
      },
      searchBar: {
        placeholder: 'Search cards by name, set, or player...',
        showAddButton: true,
        addButtonText: 'Add Card',
        showFilter: true,
        filterOptions: {
          category: [
            { value: 'pokemon', label: 'Pokemon' },
            { value: 'yugioh', label: 'Yu-Gi-Oh!' },
            { value: 'magic', label: 'Magic: The Gathering' },
            { value: 'sports', label: 'Sports Cards' }
          ],
          gradingCompany: [
            { value: 'PSA', label: 'PSA' },
            { value: 'BGS', label: 'BGS' },
            { value: 'CGC', label: 'CGC' },
            { value: 'raw', label: 'Raw (Ungraded)' }
          ],
          grade: [
            { value: '10', label: '10' },
            { value: '9', label: '9' },
            { value: '8', label: '8' },
            { value: '7', label: '7' },
            { value: '6', label: '6' }
          ],
          sortBy: [
            { value: 'value', label: 'Value (High to Low)' },
            { value: 'name', label: 'Name (A-Z)' },
            { value: 'dateAdded', label: 'Date Added' },
            { value: 'grade', label: 'Grade' }
          ]
        }
      },
      collectionSelector: {
        collections: [
          { name: 'Base Set Collection', count: 102, value: 15420.50 },
          { name: 'Jungle Set', count: 64, value: 8950.25 },
          { name: 'Fossil Set', count: 58, value: 7230.75 },
          { name: 'Team Rocket', count: 45, value: 6820.00 },
          { name: 'Gym Heroes', count: 38, value: 4890.30 }
        ]
      },
      cardList: {
        cards: [
          {
            id: 1,
            name: 'Charizard',
            set: 'Base Set',
            year: '1999',
            grade: '10',
            gradingCompany: 'PSA',
            currentValue: 5200.00,
            investment: 450.00,
            category: 'pokemon',
            imageUrl: '/card-images/1999-pokemon-charizard-1st-edition-holo-psa-10.png'
          },
          {
            id: 2,
            name: 'Blastoise',
            set: 'Base Set',
            year: '1999',
            grade: '9',
            gradingCompany: 'PSA',
            currentValue: 1800.00,
            investment: 320.00,
            category: 'pokemon',
            imageUrl: '/card-images/DefaultCard.png'
          },
          {
            id: 3,
            name: 'Venusaur',
            set: 'Base Set',
            year: '1999',
            grade: '8',
            gradingCompany: 'BGS',
            currentValue: 920.00,
            investment: 180.00,
            category: 'pokemon',
            imageUrl: '/card-images/DefaultCard.png'
          }
        ]
      },
      toastMessages: {
        messages: [
          { id: 1, type: 'success', message: 'Card added successfully!' },
          { id: 2, type: 'warning', message: 'Price update available for Charizard' },
          { id: 3, type: 'error', message: 'Failed to sync collection data' },
          { id: 4, type: 'info', message: 'New PSA grades available for review' }
        ]
      }
    };

    return componentData[type] || {};
  };

  const getUsedComponentSections = () => {
    const usedSections = new Set();
    components.forEach(component => {
      if (component.type === 'statistics') usedSections.add('components');
      if (component.type === 'searchBar') usedSections.add('components');
      if (component.type === 'collectionSelector') usedSections.add('components');
      if (component.type === 'cardList') usedSections.add('components');
      if (component.type === 'toastMessages') usedSections.add('components');
    });
    return usedSections;
  };

  const isComponentSectionUsed = (section) => {
    return getUsedComponentSections().has(section);
  };

  return {
    components,
    addComponent,
    removeComponent,
    getComponentData,
    getUsedComponentSections,
    isComponentSectionUsed,
    setComponents
  };
}; 