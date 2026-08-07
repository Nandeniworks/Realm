import express from 'express';
import { 
  createRealm, 
  joinRealm, 
  leaveRealm, 
  deleteRealm, 
  getRealm, 
  updateRealmSettings 
} from '../controllers/realmController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth verification to all realm routes
router.use(authenticateToken);

router.post('/create', createRealm);
router.post('/join', joinRealm);
router.post('/leave', leaveRealm);
router.patch('/update', updateRealmSettings);
router.delete('/delete', deleteRealm);
router.get('/:id', getRealm);

export default router;
