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
        if (typeof onImageChange === 'function') {
          onImageChange(file);
        } else {
          console.warn('ImageUpload: onImageChange prop is not a function');
        }
      }
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (typeof onImageChange === 'function') {
        onImageChange(e.target.files[0]);
      } else {
        console.warn('ImageUpload: onImageChange prop is not a function');
      }
    }
  };
  
  // Loading state UI
  if (loadingState === 'loading') {
    return (
      <div className={`flex size-full items-center justify-center rounded-lg bg-gray-50 dark:bg-[#1A1A1A] ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <div className="mb-2 size-8 animate-spin rounded-full border-4 border-[#E6185C] border-t-transparent"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
        </div>
      </div>
    );
  }
  
  // Error state UI
  if (loadingState === 'error') {
    return (
      <div className={`flex size-full flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-[#1A1A1A] ${className}`}>
        <Icon name="error_outline" size="lg" className="mb-2 text-red-500" />
        <span className="mb-3 text-sm text-gray-500 dark:text-gray-400">Failed to load image</span>
        <button 
          onClick={onRetry}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
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
        className={`group relative size-full overflow-hidden rounded-lg ${className}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div 
          className="flex size-full cursor-pointer items-center justify-center bg-gray-50 dark:bg-[#1A1A1A]" 
          onClick={onClick}
        >
          <img
            src={imageUrl}
            alt="Card"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        
        {/* Upload overlay on hover */}
        <div className="bg-black/50 absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleUploadClick}
            className="bg-white/10 hover:bg-white/20 mb-2 rounded-full p-2 text-white transition-colors"
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
        className={`mb-3 text-gray-400 dark:text-gray-500 ${isDragging ? 'text-[#E6185C] dark:text-[#E6185C]' : ''}`} 
      />
      <span className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        {isDragging ? 'Drop image here' : 'No image available'}
      </span>
      <button
        type="button"
        className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
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
