/**
 * Google Cloud Storage service using AWS S3-compatible client
 * Handles uploading, downloading, and deleting screenshots for SEO analysis
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// Initialize S3-compatible client for Google Cloud Storage
const gcsClient = new S3Client({
  endpoint: 'https://storage.googleapis.com',
  region: 'auto', // GCS doesn't use regions like AWS
  credentials: {
    accessKeyId: process.env.GCS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false, // Use virtual-hosted style for GCS
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME!;

if (!BUCKET_NAME || !process.env.GCS_ACCESS_KEY_ID || !process.env.GCS_SECRET_ACCESS_KEY) {
  throw new Error('GCS environment variables are required: GCS_BUCKET_NAME, GCS_ACCESS_KEY_ID, GCS_SECRET_ACCESS_KEY');
}

export interface GCSUploadResult {
  fileName: string;
  publicUrl: string;
  size: number;
}

/**
 * Generate a unique filename for screenshot storage
 */
function generateScreenshotFileName(url: string): string {
  const urlHash = crypto.createHash('md5').update(url).digest('hex');
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `screenshots/${urlHash}-${timestamp}-${randomSuffix}.png`;
}

/**
 * Download image from URL and upload to GCS bucket
 */
export async function uploadScreenshotToGCS(
  imageUrl: string, 
  sourceUrl: string
): Promise<GCSUploadResult> {
  try {
    console.log(`Downloading screenshot from: ${imageUrl}`);
    
    // Download the image from temporary URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const fileName = generateScreenshotFileName(sourceUrl);

    console.log(`Uploading screenshot to GCS: ${fileName} (${imageBuffer.length} bytes)`);

    // Upload to GCS bucket
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: imageBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // 1 year cache
      Metadata: {
        sourceUrl: sourceUrl,
        uploadedAt: new Date().toISOString(),
      },
    });

    await gcsClient.send(uploadCommand);

    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

    console.log(`Screenshot uploaded successfully: ${publicUrl}`);

    return {
      fileName,
      publicUrl,
      size: imageBuffer.length,
    };
  } catch (error) {
    console.error(`Failed to upload screenshot to GCS:`, error);
    throw new Error(`GCS upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete screenshot from GCS bucket
 */
export async function deleteScreenshotFromGCS(fileName: string): Promise<void> {
  try {
    console.log(`Deleting screenshot from GCS: ${fileName}`);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await gcsClient.send(deleteCommand);

    console.log(`Screenshot deleted successfully: ${fileName}`);
  } catch (error) {
    console.error(`Failed to delete screenshot from GCS: ${fileName}`, error);
    // Don't throw error for deletion failures - just log them
    // This ensures analysis deletion doesn't fail if image cleanup fails
  }
}

/**
 * Delete multiple screenshots from GCS bucket
 */
export async function deleteMultipleScreenshots(fileNames: string[]): Promise<void> {
  if (fileNames.length === 0) return;

  console.log(`Deleting ${fileNames.length} screenshots from GCS...`);
  
  // Delete in parallel but limit concurrency
  const batchSize = 5;
  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    await Promise.all(
      batch.map(fileName => deleteScreenshotFromGCS(fileName))
    );
  }
  
  console.log(`Completed deleting ${fileNames.length} screenshots`);
}

/**
 * Extract filename from GCS URL
 */
export function extractFileNameFromGCSUrl(url: string): string | null {
  try {
    const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${BUCKET_NAME}/(.+)`);
    const match = url.match(urlPattern);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Failed to extract filename from GCS URL:', error);
    return null;
  }
}

/**
 * Check if URL is a GCS URL from our bucket
 */
export function isGCSUrl(url: string): boolean {
  return url.startsWith(`https://storage.googleapis.com/${BUCKET_NAME}/`);
}