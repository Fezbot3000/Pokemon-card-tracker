import React from 'react';
import './ComponentSection.css';

/**
 * ComponentSection Component
 *
 * Displays a section with a title and children components.
 * Used for organizing components in the component library.
 */
const ComponentSection = ({ title, children, id }) => (
  <div
    id={id}
    className="component-section"
  >
    <h2 className="component-section__title">
      {title}
    </h2>
    {children}
  </div>
);

export default ComponentSection;
