const express = require('express');
const router = express.Router();
const khata = require('../controllers/khataController');
const { ensureAuthenticated, requireAuth } = require('../middlewares/AuthMiddleware');

// All khata routes require authentication
router.use(ensureAuthenticated);
router.use(requireAuth);

router.get('/',                             khata.getParties);
router.post('/',                            khata.createParty);
router.get('/:id',                          khata.getParty);
router.put('/:id',                          khata.updateParty);
router.delete('/:id',                       khata.deleteParty);
router.post('/:id/entries',                 khata.uploadMiddleware, khata.addEntry);
router.delete('/:id/entries/:entryId',      khata.deleteEntry);

module.exports = router;
