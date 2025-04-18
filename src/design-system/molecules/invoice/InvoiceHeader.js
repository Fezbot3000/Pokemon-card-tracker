import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../atoms/Icon';
import AmountLabel from '../../atoms/AmountLabel';
import Button from '../../atoms/Button';

/**
 * InvoiceHeader Component
 * 
 * A collapsible header component for invoices that displays
 * a summary of the invoice and allows toggling its expanded state.
 */
const InvoiceHeader = ({
  title,
  subtitle,
  totalSale = 0,
  totalInvestment = 0,
  totalProfit = 0,
  isExpanded = false,
  onToggle,
  onPrint,
  cardCount = 0,
  className = '',
  ...props
}) => {
  const headerClasses = `
    flex items-center justify-between w-full 
    p-4 bg-white dark:bg-[#1B2131] 
    ${isExpanded ? 'border-b border-gray-200 dark:border-borde-gray-700' : ''}
    cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-colors
    ${className}
  `;

  // Clean wrapper for Icon component
  const CleanIcon = (iconProps) => {
    const cleanedProps = { ...iconProps };
    if (cleanedProps['data-component-name']) {
      delete cleanedProps['data-component-name'];
    }
    return <Icon {...cleanedProps} />;
  };

  return (
    <div className={headerClasses} onClick={onToggle} {...props}>
      {/* Left side with invoice info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <CleanIcon name="receipt" className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={title}>
            {title}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </p>
      </div>
      
      {/* Right side with financial summary and actions */}
      <div className="flex flex-col items-end">
        {/* Financial summary */}
        <div className="flex flex-col items-end gap-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Investment:</span>
            <AmountLabel amount={totalInvestment} size="sm" type="default" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Sale:</span>
            <AmountLabel amount={totalSale} size="sm" type="default" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Profit:</span>
            <AmountLabel amount={totalProfit} size="sm" />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          {onPrint && (
            <Button 
              variant="text" 
              size="sm" 
              iconLeft={<CleanIcon name="print" size="sm" />}
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              className="!p-1"
            >
              PDF
            </Button>
          )}
          
          <CleanIcon 
            name={isExpanded ? "expand_less" : "expand_more"} 
            size="sm"
            className="text-gray-400"
          />
        </div>
      </div>
    </div>
  );
};

InvoiceHeader.propTypes = {
  /** The title to display (e.g., invoice number or buyer name) */
  title: PropTypes.string.isRequired,
  /** The subtitle to display (e.g., date) */
  subtitle: PropTypes.string,
  /** Total sale amount */
  totalSale: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Total investment amount */
  totalInvestment: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Total profit amount */
  totalProfit: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Whether the invoice details are expanded */
  isExpanded: PropTypes.bool,
  /** Callback when the expand/collapse button is clicked */
  onToggle: PropTypes.func.isRequired,
  /** Callback when the print button is clicked */
  onPrint: PropTypes.func,
  /** Number of cards in this invoice */
  cardCount: PropTypes.number,
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceHeader;
