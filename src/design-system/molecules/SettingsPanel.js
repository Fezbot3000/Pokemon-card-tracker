import React from 'react';
import PropTypes from 'prop-types';
import './SettingsPanel.css';

/**
 * SettingsPanel Component
 *
 * A container for settings content that provides consistent styling.
 */
const SettingsPanel = ({
  title,
  description,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`settings-panel ${className}`} {...props}>
      {title && (
        <h3 className="settings-panel__title">
          {title}
        </h3>
      )}
      {description && (
        <p className="settings-panel__description">
          {description}
        </p>
      )}
      <div className="settings-panel__content">{children}</div>
    </div>
  );
};

SettingsPanel.propTypes = {
  /** Panel title */
  title: PropTypes.string,
  /** Description text below the title */
  description: PropTypes.string,
  /** Panel content */
  children: PropTypes.node,
  /** Additional className */
  className: PropTypes.string,
};

export default SettingsPanel;
