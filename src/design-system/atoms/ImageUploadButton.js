import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * ImageUploadButton Component
 * 
 * A dedicated button for uploading images with drag-and-drop support.
 * This is separated from the image display to give users a clear upload action.
 */
const ImageUploadButton = ({ 
  onImageChange,
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
  
  return (
    <div
      className={`relative w-full max-w-[240px] ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={handleUploadClick}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 
          ${isDragging 
            ? 'bg-[#E6185C]/10 text-[#E6185C] border-[#E6185C]' 
            : 'bg-gray-100 dark:bg-[#0F0F0F] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-[#1B2131]'} 
          rounded-lg text-sm font-medium transition-colors border border-transparent`}
      >
        <Icon name="upload" />
        <span>{isDragging ? 'Drop image here' : 'Replace Image'}</span>
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

ImageUploadButton.propTypes = {
  onImageChange: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default ImageUploadButton;
