import React from 'react';

/**
 * ComponentSection Component
 * 
 * Displays a section with a title and children components.
 * Used for organizing components in the component library.
 */
const ComponentSection = ({ title, children, id }) => (
  <div id={id} className="mb-12 p-6 rounded-lg shadow-md bg-white dark:bg-gray-800">
    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {title}
    </h2>
    {children}
  </div>
);

export default ComponentSection;
