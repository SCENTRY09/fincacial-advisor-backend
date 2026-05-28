const express = require('express');
const router = express.Router();
const budget = require('../controllers/budgetController');
const { ensureAuthenticated, requireAuth } = require('../middlewares/AuthMiddleware');

// All budget routes require authentication
router.use(ensureAuthenticated);
router.use(requireAuth);

router.get('/',     budget.getBudgets);
router.post('/',    budget.setBudget);
router.delete('/:id', budget.deleteBudget);

module.exports = router;
