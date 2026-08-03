import { Router } from 'express'
import multer from 'multer'
import { uploadImage } from '../controllers/uploadController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.post('/', protect, adminOnly, upload.single('image'), uploadImage)

export default router
