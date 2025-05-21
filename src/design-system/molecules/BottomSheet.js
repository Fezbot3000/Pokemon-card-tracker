import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';

const BottomSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-[1000] flex items-end bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      {/* Sheet Content */}
      <div 
        className="w-full bg-white dark:bg-[#1e2130] rounded-t-xl shadow-xl transform transition-all duration-300 ease-in-out pt-3 pb-4 px-3"
        style={{ maxHeight: '90vh', transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sheet
      >
        {/* Optional Grabber Handle (visual cue) */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3"></div>

        {/* Header with Title and Close Button */}
        {(title || onClose) && (
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-base font-semibold text-gray-700 dark:text-white text-center flex-grow">
              {title}
            </h3>
            {/* <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full">
              <Icon name="close" size="md" />
            </button> */}
            {/* iOS action sheets usually rely on a cancel button or backdrop tap, so the X can be optional or removed */}
          </div>
        )}
        
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 70px)' }}> {/* Adjust height based on header/padding/grabber */}
          {children}
        </div>
      </div>
    </div>
  );
};

BottomSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default BottomSheet;
