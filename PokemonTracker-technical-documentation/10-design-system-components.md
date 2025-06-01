# Design System Components - Technical Documentation

## Overview
The Design System provides reusable, consistent UI components with standardized styling, accessibility features, and unified user experience patterns across the Pokemon Card Tracker application.

## File Locations
- **Core Components**: `src/design-system/components/`
- **Base Styles**: `src/design-system/styles/`
- **Theme System**: `src/design-system/theme/`
- **Utility Classes**: `src/design-system/utils/`

## Core Design Principles

### Component Architecture
```javascript
// Standard component structure
const ComponentName = ({
  children,
  variant = 'default',
  size = 'medium',
  disabled = false,
  className = '',
  ...props
}) => {
  const classes = classNames(
    'component-base',
    `component--${variant}`,
    `component--${size}`,
    {
      'component--disabled': disabled,
      [className]: className
    }
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
```

## Form Components

### Input Field Component
```javascript
const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  required = false,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value, e);
    }
  };

  const classes = classNames(
    'input',
    {
      'input--focused': focused,
      'input--error': error,
      'input--disabled': disabled,
      'input--required': required,
      [className]: className
    }
  );

  return (
    <div className="input-wrapper">
      <input
        ref={inputRef}
        type={type}
        value={value || ''}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={classes}
        {...props}
      />
      {error && (
        <div className="input-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
```

### Form Field Component
```javascript
const FormField = ({
  label,
  children,
  error,
  required = false,
  helpText,
  className = ''
}) => {
  const fieldId = useId();

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId}
          className={`form-label ${required ? 'form-label--required' : ''}`}
        >
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div className="form-control">
        {React.cloneElement(children, { id: fieldId })}
      </div>
      
      {helpText && (
        <div className="form-help-text">
          {helpText}
        </div>
      )}
      
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
```

### Select Component
```javascript
const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const classes = classNames(
    'select',
    {
      'select--open': isOpen,
      'select--disabled': disabled,
      'select--error': error,
      [className]: className
    }
  );

  return (
    <div className={classes} ref={selectRef}>
      <button
        type="button"
        className="select__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        {...props}
      >
        <span className="select__value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`select__arrow ${isOpen ? 'select__arrow--up' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="select__dropdown">
          <div className="select__search">
            <input
              type="text"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="select__search-input"
            />
          </div>
          
          <div className="select__options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`select__option ${option.value === value ? 'select__option--selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="select__no-options">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Button Components

### Primary Button Component
```javascript
const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const classes = classNames(
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    {
      'btn--disabled': disabled,
      'btn--loading': loading,
      'btn--icon-only': icon && !children,
      [`btn--icon-${iconPosition}`]: icon && children,
      [className]: className
    }
  );

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn__spinner">⟳</span>}
      
      {icon && iconPosition === 'left' && (
        <span className="btn__icon btn__icon--left">{icon}</span>
      )}
      
      {children && <span className="btn__text">{children}</span>}
      
      {icon && iconPosition === 'right' && (
        <span className="btn__icon btn__icon--right">{icon}</span>
      )}
    </button>
  );
};
```

### Icon Button Component
```javascript
const IconButton = ({
  icon,
  onClick,
  disabled = false,
  size = 'medium',
  variant = 'ghost',
  tooltip,
  className = '',
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const classes = classNames(
    'icon-btn',
    `icon-btn--${variant}`,
    `icon-btn--${size}`,
    {
      'icon-btn--disabled': disabled,
      [className]: className
    }
  );

  return (
    <div className="icon-btn-wrapper">
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...props}
      >
        {icon}
      </button>
      
      {tooltip && showTooltip && (
        <div className="tooltip" role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
};
```

## Modal Components

### Base Modal Component
```javascript
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      
      // Focus management
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements?.length > 0) {
        focusableElements[0].focus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const classes = classNames(
    'modal',
    `modal--${size}`,
    {
      'modal--animating': isAnimating,
      [className]: className
    }
  );

  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      onAnimationEnd={() => setIsAnimating(false)}
    >
      <div 
        className={classes}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        {...props}
      >
        <div className="modal__header">
          {title && (
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
          )}
          
          {showCloseButton && (
            <IconButton
              icon="✕"
              onClick={onClose}
              variant="ghost"
              className="modal__close"
              tooltip="Close"
            />
          )}
        </div>
        
        <div className="modal__content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
```

### Confirmation Modal
```javascript
const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="small"
      className="confirmation-modal"
    >
      <div className="confirmation-content">
        <div className="confirmation-message">
          {message}
        </div>
        
        <div className="confirmation-actions">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

## Card Components

### Card Container
```javascript
const Card = ({
  children,
  variant = 'default',
  padding = 'medium',
  shadow = true,
  interactive = false,
  onClick,
  className = '',
  ...props
}) => {
  const classes = classNames(
    'card',
    `card--${variant}`,
    `card--padding-${padding}`,
    {
      'card--shadow': shadow,
      'card--interactive': interactive,
      'card--clickable': onClick,
      [className]: className
    }
  );

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={classes}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
};
```

### Card Image Component
```javascript
const CardImage = ({
  src,
  alt,
  fallbackSrc,
  placeholder,
  aspectRatio = '3/4',
  loading = 'lazy',
  className = '',
  onLoad,
  onError,
  ...props
}) => {
  const [imageState, setImageState] = useState('loading');
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = (e) => {
    setImageState('loaded');
    onLoad?.(e);
  };

  const handleError = (e) => {
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setImageState('error');
    }
    onError?.(e);
  };

  const classes = classNames(
    'card-image',
    `card-image--${imageState}`,
    {
      [className]: className
    }
  );

  return (
    <div 
      className={classes}
      style={{ aspectRatio }}
    >
      {imageState === 'loading' && placeholder && (
        <div className="card-image__placeholder">
          {placeholder}
        </div>
      )}
      
      {imageState === 'error' ? (
        <div className="card-image__error">
          <span>⚠️</span>
          <span>Failed to load image</span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className="card-image__img"
          {...props}
        />
      )}
    </div>
  );
};
```

## Loading and Feedback Components

### Loading Spinner
```javascript
const LoadingSpinner = ({
  size = 'medium',
  variant = 'primary',
  className = ''
}) => {
  const classes = classNames(
    'loading-spinner',
    `loading-spinner--${size}`,
    `loading-spinner--${variant}`,
    className
  );

  return (
    <div className={classes} role="status" aria-label="Loading">
      <div className="loading-spinner__circle"></div>
    </div>
  );
};
```

### Toast Notification System
```javascript
const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  action,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  if (!isVisible) return null;

  const classes = classNames(
    'toast',
    `toast--${type}`,
    {
      'toast--exiting': isExiting,
      [className]: className
    }
  );

  return (
    <div className={classes}>
      <div className="toast__icon">
        {getIcon()}
      </div>
      
      <div className="toast__content">
        <div className="toast__message">
          {message}
        </div>
        
        {action && (
          <div className="toast__action">
            {action}
          </div>
        )}
      </div>
      
      <IconButton
        icon="✕"
        onClick={handleClose}
        size="small"
        variant="ghost"
        className="toast__close"
      />
    </div>
  );
};

// Toast Context Provider
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const value = useMemo(() => ({
    addToast,
    removeToast
  }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
```

## Theme System

### Theme Configuration
```javascript
export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a'
    },
    danger: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706'
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      500: '#6b7280',
      800: '#1f2937',
      900: '#111827'
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    }
  },
  
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  }
};
```

### CSS Custom Properties Integration
```css
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  
  /* Typography */
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-size-base: 1rem;
  
  /* Borders */
  --border-radius-md: 0.375rem;
  
  /* Shadows */
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

## Accessibility Features

### Focus Management
```javascript
const useFocusTrap = (isActive) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};
```

### Screen Reader Support
```javascript
const ScreenReaderOnly = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
);

const AriaLiveRegion = ({ message, priority = 'polite' }) => (
  <div 
    aria-live={priority}
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);
```

## Performance Optimizations

### Component Memoization
```javascript
// Memoized component wrapper
const withMemo = (Component) => {
  return React.memo(Component, (prevProps, nextProps) => {
    return Object.keys(prevProps).every(key => 
      prevProps[key] === nextProps[key]
    );
  });
};

// Virtual list for large datasets
const VirtualList = ({ items, itemHeight, containerHeight, renderItem }) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd + 1);
  
  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={visibleStart + index}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, visibleStart + index)}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Future Enhancement Opportunities

1. **Dark Mode Support**: Comprehensive dark theme implementation
2. **Advanced Animations**: Framer Motion integration for smooth transitions
3. **Responsive Design**: Enhanced mobile and tablet experiences
4. **Component Documentation**: Storybook integration for component library
5. **Theming System**: User-customizable themes and color schemes
6. **Accessibility Audit**: Comprehensive WCAG compliance testing
7. **Performance Monitoring**: Real-time component performance tracking
