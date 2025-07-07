/**
 * Compresses an image file while maintaining reasonable quality
 * @param {File|Blob} imageFile - The original image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width of the compressed image (default: 1200)
 * @param {number} options.maxHeight - Maximum height of the compressed image (default: 1200)
 * @param {number} options.quality - JPEG quality (0-1) (default: 0.8)
 * @returns {Promise<Blob>} - Compressed image as a Blob
 */
export const compressImage = async (imageFile, options = {}) => {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);

    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};
