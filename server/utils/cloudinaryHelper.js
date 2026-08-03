import cloudinary from '../config/cloudinary.js'

/**
 * Extract Cloudinary public_id from a secure URL
 */
export function getPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null
  try {
    const parts = url.split('/upload/')
    if (parts.length < 2) return null
    const pathAfterUpload = parts[1].replace(/^v\d+\//, '')
    const publicIdWithExt = pathAfterUpload.split('?')[0]
    const lastDotIndex = publicIdWithExt.lastIndexOf('.')
    return lastDotIndex > -1 ? publicIdWithExt.substring(0, lastDotIndex) : publicIdWithExt
  } catch {
    return null
  }
}

/**
 * Upload a file buffer or base64 string to Cloudinary
 */
export async function uploadToCloudinary(source, folder = 'lily-charm/products') {
  if (!source) return null

  // If source is already a Cloudinary HTTP URL (not base64), return as is
  if (typeof source === 'string' && source.startsWith('http') && source.includes('cloudinary.com')) {
    return {
      secure_url: source,
      public_id: getPublicIdFromUrl(source),
    }
  }

  // Handle Multer file buffer
  if (Buffer.isBuffer(source)) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      stream.end(source)
    })
  }

  // Handle Base64 Data URI or raw base64 string
  if (typeof source === 'string' && (source.startsWith('data:') || source.length > 300)) {
    const result = await cloudinary.uploader.upload(source, {
      folder,
      resource_type: 'auto',
    })
    return result
  }

  return null
}

/**
 * Delete an image from Cloudinary by public_id or URL
 */
export async function deleteFromCloudinary(publicIdOrUrl) {
  if (!publicIdOrUrl) return null
  const publicId = (typeof publicIdOrUrl === 'string' && publicIdOrUrl.includes('cloudinary.com'))
    ? getPublicIdFromUrl(publicIdOrUrl)
    : publicIdOrUrl

  if (!publicId) return null
  try {
    const res = await cloudinary.uploader.destroy(publicId)
    return res
  } catch (err) {
    console.error(`Failed to delete image from Cloudinary (${publicId}):`, err)
    return null
  }
}
