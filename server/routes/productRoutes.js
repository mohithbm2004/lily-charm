import { Router } from 'express'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteAllProducts,
} from '../controllers/productController.js'
import { uploadAnyImages } from '../middleware/upload.js'
import { protectAdmin } from '../middleware/adminAuth.js'

const router = Router()

router.get('/', listProducts)
router.get('/:id', getProduct)
router.post('/', protectAdmin, uploadAnyImages, createProduct)
router.put('/:id', protectAdmin, uploadAnyImages, updateProduct)
router.delete('/', protectAdmin, deleteAllProducts)
router.delete('/:id', protectAdmin, deleteProduct)

export default router
