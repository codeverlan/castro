/**
 * S3 Key Generation Utilities
 * Generates S3 keys for various content types
 * HIPAA-compliant: No PHI in key names - only UUIDs and dates
 */

/**
 * Generate S3 key for recording uploads
 * Format: recordings/{year}/{month}/{day}/{recordingId}.{extension}
 * @param options - Key generation options
 * @returns S3 key string
 */
export function generateRecordingKey(options: {
  recordingId: string;
  extension: string;
  timestamp?: Date;
}): string {
  const date = options.timestamp || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Normalize extension (remove leading dot if present)
  const ext = options.extension.replace(/^\./, '');

  return `recordings/${year}/${month}/${day}/${options.recordingId}.${ext}`;
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type string
 * @returns File extension (without dot)
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
  };

  // Get base MIME type (remove codecs parameter)
  const baseMime = mimeType.split(';')[0].toLowerCase();

  return mimeToExtension[baseMime] || mimeToExtension[mimeType.toLowerCase()] || 'audio';
}

/**
 * Parse recording key to extract metadata
 * @param key - S3 key string
 * @returns Parsed key components or null if invalid
 */
export function parseRecordingKey(key: string): {
  recordingId: string;
  extension: string;
  year: number;
  month: number;
  day: number;
} | null {
  const match = key.match(/^recordings\/(\d{4})\/(\d{2})\/(\d{2})\/([^.]+)\.(.+)$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, recordingId, extension] = match;

  return {
    recordingId,
    extension,
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    day: parseInt(day, 10),
  };
}
