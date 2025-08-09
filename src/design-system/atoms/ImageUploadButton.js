import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';
import LoggingService from '../../services/LoggingService';
import './ImageUploadButton.css';

/**
 * ImageUploadButton Component
 *
 * A dedicated button for uploading images with drag-and-drop support.
 * This is separated from the image display to give users a clear upload action.
 */
const ImageUploadButton = ({ onImageChange, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Handle click to upload image
  const handleUploadClick = e => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Handle drag events
  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        if (typeof onImageChange === 'function') {
          onImageChange(file);
        } else {
          LoggingService.warn(
            'ImageUploadButton: onImageChange prop is not a function'
          );
        }
      }
    }
  };

  // Handle file input change
  const handleFileChange = e => {
    if (e.target.files && e.target.files[0]) {
      if (typeof onImageChange === 'function') {
        onImageChange(e.target.files[0]);
      } else {
        LoggingService.warn('ImageUploadButton: onImageChange prop is not a function');
      }
    }
  };

  return (
    <div
      className={`image-upload-button ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={handleUploadClick}
        className={`image-upload-button__btn ${
          isDragging ? 'image-upload-button__btn--dragging' : ''
        }`}
      >
        <Icon name="upload" />
        <span>{isDragging ? 'Drop image here' : 'Replace Image'}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="image-upload-button__input"
      />
    </div>
  );
};

ImageUploadButton.propTypes = {
  onImageChange: PropTypes.func,
  className: PropTypes.string,
};

export default ImageUploadButton;
