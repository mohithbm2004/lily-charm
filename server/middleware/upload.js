import multer from 'multer'

// Reusable Multer memory storage configuration
const storage = multer.memoryStorage()

// Image file type filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type! Only JPEG, PNG, WEBP and image files are allowed.'), false)
  }
}

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
}).single('image')

export const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('images', 10)

export const uploadAnyImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).any()
