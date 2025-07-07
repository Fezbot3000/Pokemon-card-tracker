import React from 'react';
import PropTypes from 'prop-types';

function MarketplacePagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {startItem}-{endItem} of {totalItems} listings
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`rounded-md px-3 py-2 ${
            currentPage === 1
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#0F0F0F]'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <span className="material-icons text-sm">chevron_left</span>
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`rounded-md px-3 py-2 ${
              page === currentPage
                ? 'bg-purple-600 text-white'
                : page === '...'
                  ? 'cursor-default text-gray-500 dark:text-gray-400'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`rounded-md px-3 py-2 ${
            currentPage === totalPages
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#0F0F0F]'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <span className="material-icons text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

MarketplacePagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
};

export default MarketplacePagination;
