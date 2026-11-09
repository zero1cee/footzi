import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'footzi-atelier',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sample_secret_key',
  secure: true,
});

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
}

export class CloudinaryService {
  private isConfigured(): boolean {
    const key = process.env.CLOUDINARY_API_KEY || '';
    const secret = process.env.CLOUDINARY_API_SECRET || '';
    const name = process.env.CLOUDINARY_CLOUD_NAME || '';

    return Boolean(
      name &&
      key &&
      !key.includes('placeholder') &&
      !key.includes('123456789012345') &&
      secret &&
      !secret.includes('placeholder') &&
      !secret.includes('sample_secret_key')
    );
  }

  /**
   * Upload an image (base64 string, data URI, or remote HTTP URL) to Cloudinary.
   * If Cloudinary credentials are mock/test values, returns an optimized CDN representation.
   */
  async uploadProductImage(
    fileData: string,
    folder: string = 'footzi/products'
  ): Promise<UploadResult> {
    if (!this.isConfigured()) {
      // Mock / Offline fallback for development & CI testing without active cloud credits
      const mockPublicId = `footzi_prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // If client passed a full image URL (e.g. Unsplash or existing CDN), keep it while wrapping
      const isRemoteUrl = fileData.startsWith('http://') || fileData.startsWith('https://');
      const secureUrl = isRemoteUrl
        ? fileData
        : `https://res.cloudinary.com/footzi-atelier/image/upload/v1/products/${mockPublicId}.jpg`;

      return {
        publicId: mockPublicId,
        url: secureUrl,
        secureUrl,
        optimizedUrl: secureUrl,
        thumbnailUrl: secureUrl,
      };
    }

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(fileData, {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp', 'avif', 'jpeg'],
        transformation: [
          { quality: 'auto:best' },
          { fetch_format: 'auto' },
        ],
      });

      const optimizedUrl = cloudinary.url(result.public_id, {
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      });

      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 300,
        height: 300,
        crop: 'fill',
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        optimizedUrl,
        thumbnailUrl,
      };
    } catch (error: any) {
      throw new Error(`Cloudinary image upload failed: ${error.message}`);
    }
  }

  /**
   * Generate an optimized transformation URL for responsive delivery
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      width: width || 800,
      height: height,
      crop: 'limit',
      secure: true,
    });
  }
}

export const cloudinaryService = new CloudinaryService();
