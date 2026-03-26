const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Middleware for logging requests
const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', req.body);
    }
    next();
};

// Apply logging middleware to all routes
router.use(requestLogger);

// GET /api/transactions - Get all transactions
router.get('/', transactionController.getTransactions);

// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', transactionController.getTransactionStats);

// GET /api/transactions/categories - Get all available categories
router.get('/categories', transactionController.getCategories);

// GET /api/transactions/test-upload - Test file upload functionality
router.get('/test-upload', transactionController.testFileUpload);

// POST /api/transactions - Add a new transaction
router.post('/', transactionController.addTransaction);

// POST /api/transactions/filtered - Get filtered transactions
router.post('/filtered', transactionController.getFilteredTransactions);

// POST /api/transactions/receipt - Add transaction from receipt (OCR)
router.post('/receipt', transactionController.addTransactionFromReceipt);

// POST /api/transactions/receipt/batch - Add multiple transactions from receipt (batch processing)
router.post('/receipt/batch', transactionController.addMultipleTransactionsFromReceipt);

// POST /api/transactions/process-receipt - Process receipt with OCR
router.post('/process-receipt', transactionController.processReceipt);

// POST /api/transactions/process-receipt-gemini - Process receipt with Gemini AI
router.post('/process-receipt-gemini', transactionController.processReceiptWithGemini);

// POST /api/transactions/upload-receipt - Upload receipt file
router.post('/upload-receipt', transactionController.uploadReceipt);

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', transactionController.deleteTransaction);

// Error handling middleware for this router
router.use((error, req, res, next) => {
    console.error('Transaction route error:', error.message);
    res.status(500).json({
        error: 'Transaction operation failed',
        message: error.message,
        path: req.originalUrl
    });
});

module.exports = router;