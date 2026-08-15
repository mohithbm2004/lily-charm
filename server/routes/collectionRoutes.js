import { Router } from 'express'
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteAllCollections,
} from '../controllers/collectionController.js'
import { uploadAnyImages } from '../middleware/upload.js'
import { protectAdmin } from '../middleware/adminAuth.js'

const router = Router()

router.get('/', listCollections)
router.post('/', protectAdmin, uploadAnyImages, createCollection)
router.put('/:id', protectAdmin, uploadAnyImages, updateCollection)
router.delete('/', protectAdmin, deleteAllCollections)
router.delete('/:id', protectAdmin, deleteCollection)

export default router
