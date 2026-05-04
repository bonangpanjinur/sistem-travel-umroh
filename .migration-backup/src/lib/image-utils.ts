/**
 * Image utility functions for resizing and processing images
 */

export interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
}

/**
 * Resize an image file to specified dimensions while maintaining aspect ratio
 */
export function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { maxWidth, maxHeight, quality = 0.9, format } = options;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format
        const outputFormat = format || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          outputFormat,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize image specifically for logo (larger size)
 */
export function resizeForLogo(file: File): Promise<Blob> {
  return resizeImage(file, {
    maxWidth: 400,
    maxHeight: 200,
    quality: 0.95,
    format: 'image/png', // Keep transparency
  });
}

/**
 * Resize image specifically for favicon (small square)
 */
export function resizeForFavicon(file: File): Promise<Blob> {
  return resizeImage(file, {
    maxWidth: 64,
    maxHeight: 64,
    quality: 1,
    format: 'image/png',
  });
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
