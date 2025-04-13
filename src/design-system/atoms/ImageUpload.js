import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * ImageUpload Component
 * 
 * A component for uploading and displaying images with drag-and-drop support.
 */
const ImageUpload = ({ 
  imageUrl, 
  onImageChange, 
  loadingState = 'idle',
  onRetry,
  onClick,
  className = '' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Handle click to upload image
  const handleUploadClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };
  
  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        onImageChange(file);
      }
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };
  
  // Loading state UI
  if (loadingState === 'loading') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1A] rounded-lg ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#E6185C] border-t-transparent rounded-full mb-2"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
        </div>
      </div>
    );
  }
  
  // Error state UI
  if (loadingState === 'error') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1A1A1A] rounded-lg ${className}`}>
        <Icon name="error_outline" size="lg" className="text-red-500 mb-2" />
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-3">Failed to load image</span>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Image display if available
  if (imageUrl) {
    return (
      <div 
        className={`relative w-full h-full group rounded-lg overflow-hidden ${className}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div 
          className="w-full h-full cursor-pointer flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1A]" 
          onClick={onClick}
        >
          <img
            src={imageUrl}
            alt="Card"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        {/* Upload overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
          <button
            type="button"
            onClick={handleUploadClick}
            className="mb-2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
          >
            <Icon name="upload" size="lg" />
          </button>
          <span className="text-sm text-white">Click or drag to replace</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    );
  }
  
  // Empty state with upload UI
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center 
        bg-gray-50 dark:bg-[#1A1A1A] rounded-lg border-2 border-dashed 
        border-gray-300 dark:border-gray-600
        ${isDragging ? 'border-[#E6185C] dark:border-[#E6185C]' : ''}
        transition-colors duration-200
        ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleUploadClick}
    >
      <Icon 
        name="image" 
        size="xl" 
        className={`text-gray-400 dark:text-gray-500 mb-3 ${isDragging ? 'text-[#E6185C] dark:text-[#E6185C]' : ''}`} 
      />
      <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {isDragging ? 'Drop image here' : 'No image available'}
      </span>
      <button
        type="button"
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        Upload Image
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

ImageUpload.propTypes = {
  imageUrl: PropTypes.string,
  onImageChange: PropTypes.func.isRequired,
  loadingState: PropTypes.oneOf(['idle', 'loading', 'error']),
  onRetry: PropTypes.func,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default ImageUpload;
