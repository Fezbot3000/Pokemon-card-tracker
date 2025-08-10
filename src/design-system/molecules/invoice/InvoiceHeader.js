import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../atoms/Icon';
import Button from '../../atoms/Button';
import './InvoiceHeader.css';

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
  // Clean wrapper for Icon component
  const CleanIcon = iconProps => {
    const cleanedProps = { ...iconProps };
    if (cleanedProps['data-component-name']) {
      delete cleanedProps['data-component-name'];
    }
    return <Icon {...cleanedProps} />;
  };

  return (
    <div className={`invoice-header ${className}`} onClick={onToggle} {...props}>
      {/* Left side - Invoice info and expand icon */}
      <div className="invoice-header__left">
        <CleanIcon
          name={isExpanded ? 'expand_less' : 'expand_more'}
          size="md"
          className="invoice-header__expand-icon"
        />
        <div className="invoice-header__info">
          <h3
            className="invoice-header__title"
            title={`Sold to: ${title}`}
          >
            Sold to: {title}
          </h3>
          <div className="invoice-header__meta">
            <span>Date: {subtitle}</span>
            <span>Cards: {cardCount}</span>
          </div>
        </div>
      </div>

      {/* Right side - Financial summary and actions */}
      <div className="invoice-header__right">
        {/* Financial summary - Horizontal layout */}
        <div className="invoice-header__financial">
          <div className="invoice-header__metric">
            <div className="invoice-header__metric-label">
              Investment
            </div>
            <div className="invoice-header__metric-value">
              {formatUserCurrency
                ? formatUserCurrency(totalInvestment, originalCurrencyCode)
                : `$${parseFloat(totalInvestment || 0).toFixed(2)}`}
            </div>
          </div>
          <div className="invoice-header__metric">
            <div className="invoice-header__metric-label">
              Sold for
            </div>
            <div className="invoice-header__metric-value">
              {formatUserCurrency
                ? formatUserCurrency(totalSale, originalCurrencyCode)
                : `$${parseFloat(totalSale || 0).toFixed(2)}`}
            </div>
          </div>
          <div className="invoice-header__metric">
            <div className="invoice-header__metric-label">
              Profit
            </div>
            <div
              className={`invoice-header__metric-value ${totalProfit >= 0 ? 'invoice-header__metric-value--profit' : 'invoice-header__metric-value--loss'}`}
            >
              {formatUserCurrency
                ? formatUserCurrency(totalProfit, originalCurrencyCode)
                : `${totalProfit >= 0 ? '' : '-'}$${Math.abs(parseFloat(totalProfit || 0)).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Mobile financial summary */}
        <div className="invoice-header__financial-mobile">
          <div className="invoice-header__metric">
            <div className="invoice-header__metric-label">
              Profit
            </div>
            <div
              className={`invoice-header__metric-value ${totalProfit >= 0 ? 'invoice-header__metric-value--profit' : 'invoice-header__metric-value--loss'}`}
            >
              {formatUserCurrency
                ? formatUserCurrency(totalProfit, originalCurrencyCode)
                : `${totalProfit >= 0 ? '' : '-'}$${Math.abs(parseFloat(totalProfit || 0)).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {(onPrint || onDelete) && (
          <div className="invoice-header__actions">
            {onPrint && (
              <Button
                variant="text"
                size="sm"
                iconLeft={<CleanIcon name="picture_as_pdf" size="sm" />}
                onClick={e => {
                  e.stopPropagation();
                  onPrint();
                }}
                className="invoice-header__action-button"
                title="Download PDF"
              />
            )}

            {onDelete && (
              <Button
                variant="text"
                size="sm"
                iconLeft={<CleanIcon name="delete_outline" size="sm" />}
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="invoice-header__action-button invoice-header__action-button--delete"
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
