// Simple currency conversion utilities
export const getUsdToAudRate = () => {
  return 1.5; // Default exchange rate
};

export const convertUsdToAud = (usdAmount) => {
  return usdAmount * getUsdToAudRate();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
};
