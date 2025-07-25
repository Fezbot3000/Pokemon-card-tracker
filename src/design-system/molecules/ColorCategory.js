import React from 'react';

/**
 * ColorCategory Component
 *
 * Displays a category of colors with a title and children components.
 */
const ColorCategory = ({ title, children }) => {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-xl font-medium text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {children}
      </div>
    </div>
  );
};

export default ColorCategory;
