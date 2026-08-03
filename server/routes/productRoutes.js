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

const router = Router()

router.get('/', listProducts)
router.get('/:id', getProduct)
router.post('/', uploadAnyImages, createProduct)
router.put('/:id', uploadAnyImages, updateProduct)
router.delete('/', deleteAllProducts)
router.delete('/:id', deleteProduct)

export default router
