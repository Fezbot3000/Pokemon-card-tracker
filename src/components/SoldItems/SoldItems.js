import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const SoldItems = () => {
  const { isDark } = useTheme();
  
  return (
    <div className={`container mx-auto px-4 pb-8 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-6">Sold Items</h2>
        
        <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="material-icons text-5xl mb-4">inventory_2</span>
          <h3 className="text-xl font-medium mb-2">No sold cards found</h3>
          <p>When you sell cards from your collection, they will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default SoldItems; 