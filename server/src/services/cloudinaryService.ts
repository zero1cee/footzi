import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'footzi-atelier',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sample_secret_key',
  secure: true,
});

export class UploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

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
   * Uploads an image (a base64 data URI or an https link) to Cloudinary. Without real
   * credentials only an existing https link can be used; a file upload is refused.
   */
  async uploadProductImage(
    fileData: string,
    folder: string = 'footzi/products'
  ): Promise<UploadResult> {
    const isRemoteUrl = /^https:\/\/\S+$/.test(fileData);
    const isImageData = /^data:image\/(png|jpe?g|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(fileData);
    if (!isRemoteUrl && !isImageData) {
      throw new UploadError('Send a PNG, JPG, WebP or AVIF image, or an https:// image link.');
    }

    if (!this.isConfigured()) {
      // Without Cloudinary there is nowhere to store a file, and inventing a link would leave
      // a broken image in the catalog. An existing https image link is simply reused.
      if (!isRemoteUrl) {
        throw new UploadError(
          'Image uploads are not set up on this server. Paste an https:// image link instead, or add the CLOUDINARY_* settings to enable uploads.',
          501
        );
      }
      const mockPublicId = `footzi_link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return { publicId: mockPublicId, url: fileData, secureUrl: fileData, optimizedUrl: fileData, thumbnailUrl: fileData };
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
