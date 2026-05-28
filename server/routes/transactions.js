const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { ensureAuthenticated, requireAuth } = require('../middlewares/AuthMiddleware');

// Apply auth middleware to all transaction routes
router.use(ensureAuthenticated);
router.use(requireAuth);

// Logging middleware
router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} [user: ${req.user._id}]`);
    next();
});

router.get('/',                         transactionController.getTransactions);
router.get('/stats',                    transactionController.getTransactionStats);
router.get('/categories',               transactionController.getCategories);
router.get('/test-upload',              transactionController.testFileUpload);
router.post('/',                        transactionController.addTransaction);
router.post('/filtered',                transactionController.getFilteredTransactions);
router.post('/receipt',                 transactionController.addTransactionFromReceipt);
router.post('/receipt/batch',           transactionController.addMultipleTransactionsFromReceipt);
router.post('/process-receipt',         transactionController.processReceipt);
router.post('/process-receipt-gemini',  transactionController.processReceiptWithGemini);
router.post('/upload-receipt',          transactionController.uploadReceipt);
router.put('/:id',                      transactionController.updateTransaction);
router.delete('/:id',                   transactionController.deleteTransaction);

router.use((error, req, res, next) => {
    console.error('Transaction route error:', error.message);
    res.status(500).json({ error: 'Transaction operation failed', message: error.message });
});

module.exports = router;
