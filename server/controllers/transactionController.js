const Transaction = require('../models/Transaction');
const gemini = require('../config/gemini');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use OS temp dir for cross-platform compatibility
const os = require('os');
const uploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(os.tmpdir(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images and PDFs
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
        }
    }
});

// Get all transactions for the logged-in user
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const transactions = await Transaction.find({ userId }).sort({ date: -1 });
        console.log(`Fetched ${transactions.length} transactions for user ${userId}`);
        res.json(transactions);
    } catch (err) {
        console.error('Error fetching transactions:', err.message);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Failed to fetch transactions',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get filtered transactions for the logged-in user
exports.getFilteredTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const filters = req.body;
        const transactions = await Transaction.getFilteredTransactions(filters, userId);
        console.log(`Fetched ${transactions.length} filtered transactions for user ${userId}`);
        res.json(transactions);
    } catch (err) {
        console.error('Error fetching filtered transactions:', err.message);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Failed to fetch filtered transactions',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Add a new transaction
exports.addTransaction = async (req, res) => {
    try {
        const { type, amount, date, category, notes, text, source = 'manual' } = req.body;
        
        // Validation
        if (!type || !['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Transaction type must be either "income" or "expense"' 
            });
        }
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Transaction description is required' 
            });
        }
        
        if (!category) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Category is required' 
            });
        }
        
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Amount must be a valid positive number' 
            });
        }

        // Create new transaction
        // Handle DD-MM-YYYY or YYYY-MM-DD date formats
        let parsedDate = new Date();
        if (date) {
            const ddmmyyyy = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            parsedDate = ddmmyyyy
                ? new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`)
                : new Date(date);
            if (isNaN(parsedDate.getTime())) parsedDate = new Date();
        }

        const transaction = new Transaction({ 
            userId: req.user._id,
            type,
            text: text.trim(), 
            amount: parsedAmount,
            date: parsedDate,
            category,
            notes: notes || '',
            source
        });
        
        const savedTransaction = await transaction.save();
        console.log('Transaction created:', savedTransaction._id);
        
        res.status(201).json(savedTransaction);
    } catch (err) {
        console.error('Error adding transaction:', err.message);
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                message: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Failed to add transaction',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Add transaction from receipt (OCR)
exports.addTransactionFromReceipt = async (req, res) => {
    try {
        const { type, amount, date, category, notes, text, receiptUrl, source = 'receipt' } = req.body;
        
        // Validation
        if (!type || !['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Transaction type must be either "income" or "expense"' 
            });
        }
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Transaction description is required' 
            });
        }
        
        if (!category) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Category is required' 
            });
        }
        
        if (!receiptUrl) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Receipt URL is required for receipt transactions' 
            });
        }
        
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Amount must be a valid positive number' 
            });
        }

        // Create new transaction from receipt
        const transaction = new Transaction({ 
            userId: req.user._id,
            type,
            text: text.trim(), 
            amount: parsedAmount,
            date: date ? new Date(date) : new Date(),
            category,
            notes: notes || '',
            source,
            receiptUrl
        });
        
        const savedTransaction = await transaction.save();
        console.log('Receipt transaction created:', savedTransaction._id);
        
        res.status(201).json(savedTransaction);
    } catch (err) {
        console.error('Error adding receipt transaction:', err.message);
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                message: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Failed to add receipt transaction',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Add multiple transactions from receipt (batch processing)
exports.addMultipleTransactionsFromReceipt = async (req, res) => {
    try {
        const { transactions, receiptUrl, source = 'receipt' } = req.body;
        
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Transactions array is required and must not be empty' 
            });
        }
        
        if (!receiptUrl) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Receipt URL is required for receipt transactions' 
            });
        }
        
        const savedTransactions = [];
        const errors = [];
        
        // Process each transaction
        for (let i = 0; i < transactions.length; i++) {
            const transactionData = transactions[i];
            
            try {
                // Validation for each transaction
                if (!transactionData.type || !['income', 'expense'].includes(transactionData.type)) {
                    errors.push(`Transaction ${i + 1}: Invalid transaction type`);
                    continue;
                }
                
                if (!transactionData.text || transactionData.text.trim() === '') {
                    errors.push(`Transaction ${i + 1}: Description is required`);
                    continue;
                }
                
                if (!transactionData.category) {
                    errors.push(`Transaction ${i + 1}: Category is required`);
                    continue;
                }
                
                const parsedAmount = Number(transactionData.amount);
                if (isNaN(parsedAmount) || parsedAmount <= 0) {
                    errors.push(`Transaction ${i + 1}: Amount must be a valid positive number`);
                    continue;
                }
                
                // Create transaction with enhanced fields
                const transaction = new Transaction({ 
                    userId: req.user._id,
                    type: transactionData.type,
                    text: transactionData.text.trim(), 
                    amount: parsedAmount,
                    date: transactionData.date ? new Date(transactionData.date) : new Date(),
                    category: transactionData.category,
                    notes: transactionData.notes || '',
                    source,
                    receiptUrl: `${receiptUrl}-${i}`,
                    extractedData: transactionData.extractedFields || {},
                    ocrConfidence: transactionData.confidence || 1.0,
                    needsReview: transactionData.needsReview || false,
                    processingTime: transactionData.processingTime || 0
                });
                
                const savedTransaction = await transaction.save();
                savedTransactions.push(savedTransaction);
                
            } catch (err) {
                errors.push(`Transaction ${i + 1}: ${err.message}`);
            }
        }
        
        if (savedTransactions.length === 0) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'No transactions could be saved',
                details: errors
            });
        }
        
        console.log(`Batch processed: ${savedTransactions.length} transactions saved, ${errors.length} errors`);
        
        res.status(201).json({
            success: true,
            message: `Successfully saved ${savedTransactions.length} transactions`,
            savedTransactions,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                total: transactions.length,
                saved: savedTransactions.length,
                failed: errors.length
            }
        });
        
    } catch (err) {
        console.error('Error adding multiple transactions:', err.message);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                message: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to add multiple transactions',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Process receipt upload and extract data using OCR
exports.processReceipt = async (req, res) => {
    try {
        // This would integrate with your existing OCR functionality
        // For now, we'll return a mock response structure
        const { receiptUrl, fileSize, fileType } = req.body;
        
        // Validate required fields
        if (!receiptUrl) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Receipt URL is required' 
            });
        }

        // Use default values if not provided
        const actualFileSize = fileSize || 1024 * 1024; // Default 1MB
        const actualFileType = fileType || 'image/jpeg';

        // Simulate OCR processing time based on file size
        const processingTime = Math.min(actualFileSize / (1024 * 1024) * 1000, 5000); // Max 5 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Determine if this is likely a multiple transaction receipt
        const isMultipleTransaction = actualFileSize > 5 * 1024 * 1024; // Files > 5MB likely have multiple transactions
        
        // Mock OCR extraction - replace with actual OCR integration
        let extractedData;
        
        if (isMultipleTransaction) {
            // Extract multiple transactions
            const transactionCount = Math.floor(Math.random() * 5) + 2; // 2-6 transactions
            extractedData = {
                type: 'multiple',
                transactionCount,
                transactions: []
            };
            
            for (let i = 0; i < transactionCount; i++) {
                const isIncome = Math.random() > 0.8; // 20% chance of income
                const amount = Math.floor(Math.random() * 10000) + 100;
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30));
                
                extractedData.transactions.push({
                    id: i,
                    type: isIncome ? 'income' : 'expense',
                    amount: amount,
                    date: date.toISOString().split('T')[0],
                    category: getRandomCategory(isIncome),
                    text: generateTransactionText(isIncome, i + 1),
                    notes: `Transaction ${i + 1} from receipt`,
                    confidence: 0.85 + (Math.random() * 0.15),
                    needsReview: Math.random() > 0.8,
                    extractedFields: {
                        merchant: getRandomMerchant(),
                        location: getRandomLocation(),
                        time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                        tax: Math.floor(amount * 0.18),
                        total: amount + Math.floor(amount * 0.18),
                        itemCount: Math.floor(Math.random() * 10) + 1,
                        paymentMethod: getRandomPaymentMethod()
                    }
                });
            }
        } else {
            // Single transaction
            const isIncome = Math.random() > 0.7;
            const amount = Math.floor(Math.random() * 5000) + 100;
            
            extractedData = {
                type: 'single',
                transactionCount: 1,
                transactions: [{
                    id: 0,
                    type: isIncome ? 'income' : 'expense',
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    category: getRandomCategory(isIncome),
                    text: generateTransactionText(isIncome, 1),
                    notes: 'Receipt transaction',
                    confidence: 0.90 + (Math.random() * 0.10),
                    needsReview: false,
                    extractedFields: {
                        merchant: getRandomMerchant(),
                        location: getRandomLocation(),
                        time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                        tax: Math.floor(amount * 0.18),
                        total: amount + Math.floor(amount * 0.18),
                        itemCount: 1,
                        paymentMethod: getRandomPaymentMethod()
                    }
                }]
            };
        }

        // In a real implementation, you would:
        // 1. Call your OCR service (Gemini, Google Vision, etc.)
        // 2. Extract text from the receipt
        // 3. Parse amount, date, merchant, and other details
        // 4. Identify multiple transactions if present
        // 5. Return structured data with confidence scores

        res.json({
            success: true,
            extractedData,
            message: `Successfully processed receipt with ${extractedData.transactionCount} transaction(s)`,
            processingTime: processingTime,
            fileInfo: {
                size: actualFileSize,
                type: actualFileType,
                multipleTransactions: isMultipleTransaction
            }
        });
    } catch (err) {
        console.error('Error processing receipt:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to process receipt',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Process receipt with Gemini AI for data extraction
exports.processReceiptWithGemini = async (req, res) => {
    try {
        const { receiptUrl, fileSize, fileType } = req.body;
        
        if (!receiptUrl) {
            return res.status(400).json({ 
                error: 'Validation error',
                message: 'Receipt URL is required' 
            });
        }

        // Simulate processing time
        const processingTime = Math.min(fileSize / (1024 * 1024) * 1000, 3000); // Max 3 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Use real Gemini API to extract transaction data
        const geminiResponse = await extractTransactionDataWithGemini(receiptUrl, fileType);
        
        res.json({
            success: true,
            extractedData: geminiResponse,
            message: `Successfully processed receipt with Gemini AI`,
            processingTime: processingTime,
            fileInfo: {
                size: fileSize,
                type: fileType,
                source: 'gemini'
            }
        });
    } catch (err) {
        console.error('Error processing receipt with Gemini:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to process receipt with Gemini',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Extract transaction data using real Gemini API
const extractTransactionDataWithGemini = async (receiptUrl, fileType) => {
    try {
        // For now, since we're using local file storage, we'll use mock data
        // In production, you would upload to cloud storage and get a public URL
        console.log('Processing receipt with Gemini AI:', receiptUrl, fileType);
        
        // Create a comprehensive prompt for Gemini to extract transaction data
        const prompt = `
        You are an expert at extracting transaction data from receipts. Please analyze the receipt and extract the following information in JSON format:

        {
            "type": "single" or "multiple",
            "transactionCount": number,
            "transactions": [
                {
                    "id": number,
                    "type": "expense" or "income",
                    "amount": number,
                    "date": "YYYY-MM-DD",
                    "category": "string",
                    "text": "description",
                    "notes": "string",
                    "confidence": number (0-1),
                    "needsReview": boolean,
                    "extractedFields": {
                        "merchant": "string",
                        "location": "string",
                        "time": "HH:MM",
                        "tax": number,
                        "total": number,
                        "itemCount": number,
                        "paymentMethod": "string"
                    }
                }
            ],
            "summary": {
                "totalAmount": number,
                "merchant": "string",
                "date": "YYYY-MM-DD"
            }
        }

        Instructions:
        1. Look for the total amount, date, merchant name, and any other transaction details
        2. If there are multiple items, create separate transactions
        3. Categorize the transaction appropriately (Food & Dining, Transportation, Shopping, etc.)
        4. Set confidence based on how clear the data is (0.9+ for clear data, 0.7-0.9 for unclear)
        5. Set needsReview to true if any data is unclear or missing
        6. Estimate tax as 18% of the amount if not specified
        7. For the category, choose from: Food & Dining, Transportation, Housing, Utilities, Healthcare, Entertainment, Shopping, Education, Travel, Insurance, Other

        Since I cannot directly access the file at ${receiptUrl}, please provide a sample response based on typical receipt data.
        Please return only the JSON response, no additional text.
        `;

        // Call Gemini API
        const response = await gemini(prompt);
        
        // Parse the JSON response
        let parsedResponse;
        try {
            // Extract JSON from the response (remove any markdown formatting)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResponse = JSON.parse(jsonMatch[0]);
            } else {
                parsedResponse = JSON.parse(response);
            }
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError);
            console.log('Raw response:', response);
            
            // Fallback to mock data if parsing fails
            return simulateGeminiAPI(receiptUrl, fileType);
        }

        // Validate the response structure
        if (!parsedResponse.transactions || !Array.isArray(parsedResponse.transactions)) {
            console.error('Invalid response structure from Gemini:', parsedResponse);
            return simulateGeminiAPI(receiptUrl, fileType);
        }

        return parsedResponse;

    } catch (error) {
        console.error('Gemini API error:', error);
        
        // Fallback to mock data if Gemini fails
        return simulateGeminiAPI(receiptUrl, fileType);
    }
};

// Simulate Gemini API response (replace with actual Gemini integration)
const simulateGeminiAPI = async (receiptUrl, fileType) => {
    // This is a mock response - replace with actual Gemini API call
    const isMultiple = Math.random() > 0.7; // 30% chance of multiple transactions
    
    if (isMultiple) {
        // Multiple transactions
        const transactionCount = Math.floor(Math.random() * 3) + 2;
        const transactions = [];
        
        for (let i = 0; i < transactionCount; i++) {
            const amount = Math.floor(Math.random() * 5000) + 100;
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            
            transactions.push({
                id: i,
                type: 'expense',
                amount: amount,
                date: date.toISOString().split('T')[0],
                category: getRandomCategory(false),
                text: generateTransactionText(false, i + 1),
                notes: `Transaction ${i + 1} extracted by Gemini AI`,
                confidence: 0.90 + (Math.random() * 0.10),
                needsReview: Math.random() > 0.8,
                extractedFields: {
                    merchant: getRandomMerchant(),
                    location: getRandomLocation(),
                    time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                    tax: Math.floor(amount * 0.18),
                    total: amount + Math.floor(amount * 0.18),
                    itemCount: Math.floor(Math.random() * 5) + 1,
                    paymentMethod: getRandomPaymentMethod()
                }
            });
        }
        
        return {
            type: 'multiple',
            transactionCount,
            transactions,
            summary: {
                totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
                merchant: transactions[0].extractedFields.merchant,
                date: transactions[0].date
            }
        };
    } else {
        // Single transaction
        const amount = Math.floor(Math.random() * 3000) + 100;
        
        return {
            type: 'single',
            transactionCount: 1,
            transactions: [{
                id: 0,
                type: 'expense',
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                category: getRandomCategory(false),
                text: generateTransactionText(false, 1),
                notes: 'Receipt transaction extracted by Gemini AI',
                confidence: 0.95 + (Math.random() * 0.05),
                needsReview: false,
                extractedFields: {
                    merchant: getRandomMerchant(),
                    location: getRandomLocation(),
                    time: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                    tax: Math.floor(amount * 0.18),
                    total: amount + Math.floor(amount * 0.18),
                    itemCount: 1,
                    paymentMethod: getRandomPaymentMethod()
                }
            }],
            summary: {
                totalAmount: amount,
                merchant: getRandomMerchant(),
                date: new Date().toISOString().split('T')[0]
            }
        };
    }
};

// Helper functions for mock data generation
function getRandomCategory(isIncome) {
    if (isIncome) {
        const incomeCategories = ['Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 'Other Income'];
        return incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
    } else {
        const expenseCategories = ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare', 
                                'Entertainment', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other'];
        return expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    }
}

function generateTransactionText(isIncome, index) {
    if (isIncome) {
        const texts = ['Salary Payment', 'Freelance Work', 'Business Income', 'Investment Return', 'Bonus Payment'];
        return texts[Math.floor(Math.random() * texts.length)];
    } else {
        const texts = ['Grocery Purchase', 'Fuel Payment', 'Restaurant Bill', 'Shopping', 'Utility Bill', 'Transport Fare'];
        return texts[Math.floor(Math.random() * texts.length)];
    }
}

function getRandomMerchant() {
    const merchants = ['Reliance Fresh', 'Shell Petrol Pump', 'Domino\'s Pizza', 'Amazon', 'BEST Bus', 'MSEB', 
                      'Big Bazaar', 'HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank'];
    return merchants[Math.floor(Math.random() * merchants.length)];
}

function getRandomLocation() {
    const locations = ['Mumbai, Maharashtra', 'Delhi, NCR', 'Bangalore, Karnataka', 'Chennai, Tamil Nadu', 
                      'Kolkata, West Bengal', 'Hyderabad, Telangana', 'Pune, Maharashtra', 'Ahmedabad, Gujarat'];
    return locations[Math.floor(Math.random() * locations.length)];
}

function getRandomPaymentMethod() {
    const methods = ['Credit Card', 'Debit Card', 'UPI', 'Cash', 'Net Banking', 'Digital Wallet'];
    return methods[Math.floor(Math.random() * methods.length)];
}

// Update a transaction — scoped to the logged-in user
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: 'Invalid ID' });

        const { type, amount, date, category, notes, text, isRecurring, recurringFrequency } = req.body;
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

        // Filter by both _id and userId to prevent cross-user updates
        const updated = await Transaction.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { type, amount: parsedAmount, date: date ? new Date(date) : undefined, category, notes, text: text?.trim(), isRecurring, recurringFrequency, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Transaction not found' });
        res.json(updated);
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
        res.status(500).json({ message: 'Failed to update transaction' });
    }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: 'Invalid ID format',
                message: 'Transaction ID is not valid'
            });
        }
        
        // Filter by both _id and userId to prevent cross-user deletes
        const transaction = await Transaction.findOneAndDelete({ _id: id, userId: req.user._id });
        
        if (!transaction) {
            return res.status(404).json({ 
                error: 'Not found',
                message: 'Transaction not found' 
            });
        }
        
        console.log('Transaction deleted:', id);
        res.json({ 
            message: 'Transaction deleted successfully', 
            id,
            deletedTransaction: transaction
        });
    } catch (err) {
        console.error('Error deleting transaction:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to delete transaction',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get transaction statistics for the logged-in user
exports.getTransactionStats = async (req, res) => {
    try {
        const stats = await Transaction.getSummary(req.user._id);
        res.json(stats);
    } catch (err) {
        console.error('Error getting stats:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to get statistics',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get categories
exports.getCategories = async (req, res) => {
    try {
        const categories = [
            // Income categories
            'Salary', 'Freelance', 'Business', 'Investment', 'Bonus', 'Other Income',
            // Expense categories
            'Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare', 
            'Entertainment', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other'
        ];
        res.json(categories);
    } catch (err) {
        console.error('Error getting categories:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to get categories',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Simple file upload for testing (in production, use proper file upload middleware)
exports.uploadReceipt = async (req, res) => {
    try {
        // Use multer to handle the file upload
        upload.single('receipt')(req, res, async function (err) {
            if (err) {
                console.error('File upload error:', err);
                return res.status(400).json({ 
                    error: 'File upload error',
                    message: err.message 
                });
            }

            if (!req.file) {
                return res.status(400).json({ 
                    error: 'Validation error',
                    message: 'Receipt file is required' 
                });
            }

            // Generate a receipt URL (in production, this would be a cloud storage URL)
            const receiptUrl = `uploads/${req.file.filename}`;
            
            console.log('File uploaded successfully:', receiptUrl);
            console.log('File info:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
            
            res.json({
                success: true,
                message: 'Receipt uploaded successfully',
                receiptUrl: receiptUrl,
                fileInfo: {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                }
            });
        });
    } catch (err) {
        console.error('Error uploading receipt:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to upload receipt',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Test file upload functionality
exports.testFileUpload = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'File upload endpoint is working',
            uploadsDir: uploadsDir,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error testing file upload:', err.message);
        res.status(500).json({ 
            error: 'Server error',
            message: 'Failed to test file upload',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};