import { Router } from 'express'
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteAllCollections,
} from '../controllers/collectionController.js'
import { uploadAnyImages } from '../middleware/upload.js'

const router = Router()

router.get('/', listCollections)
router.post('/', uploadAnyImages, createCollection)
router.put('/:id', uploadAnyImages, updateCollection)
router.delete('/', deleteAllCollections)
router.delete('/:id', deleteCollection)

export default router
