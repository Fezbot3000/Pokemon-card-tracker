/**
 * Utility functions for calculating card statistics
 */

/**
 * Calculate totals for a collection of cards
 * @param {Array} cards - Array of card objects
 * @returns {Object} Object containing investment, value, and profit totals
 */
export const calculateCardTotals = cards => {
  if (!cards || !cards.length) {
    return { investment: 0, value: 0, profit: 0 };
  }

  return cards.reduce(
    (acc, card) => {
      // IMPORTANT: Based on the provided data structure, we know exactly which fields to use
      // The cards have originalInvestmentAmount and originalCurrentValueAmount as the primary fields

      // Get investment amount - directly use originalInvestmentAmount as the primary source
      let investment = 0;
      if (typeof card.originalInvestmentAmount === 'number') {
        investment = card.originalInvestmentAmount;
      } else if (
        typeof card.originalInvestmentAmount === 'string' &&
        card.originalInvestmentAmount
      ) {
        investment = parseFloat(card.originalInvestmentAmount) || 0;
      } else if (typeof card.investmentAUD === 'number') {
        investment = card.investmentAUD;
      } else if (typeof card.investmentAUD === 'string' && card.investmentAUD) {
        investment = parseFloat(card.investmentAUD) || 0;
      }

      // Get value amount - directly use originalCurrentValueAmount as the primary source
      let value = 0;
      if (typeof card.originalCurrentValueAmount === 'number') {
        value = card.originalCurrentValueAmount;
      } else if (
        typeof card.originalCurrentValueAmount === 'string' &&
        card.originalCurrentValueAmount
      ) {
        value = parseFloat(card.originalCurrentValueAmount) || 0;
      } else if (typeof card.currentValueAUD === 'number') {
        value = card.currentValueAUD;
      } else if (
        typeof card.currentValueAUD === 'string' &&
        card.currentValueAUD
      ) {
        value = parseFloat(card.currentValueAUD) || 0;
      }

      // Update running totals
      acc.investment += investment;
      acc.value += value;
      acc.profit += value - investment;
      return acc;
    },
    { investment: 0, value: 0, profit: 0 }
  );
};

/**
 * Format statistics for display in StatisticsSummary component
 * @param {Object} totals - Object with investment, value, and profit
 * @param {number} cardCount - Total number of cards
 * @param {number} displayedCount - Number of cards currently displayed
 * @returns {Array} Array of statistic objects for StatisticsSummary
 */
export const formatStatisticsForDisplay = (
  totals,
  cardCount,
  displayedCount
) => {
  return [
    {
      label: 'Paid',
      value: totals.investment,
      isMonetary: true,
      originalCurrencyCode: 'AUD',
    },
    {
      label: 'Value',
      value: totals.value,
      isMonetary: true,
      originalCurrencyCode: 'AUD',
    },
    {
      label: 'Profit',
      value: totals.profit,
      isProfit: true,
      isMonetary: true,
      originalCurrencyCode: 'AUD',
    },
    {
      label: 'Cards',
      value: cardCount,
      icon: 'style',
      subtitle:
        displayedCount < cardCount
          ? `Showing ${displayedCount} of ${cardCount}`
          : undefined,
    },
  ];
};

/**
 * Calculate statistics for sold cards
 * @param {Array} soldCards - Array of sold card objects
 * @param {Object} invoiceTotals - Object with invoice totals by buyer
 * @param {Function} convertToUserCurrency - Function to convert currency
 * @returns {Object} Object containing totalInvestment, totalSoldFor, totalProfit, invoiceCount
 */
export const calculateSoldCardStatistics = (
  soldCards,
  invoiceTotals,
  convertToUserCurrency
) => {
  if (!soldCards || soldCards.length === 0) {
    return {
      totalInvestment: 0,
      totalSoldFor: 0,
      totalProfit: 0,
      invoiceCount: 0,
    };
  }

  let totalInvestment = 0;
  let totalSoldFor = 0;

  // Calculate totals from all sold cards
  soldCards.forEach(card => {
    // Get investment amount (handle various field names)
    const investmentAmount = parseFloat(
      card.originalInvestmentAmount ||
        card.investmentAUD ||
        card.investment ||
        0
    );
    const investmentCurrency = card.originalInvestmentCurrency || 'AUD';

    // Get sold amount (handle various field names)
    const soldAmount = parseFloat(
      card.soldPrice ||
        card.soldAmount ||
        card.finalValueAUD ||
        card.currentValueAUD ||
        0
    );
    const soldCurrency = card.originalCurrentValueCurrency || 'AUD';

    // Convert to user's preferred currency
    totalInvestment += convertToUserCurrency(
      investmentAmount,
      investmentCurrency
    );
    totalSoldFor += convertToUserCurrency(soldAmount, soldCurrency);
  });

  const totalProfit = totalSoldFor - totalInvestment;

  // Count unique invoices
  const uniqueInvoices = new Set(
    soldCards.map(card => card.invoiceId).filter(Boolean)
  );
  const invoiceCount = uniqueInvoices.size || Object.keys(invoiceTotals).length;

  return {
    totalInvestment,
    totalSoldFor,
    totalProfit,
    invoiceCount,
  };
};
