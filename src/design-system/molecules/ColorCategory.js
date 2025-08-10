import React from 'react';
import './ColorCategory.css';

/**
 * ColorCategory Component
 *
 * Displays a category of colors with a title and children components.
 */
const ColorCategory = ({ title, children }) => {
  return (
    <div className="color-category">
      <h3 className="color-category__title">
        {title}
      </h3>
      <div className="color-category__grid">
        {children}
      </div>
    </div>
  );
};

export default ColorCategory;
