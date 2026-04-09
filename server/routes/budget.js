const express = require('express');
const router = express.Router();
const budget = require('../controllers/budgetController');

router.get('/', budget.getBudgets);
router.post('/', budget.setBudget);
router.delete('/:id', budget.deleteBudget);

module.exports = router;
