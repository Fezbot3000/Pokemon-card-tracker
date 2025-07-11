import React from 'react';
import { formatCurrency } from '../utils/formatters.js';
import { getValueColor, getGradingCompanyColor, getStatColor } from '../utils/colorUtils.js';
import { getTypographyStyle } from '../config/configManager.js';
import { getSurfaceStyle, getTextColorStyle, getBackgroundColorStyle } from '../utils/styleUtils.js';

const StatisticsComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors
  }) => {
  // Define grading company colors using design system config
  const getGradingCompanyColorLocal = (company, grade) => {
    const gradeNum = parseInt(grade);
    if (company === 'PSA') {
      if (gradeNum === 10) return { style: { backgroundColor: colors.warning, color: colors.text } };
      if (gradeNum === 9) return { style: { ...getPrimaryButtonStyle() } };
      if (gradeNum >= 8) return { style: { backgroundColor: colors.success, color: colors.background } };
      if (gradeNum >= 7) return { style: { backgroundColor: colors.success, color: colors.background } };
    }
    // Other companies use accent color
    return { style: { backgroundColor: colors.error, color: colors.background } };
  };

  const getStatColorLocal = (label, value, isIcon = false) => {
    if (label === 'PROFIT') {
      const isPositive = value > 0;
      if (isIcon) {
        return isPositive ? colors.success : colors.error;
      }
      return isPositive ? 
        (isDarkMode ? `${colors.success}40` : `${colors.success}1A`) : 
        (isDarkMode ? `${colors.error}40` : `${colors.error}1A`);
    }
    if (label === 'PAID') {
      return isIcon ? colors.secondary : 
        (isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`);
    }
    // Default for other stats
    return isIcon ? colors.secondary :
      (isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`);
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {data.stats.map((stat, index) => {
            const isProfit = stat.label === 'PROFIT';
            const isPositive = stat.value > 0;
            const isNegative = stat.value < 0;
            
            return (
              <div key={index} className="relative group">
                <div className={`p-4 rounded-lg transition-all duration-200 hover:scale-105 border`}
                     style={{...getSurfaceStyle('primary'), borderColor: colors.border}}>
                  
                  {/* Icon and Label */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`size-8 rounded-full flex items-center justify-center`}
                           style={{ backgroundColor: getStatColorLocal(stat.label, stat.value) }}>
                        <span className="text-sm">
                          {stat.label === 'PAID' ? '💰' :
                           stat.label === 'VALUE' ? '💎' :
                           stat.label === 'PROFIT' ? '📈' : '🃏'}
                        </span>
                      </div>
                      <div 
                        className={`font-medium`}
                        style={{
                          ...getTypographyStyle('label'),
                          fontSize: '12px',
                          fontWeight: '600',
                          letterSpacing: '0.05em',
                          ...getTextColorStyle('secondary')
                        }}
                      >
                        {stat.label}
                      </div>
                    </div>
                    
                    {/* Trend Arrow for Profit */}
                    {isProfit && (
                      <div className={`p-1 rounded-full`}
                           style={{ backgroundColor: isPositive ? `${colors.success}33` : `${colors.error}33` }}>
                        <svg className={`size-3`} 
                             style={{ color: isPositive ? colors.success : colors.error }}
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Value */}
                  <div className="space-y-1">
                    <div 
                      className={`font-bold ${(config.financial?.alignment || 'right') === 'center' ? 'text-center' : (config.financial?.alignment || 'right') === 'left' ? 'text-left' : 'text-right'}`}
                      style={{ 
                        ...getTypographyStyle('financial'),
                        fontSize: '20px',
                        fontWeight: '700',
                        color: isProfit ? getValueColor(stat.value) : getTextColorStyle('primary').color
                      }}
                    >
                      {stat.isCount ? (
                        <span className="flex items-center justify-center">
                          {stat.value}
                        </span>
                      ) : (
                        formatCurrency(stat.value)
                      )}
                    </div>
                    
                    {/* Progress Bar for Visual Interest */}
                    <div className={`w-full h-1 rounded-full overflow-hidden`}
                         style={getBackgroundColorStyle('secondary')}>
                      <div 
                        className={`h-full transition-all duration-1000`}
                        style={{ 
                          backgroundColor: getStatColorLocal(stat.label, stat.value, true),
                          width: '100%', // Show full progress bars since all cards are being displayed
                          animation: 'slideIn 1s ease-out'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
  );
};

export default StatisticsComponent; 