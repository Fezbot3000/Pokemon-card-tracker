import React from 'react';

/**
 * ComponentSection Component
 *
 * Displays a section with a title and children components.
 * Used for organizing components in the component library.
 */
const ComponentSection = ({ title, children, id }) => (
  <div
    id={id}
    className="mb-12 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
  >
    <h2 className="mb-4 border-b border-gray-200 pb-2 text-2xl font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100">
      {title}
    </h2>
    {children}
  </div>
);

export default ComponentSection;
