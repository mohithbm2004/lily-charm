import cloudinary from '../config/cloudinary.js'

// POST /api/uploads  (multipart/form-data, field name: "image")
// Expects multer middleware to place the file buffer at req.file.buffer
export async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'lily-charm/products' },
          (error, result) => (error ? reject(error) : resolve(result))
        )
        stream.end(req.file.buffer)
      })

    const result = await uploadFromBuffer()
    res.status(201).json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    next(err)
  }
}
