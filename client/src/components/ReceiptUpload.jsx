import React, { useState } from 'react';
import { Upload, FileText, Image, File, X, CheckCircle, Loader2, Save } from 'lucide-react';

const ReceiptUpload = ({ addReceiptTransaction, addMultipleTransactionsFromReceipt }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('idle');
    const [extractedTransactions, setExtractedTransactions] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    const API = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

    // Test file upload functionality
    const testFileUpload = async () => {
        try {
            const response = await fetch(`${API}/api/transactions/test-upload`);
            const result = await response.json();
            
            if (result.success) {
                alert('✅ File upload endpoint is working correctly!');
            } else {
                alert('❌ File upload endpoint test failed');
            }
        } catch (error) {
            console.error('File upload test error:', error);
            alert('❌ File upload test failed: ' + error.message);
        }
    };

    // Process receipt with Gemini AI
    const processReceiptWithGemini = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        setIsProcessing(true);
        setProcessingStep('processing');

        try {
            // First, upload the file to get a URL
            const formData = new FormData();
            formData.append('receipt', selectedFile);
            
            console.log('Uploading file:', selectedFile.name, selectedFile.size, selectedFile.type);
            
            // Upload file first
            const uploadResponse = await fetch(`${API}/api/transactions/upload-receipt`, {
                method: 'POST',
                body: formData
            });

            console.log('Upload response status:', uploadResponse.status);

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                console.error('Upload error response:', errorData);
                throw new Error(errorData.message || `Upload failed with status ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();
            console.log('Upload result:', uploadResult);
            
            const receiptUrl = uploadResult.receiptUrl;

            // Then process with Gemini AI
            const processResponse = await fetch(`${API}/api/transactions/process-receipt-gemini`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiptUrl: receiptUrl,
                    fileSize: selectedFile.size,
                    fileType: selectedFile.type
                })
            });

            if (!processResponse.ok) {
                const errorData = await processResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to process receipt with Gemini');
            }

            const result = await processResponse.json();
            
            if (result.success && result.extractedData) {
                const { transactions } = result.extractedData;
                const transformedTransactions = transactions.map((transaction, index) => ({
                    ...transaction,
                    id: index,
                    type: transaction.type || 'expense',
                    amount: transaction.amount || 0,
                    date: transaction.date || new Date().toISOString().split('T')[0],
                    category: transaction.category || 'Other',
                    text: transaction.text || `Transaction ${index + 1}`,
                    notes: transaction.notes || `Extracted by Gemini AI from ${selectedFile.name}`,
                    confidence: transaction.confidence || 0.90,
                    needsReview: transaction.needsReview || false,
                    extractedFields: {
                        merchant: transaction.extractedFields?.merchant || '',
                        location: transaction.extractedFields?.location || '',
                        time: transaction.extractedFields?.time || '',
                        tax: transaction.extractedFields?.tax || 0,
                        total: transaction.extractedFields?.total || transaction.amount || 0,
                        itemCount: transaction.extractedFields?.itemCount || 1,
                        paymentMethod: transaction.extractedFields?.paymentMethod || ''
                    }
                }));

                setExtractedTransactions(transformedTransactions);
                setProcessingStep('reviewing');
                alert(`✅ Gemini AI successfully extracted ${result.extractedData.transactionCount} transactions from your receipt!\n\nPlease review and edit the extracted data before saving.`);
            } else {
                throw new Error('Invalid response from Gemini AI service');
            }
        } catch (error) {
            console.error('Error processing receipt with Gemini:', error);
            alert(`❌ Error processing receipt: ${error.message}\n\nFalling back to mock data for testing.`);
            
            // Fallback to mock data
            processReceiptWithMockData();
        } finally {
            setIsProcessing(false);
        }
    };

    // Process receipt with mock data (for testing)
    const processReceiptWithMockData = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }

        setIsProcessing(true);
        setProcessingStep('processing');

        try {
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate mock data
            const mockTransactions = [
                {
                    id: 0,
                    type: 'expense',
                    amount: 1250.00,
                    date: new Date().toISOString().split('T')[0],
                    category: 'Food & Dining',
                    text: 'Grocery Store Purchase',
                    notes: `Mock data extracted from ${selectedFile.name}`,
                    confidence: 0.95,
                    needsReview: false,
                    extractedFields: {
                        merchant: 'Local Grocery Store',
                        location: 'Mumbai, India',
                        time: '14:30',
                        tax: 225.00,
                        total: 1250.00,
                        itemCount: 8,
                        paymentMethod: 'Credit Card'
                    }
                },
                {
                    id: 1,
                    type: 'expense',
                    amount: 450.00,
                    date: new Date().toISOString().split('T')[0],
                    category: 'Transportation',
                    text: 'Fuel Purchase',
                    notes: `Mock data extracted from ${selectedFile.name}`,
                    confidence: 0.88,
                    needsReview: true,
                    extractedFields: {
                        merchant: 'Petrol Pump',
                        location: 'Mumbai, India',
                        time: '16:45',
                        tax: 81.00,
                        total: 450.00,
                        itemCount: 1,
                        paymentMethod: 'Cash'
                    }
                }
            ];

            setExtractedTransactions(mockTransactions);
            setProcessingStep('reviewing');
            alert('✅ Mock data generated successfully!\n\nThis is test data. In production, this would be real data extracted by Gemini AI.');
        } catch (error) {
            console.error('Error processing with mock data:', error);
            alert('❌ Error generating mock data');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (file) => {
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid file type (JPEG, PNG, or PDF)');
                return;
            }
            if (file.size > 20 * 1024 * 1024) { // 20MB limit
                alert('File size must be less than 20MB');
                return;
            }
            setSelectedFile(file);
            setExtractedTransactions([]);
            setProcessingStep('idle');
        }
    };

    // Handle drag and drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // Save all extracted transactions
    const handleSaveAllTransactions = async () => {
        if (extractedTransactions.length === 0) {
            alert('No transactions to save');
            return;
        }

        try {
            await addMultipleTransactionsFromReceipt(extractedTransactions);
            setExtractedTransactions([]);
            setSelectedFile(null);
            setProcessingStep('idle');
            alert('✅ All transactions saved successfully!');
        } catch (error) {
            console.error('Error saving transactions:', error);
            alert('❌ Error saving transactions');
        }
    };

    // Save single transaction
    const handleSaveSingleTransaction = async (transaction) => {
        try {
            await addReceiptTransaction(transaction);
            setExtractedTransactions(prev => prev.filter(t => t.id !== transaction.id));
            alert('✅ Transaction saved successfully!');
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('❌ Error saving transaction');
        }
    };

    // Update extracted transaction
    const updateExtractedTransaction = (id, field, value) => {
        setExtractedTransactions(prev => 
            prev.map(t => t.id === id ? { ...t, [field]: value } : t)
        );
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <Image className="h-8 w-8" />;
        if (fileType === 'application/pdf') return <FileText className="h-8 w-8" />;
        return <File className="h-8 w-8" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-r from-green-500 to-green-600">
                    <Upload className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Upload Receipt</h2>
                <p className="text-gray-600 mt-2">Upload a receipt image or PDF to automatically extract transaction details</p>
            </div>

            {/* File Upload Area */}
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-green-400 transition-colors">
                <div
                    className={`text-center ${dragActive ? 'border-green-400 bg-green-50' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {!selectedFile ? (
                        <div className="space-y-4">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-gray-900">Drop your receipt here</p>
                                <p className="text-gray-500">or click to browse</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileSelect(e.target.files[0])}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                            >
                                Choose File
                            </label>
                            <p className="text-xs text-gray-500">
                                Supports JPEG, PNG, and PDF files up to 20MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center space-x-3">
                                {getFileIcon(selectedFile.type)}
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setExtractedTransactions([]);
                                        setProcessingStep('idle');
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Processing Options */}
            {selectedFile && processingStep === 'idle' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Options</h3>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={processReceiptWithGemini}
                            disabled={isProcessing}
                            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    🤖 Extract with Gemini AI
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={processReceiptWithMockData}
                            disabled={isProcessing}
                            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🧪 Use Mock Data (Testing)
                        </button>

                        <button
                            onClick={testFileUpload}
                            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            📁 Test File Upload
                        </button>
                    </div>
                </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <div>
                            <p className="font-medium text-gray-900">
                                {processingStep === 'processing' ? 'Processing receipt...' : 'Processing complete!'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {processingStep === 'processing' 
                                    ? 'Extracting transaction data with Gemini AI' 
                                    : 'Review the extracted data below'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Extracted Transactions Review */}
            {extractedTransactions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Extracted Transactions ({extractedTransactions.length})
                        </h3>
                        <button
                            onClick={handleSaveAllTransactions}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {extractedTransactions.map((transaction) => (
                            <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">Transaction {transaction.id + 1}</h4>
                                            <p className="text-sm text-gray-500">
                                                Confidence: {(transaction.confidence * 100).toFixed(1)}%
                                                {transaction.needsReview && (
                                                    <span className="ml-2 text-orange-600">• Needs Review</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSaveSingleTransaction(transaction)}
                                        className="text-green-600 hover:text-green-700"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={transaction.text}
                                            onChange={(e) => updateExtractedTransaction(transaction.id, 'text', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={transaction.amount}
                                            onChange={(e) => updateExtractedTransaction(transaction.id, 'amount', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            value={transaction.category}
                                            onChange={(e) => updateExtractedTransaction(transaction.id, 'category', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="Food & Dining">Food & Dining</option>
                                            <option value="Transportation">Transportation</option>
                                            <option value="Housing">Housing</option>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Healthcare">Healthcare</option>
                                            <option value="Entertainment">Entertainment</option>
                                            <option value="Shopping">Shopping</option>
                                            <option value="Education">Education</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Insurance">Insurance</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={transaction.date}
                                            onChange={(e) => updateExtractedTransaction(transaction.id, 'date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={transaction.notes}
                                            onChange={(e) => updateExtractedTransaction(transaction.id, 'notes', e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Extracted Fields */}
                                {transaction.extractedFields && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Extracted Details</h5>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            <div><span className="font-medium">Merchant:</span> {transaction.extractedFields.merchant}</div>
                                            <div><span className="font-medium">Location:</span> {transaction.extractedFields.location}</div>
                                            <div><span className="font-medium">Time:</span> {transaction.extractedFields.time}</div>
                                            <div><span className="font-medium">Payment:</span> {transaction.extractedFields.paymentMethod}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Tips for Best Results</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure the receipt is clearly visible and well-lit</li>
                    <li>• Gemini AI works with both images and PDF files</li>
                    <li>• Review extracted data before saving for accuracy</li>
                    <li>• You can edit any field before saving the transaction</li>
                </ul>
            </div>
        </div>
    );
};

export default ReceiptUpload;