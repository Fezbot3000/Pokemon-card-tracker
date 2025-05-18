import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../atoms/Icon';
import Button from '../../atoms/Button';
import { stripDebugProps } from '../../../utils/stripDebugProps';

/**
 * InvoiceHeader Component
 * 
 * A simplified collapsible header component for invoices that displays
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
  onDelete,
  cardCount = 0,
  className = '',
  // New props for currency formatting
  formatUserCurrency, 
  originalCurrencyCode,
  ...props
}) => {
  const headerClasses = `
    flex flex-col sm:flex-row sm:items-center sm:justify-between w-full 
    p-4 sm:p-5 bg-white dark:bg-[#1B2131] 
    ${isExpanded ? 'border-b border-gray-200 dark:border-borde-gray-700' : ''}
    cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-colors
    gap-3 sm:gap-0
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
    <div className={headerClasses} onClick={onToggle} {...stripDebugProps(props)}>
      {/* Left side with invoice info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <CleanIcon name="receipt" className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={title}>
            {title}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </p>
      </div>
      
      {/* Right side with financial summary and actions */}
      <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
        {/* Financial summary - Adjusted for mobile stacking */}
        <div className="flex flex-col gap-1 mb-3 w-full sm:grid sm:grid-cols-3 sm:gap-x-2 sm:gap-y-1 sm:mb-2">
          <div className="flex flex-row justify-between items-baseline w-full sm:flex-col sm:items-start">
            <span className="text-xs text-gray-500 dark:text-gray-400">Paid</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatUserCurrency ? formatUserCurrency(totalInvestment, originalCurrencyCode) : `$${parseFloat(totalInvestment || 0).toFixed(2)}`}
            </span>
          </div>
          <div className="flex flex-row justify-between items-baseline w-full sm:flex-col sm:items-start">
            <span className="text-xs text-gray-500 dark:text-gray-400">Sale</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatUserCurrency ? formatUserCurrency(totalSale, originalCurrencyCode) : `$${parseFloat(totalSale || 0).toFixed(2)}`}
            </span>
          </div>
          <div className="flex flex-row justify-between items-baseline w-full sm:flex-col sm:items-start">
            <span className="text-xs text-gray-500 dark:text-gray-400">Profit</span>
            <span className={`text-sm font-medium ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatUserCurrency ? formatUserCurrency(totalProfit, originalCurrencyCode) : `${totalProfit >= 0 ? '' : '-'}$${Math.abs(parseFloat(totalProfit || 0)).toFixed(2)}`}
            </span>
          </div>
        </div>
        
        {/* Actions - Adjusted for mobile layout */}
        <div className="flex justify-between items-center w-full mt-1 sm:mt-0 sm:justify-end sm:gap-2 sm:w-auto">
          <div className="flex gap-2"> {/* Group PDF and Delete buttons */}
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
            
            {onDelete && (
              <Button 
                variant="text" 
                size="sm" 
                iconLeft={<CleanIcon name="delete" size="sm" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="!p-1 text-red-500 hover:text-red-600"
                title="Delete receipt"
              />
            )}
          </div> {/* End of PDF/Delete button group */}
          
          <CleanIcon 
            name={isExpanded ? "expand_less" : "expand_more"} 
            size="sm"
            className="text-gray-400 cursor-pointer" // Ensure cursor pointer is here too for clickability
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
  /** Callback when the delete button is clicked */
  onDelete: PropTypes.func,
  /** Number of cards in this invoice */
  cardCount: PropTypes.number,
  /** Additional classes */
  className: PropTypes.string,
  /** Currency formatting function from UserPreferencesContext */
  formatUserCurrency: PropTypes.func,
  /** Original currency code for the amounts being formatted */
  originalCurrencyCode: PropTypes.string,
};

export default InvoiceHeader;
