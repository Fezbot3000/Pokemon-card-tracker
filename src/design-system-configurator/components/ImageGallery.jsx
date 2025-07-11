import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { validateImageFile, compressImage, MAX_FILE_SIZE } from '../../utils/imageUtils';
import { toast } from 'react-hot-toast';

const ImageGallery = ({ 
  images = [], 
  onImagesChange, 
  maxImages = 5,
  config,
  colors,
  getTypographyStyle,
  getSurfaceStyle,
  getTextColorStyle,
  className = ""
}) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelection = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more image(s). Maximum ${maxImages} images allowed.`);
      return;
    }

    setUploading(true);
    const newImages = [];

    try {
      for (const file of fileArray) {
        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        // Compress image
        const compressedFile = await compressImage(file);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(compressedFile);
        
        newImages.push({
          id: Date.now() + Math.random(),
          file: compressedFile,
          preview: previewUrl,
          name: file.name,
          size: compressedFile.size,
          isPrimary: images.length === 0 && newImages.length === 0 // First image is primary
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`Added ${newImages.length} image(s)`);
      }
    } catch (error) {
      toast.error('Error processing images: ' + error.message);
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, onImagesChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDraggedOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDraggedOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelection(files);
  };

  const handleFileInput = (e) => {
    handleFileSelection(e.target.files);
  };

  const removeImage = (imageId) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // If we removed the primary image, make the first remaining image primary
    if (updatedImages.length > 0) {
      const hadPrimary = images.some(img => img.id === imageId && img.isPrimary);
      if (hadPrimary) {
        updatedImages[0].isPrimary = true;
      }
    }
    
    onImagesChange(updatedImages);
    
    // Clean up the preview URL
    const removedImage = images.find(img => img.id === imageId);
    if (removedImage?.preview) {
      URL.revokeObjectURL(removedImage.preview);
    }
  };

  const setPrimaryImage = (imageId) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    onImagesChange(updatedImages);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedImages = Array.from(images);
    const [removed] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, removed);

    // If we moved the primary image, update the primary status
    if (result.source.index === 0 || result.destination.index === 0) {
      reorderedImages.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }

    onImagesChange(reorderedImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          draggedOver ? 'border-blue-400 bg-blue-50' : ''
        }`}
        style={{
          borderColor: draggedOver ? colors.primary : colors.border,
          backgroundColor: draggedOver ? `${colors.primary}10` : colors.backgroundSecondary
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('multiple-image-input').click()}
      >
        <div className="space-y-2">
          <svg className="size-10 mx-auto" style={{ color: colors.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div style={{
            ...getTypographyStyle('body'),
            ...getTextColorStyle('primary')
          }}>
            {uploading ? 'Processing images...' : 'Click to upload or drag images here'}
          </div>
          <div style={{
            ...getTypographyStyle('caption'),
            ...getTextColorStyle('secondary')
          }}>
            Maximum {maxImages} images • {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB per image • JPEG/PNG only
          </div>
          <div style={{
            ...getTypographyStyle('caption'),
            ...getTextColorStyle('secondary')
          }}>
            {images.length} / {maxImages} images uploaded
          </div>
        </div>
        
        <input
          id="multiple-image-input"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading || images.length >= maxImages}
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div style={{
            ...getTypographyStyle('caption'),
            ...getTextColorStyle('secondary')
          }}>
            Drag to reorder • First image is the primary image
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-wrap gap-3"
                >
                  {images.map((image, index) => (
                    <Draggable key={image.id} draggableId={image.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative group ${snapshot.isDragging ? 'z-10' : ''}`}
                        >
                          <div 
                            className={`relative w-24 h-32 rounded-lg overflow-hidden border-2 ${
                              image.isPrimary ? 'border-blue-500' : 'border-gray-200'
                            }`}
                            style={{
                              borderColor: image.isPrimary ? colors.primary : colors.border
                            }}
                          >
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="size-full object-cover"
                            />
                            
                            {/* Primary badge */}
                            {image.isPrimary && (
                              <div 
                                className="absolute top-1 left-1 px-1 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: colors.primary,
                                  color: 'white',
                                  ...getTypographyStyle('caption')
                                }}
                              >
                                Primary
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!image.isPrimary && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrimaryImage(image.id);
                                  }}
                                  className="p-1 rounded-full text-xs"
                                  style={{
                                    backgroundColor: colors.primary,
                                    color: 'white'
                                  }}
                                  title="Set as primary"
                                >
                                  ★
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(image.id);
                                }}
                                className="p-1 rounded-full text-xs"
                                style={{
                                  backgroundColor: colors.error,
                                  color: 'white'
                                }}
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          
                          {/* Image info */}
                          <div className="mt-1 text-center">
                            <div 
                              className="text-xs truncate"
                              style={{
                                ...getTypographyStyle('caption'),
                                ...getTextColorStyle('secondary')
                              }}
                            >
                              {image.name}
                            </div>
                            <div 
                              className="text-xs"
                              style={{
                                ...getTypographyStyle('caption'),
                                ...getTextColorStyle('secondary')
                              }}
                            >
                              {(image.size / 1024 / 1024).toFixed(1)}MB
                            </div>
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
        </div>
      )}
    </div>
  );
};

export default ImageGallery; 