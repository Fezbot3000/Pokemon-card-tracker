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
    flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-4 sm:p-5 
    bg-gray-50 dark:bg-gray-900 
    cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
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
      {/* Left side - Invoice info and expand icon */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CleanIcon 
          name={isExpanded ? "expand_less" : "expand_more"} 
          size="md"
          className="text-gray-400 dark:text-gray-500 flex-shrink-0" 
        />
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={`Sold to: ${title}`}>
            Sold to: {title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>Date: {subtitle}</span>
            <span>Cards: {cardCount}</span>
          </div>
        </div>
      </div>
      
      {/* Right side - Financial summary and actions */}
      <div className="flex items-center gap-4">
        {/* Financial summary - Horizontal layout */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Investment</div>
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {formatUserCurrency ? formatUserCurrency(totalInvestment, originalCurrencyCode) : `$${parseFloat(totalInvestment || 0).toFixed(2)}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sold for</div>
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {formatUserCurrency ? formatUserCurrency(totalSale, originalCurrencyCode) : `$${parseFloat(totalSale || 0).toFixed(2)}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Profit</div>
            <div className={`text-base font-medium ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatUserCurrency ? formatUserCurrency(totalProfit, originalCurrencyCode) : `${totalProfit >= 0 ? '' : '-'}$${Math.abs(parseFloat(totalProfit || 0)).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Mobile financial summary */}
        <div className="flex sm:hidden text-right">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Profit</div>
            <div className={`text-base font-medium ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatUserCurrency ? formatUserCurrency(totalProfit, originalCurrencyCode) : `${totalProfit >= 0 ? '' : '-'}$${Math.abs(parseFloat(totalProfit || 0)).toFixed(2)}`}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        {(onPrint || onDelete) && (
          <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-4">
            {onPrint && (
              <Button 
                variant="text" 
                size="sm" 
                iconLeft={<CleanIcon name="picture_as_pdf" size="sm" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint();
                }}
                className="!p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title="Download PDF"
              />
            )}
            
            {onDelete && (
              <Button 
                variant="text" 
                size="sm" 
                iconLeft={<CleanIcon name="delete_outline" size="sm" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="!p-2 text-gray-600 dark:text-gray-400 hover:text-red-500"
                title="Delete receipt"
              />
            )}
          </div>
        )}
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
