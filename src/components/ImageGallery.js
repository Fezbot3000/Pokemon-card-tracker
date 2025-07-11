import React, { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';
import { 
  validateMultipleImages, 
  createImagePreviews, 
  cleanupPreviews, 
  formatFileSize,
  MAX_IMAGES_PER_CARD 
} from '../utils/imageUtils';
import { reorderImages } from '../utils/imageUtils';
import logger from '../services/LoggingService';

/**
 * ImageGallery Component
 * Handles multiple image uploads with drag-and-drop reordering
 */
const ImageGallery = ({
  images = [],
  onImagesChange,
  onImageAdd,
  onImageRemove,
  onImageReorder,
  allowUploads = true,
  allowReordering = true,
  allowDeletion = true,
  maxImages = MAX_IMAGES_PER_CARD,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file input change
  const handleFileInput = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Check if we can add more images
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate files
    const validation = validateMultipleImages(Array.from(files));
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }

    // Check if we're trying to add too many
    if (validation.validFiles.length > remainingSlots) {
      toast.error(`Can only add ${remainingSlots} more image(s)`);
      return;
    }

    setIsUploading(true);

    try {
      // Create preview objects for the new images
      const newPreviews = await createImagePreviews(validation.validFiles);
      
      // Call the callback to handle the new images
      if (onImageAdd) {
        await onImageAdd(validation.validFiles, newPreviews);
      }

      toast.success(`Added ${validation.validFiles.length} image(s)`);
    } catch (error) {
      logger.error('Error adding images:', error);
      toast.error('Failed to add images');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images.length, maxImages, onImageAdd]);

  // Handle drag over events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Handle drag leave events
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragOverIndex(null);
  }, []);

  // Handle drop events
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragOverIndex(null);

    if (!allowUploads) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please drop image files only');
      return;
    }

    await handleFileInput(imageFiles);
  }, [allowUploads, handleFileInput]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !allowReordering) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reorder images
    const reorderedImages = reorderImages(images, sourceIndex, destinationIndex);
    
    if (onImageReorder) {
      onImageReorder(reorderedImages);
    }

    if (onImagesChange) {
      onImagesChange(reorderedImages);
    }
  }, [images, allowReordering, onImageReorder, onImagesChange]);

  // Handle image removal
  const handleRemoveImage = useCallback((index) => {
    if (!allowDeletion) return;

    const imageToRemove = images[index];
    const updatedImages = images.filter((_, i) => i !== index);
    
    // Update order values
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      order: i,
      isPrimary: i === 0 // First image is primary
    }));

    if (onImageRemove) {
      onImageRemove(imageToRemove, index);
    }

    if (onImagesChange) {
      onImagesChange(reorderedImages);
    }
  }, [images, allowDeletion, onImageRemove, onImagesChange]);

  // Handle file input click
  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`image-gallery ${className}`}>
      {/* Upload Zone */}
      {allowUploads && (
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${
            images.length >= maxImages ? 'disabled' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={images.length < maxImages ? handleFileInputClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={(e) => handleFileInput(e.target.files)}
            style={{ display: 'none' }}
          />
          
          {images.length === 0 ? (
            <div className="upload-zone-empty">
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="upload-text">Click or drag images here</p>
              <p className="upload-subtext">Maximum {maxImages} images, 50MB each</p>
            </div>
          ) : images.length < maxImages ? (
            <div className="upload-zone-add">
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="upload-text">Add more images</p>
              <p className="upload-subtext">{maxImages - images.length} remaining</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="images" direction="horizontal">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`image-grid ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
              >
                {images.map((image, index) => (
                  <Draggable
                    key={image.id || index}
                    draggableId={image.id || index.toString()}
                    index={index}
                    isDragDisabled={!allowReordering}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`image-item ${snapshot.isDragging ? 'dragging' : ''} ${
                          image.isPrimary ? 'primary' : ''
                        }`}
                      >
                        <div className="image-container">
                          <img
                            src={image.url || image.previewUrl}
                            alt={image.filename || `Image ${index + 1}`}
                            className="image-preview"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          
                          {/* Primary badge */}
                          {image.isPrimary && (
                            <div className="primary-badge">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              Primary
                            </div>
                          )}
                          
                          {/* Remove button */}
                          {allowDeletion && (
                            <button
                              type="button"
                              className="remove-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Drag handle */}
                          {allowReordering && (
                            <div className="drag-handle">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 6h8M8 12h8M8 18h8" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Image info */}
                        <div className="image-info">
                          <p className="image-filename">{image.filename || `Image ${index + 1}`}</p>
                          {image.size && (
                            <p className="image-size">{formatFileSize(image.size)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
          <p>Uploading images...</p>
        </div>
      )}

      {/* Style definitions */}
      <style jsx>{`
        .image-gallery {
          width: 100%;
        }

        .upload-zone {
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }

        .upload-zone:hover:not(.disabled) {
          border-color: #4299e1;
          background-color: #f7fafc;
        }

        .upload-zone.dragging {
          border-color: #4299e1;
          background-color: #ebf8ff;
        }

        .upload-zone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-zone-empty,
        .upload-zone-add {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-icon {
          width: 48px;
          height: 48px;
          color: #a0aec0;
        }

        .upload-text {
          font-size: 1.125rem;
          font-weight: 500;
          color: #4a5568;
          margin: 0;
        }

        .upload-subtext {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          padding: 1rem;
          border: 2px solid transparent;
          border-radius: 8px;
          transition: border-color 0.2s;
        }

        .image-grid.drag-over {
          border-color: #4299e1;
          background-color: #f7fafc;
        }

        .image-item {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .image-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .image-item.dragging {
          transform: rotate(5deg);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .image-item.primary {
          border: 2px solid #4299e1;
        }

        .image-container {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
        }

        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        .image-item:hover .image-preview {
          transform: scale(1.05);
        }

        .primary-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #4299e1;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .primary-badge svg {
          width: 12px;
          height: 12px;
        }

        .remove-button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-item:hover .remove-button {
          opacity: 1;
        }

        .remove-button:hover {
          background: rgba(239, 68, 68, 0.9);
        }

        .remove-button svg {
          width: 16px;
          height: 16px;
        }

        .drag-handle {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-item:hover .drag-handle {
          opacity: 1;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .drag-handle svg {
          width: 16px;
          height: 16px;
        }

        .image-info {
          padding: 8px;
          background: white;
        }

        .image-filename {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .image-size {
          font-size: 0.75rem;
          color: #718096;
          margin: 4px 0 0 0;
        }

        .upload-progress {
          margin-top: 1rem;
          text-align: center;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: #4299e1;
          animation: progress 2s infinite linear;
        }

        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ImageGallery; 