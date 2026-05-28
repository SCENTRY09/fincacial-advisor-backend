// OCR Controller: Handles file upload, OCR, and LLM-based financial extraction.
// - Uses Tesseract.js for free OCR functionality.
// - Supports both images and PDF files.
// - Uses OpenAI v4 for LLM-based financial data extraction (optional).
// - Modular, secure, and ready for extension.
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const gemini = require('../config/gemini');

// Initialize Gemini client
let geminiClient = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = gemini;
    console.log('✅ Gemini API configured successfully');
  } else {
    console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini client:', error.message);
  geminiClient = null;
}

/**
 * Check if file is an image based on MIME type
 * @param {string} mimetype
 * @returns {boolean}
 */
function isImageFile(mimetype) {
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  return imageMimeTypes.includes(mimetype);
}

/**
 * Check if file is a PDF based on MIME type
 * @param {string} mimetype
 * @returns {boolean}
 */
function isPdfFile(mimetype) {
  return mimetype === 'application/pdf';
}

/**
 * Extract text from PDF using pdf-parse
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(filePath) {
  try {
    console.log('Extracting text from PDF...');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    console.log('PDF text extraction completed');
    return data.text;
  } catch (err) {
    console.error('PDF extraction error:', err);
    throw new Error('PDF text extraction failed: ' + err.message);
  }
}

/**
 * Extract financial keywords from text
 * @param {string} text
 * @returns {string[]}
 */
function extractFinancialKeywords(text) {
  const financialKeywords = [
    // Basic financial terms
    'account', 'balance', 'amount', 'total', 'payment', 'invoice', 'receipt',
    'bank', 'credit', 'debit', 'deposit', 'withdrawal', 'transaction',
    'date', 'time', 'reference', 'number', 'id', 'customer', 'client',
    
    // Document types
    'statement', 'bill', 'check', 'draft', 'note', 'certificate',
    
    // Financial operations
    'fee', 'charge', 'interest', 'loan', 'mortgage', 'tax',
    'income', 'expense', 'revenue', 'profit', 'loss', 'budget', 'investment',
    'savings', 'checking', 'credit card', 'debit card', 'cash',
    
    // Transaction types
    'transfer', 'purchase', 'sale', 'refund', 'credit', 'debit',
    'deposit', 'withdrawal', 'payment', 'receipt', 'disbursement',
    
    // Account information
    'account holder', 'account number', 'routing number', 'swift code',
    'iban', 'account type', 'account status', 'account balance',
    
    // Financial institutions
    'bank', 'credit union', 'financial institution', 'lender', 'broker',
    'investment firm', 'insurance company', 'credit card company',
    
    // Time and dates
    'due date', 'maturity date', 'issue date', 'effective date',
    'transaction date', 'posting date', 'clearing date',
    
    // Amounts and calculations
    'principal', 'rate', 'term', 'maturity', 'amortization',
    'interest rate', 'annual percentage rate', 'apr', 'finance charge',
    
    // Tax and legal
    'tax', 'deduction', 'exemption', 'credit', 'liability', 'asset',
    'taxable', 'non-taxable', 'tax exempt', 'tax deductible',
    
    // Investment terms
    'portfolio', 'dividend', 'capital gain', 'capital loss',
    'market value', 'book value', 'face value', 'par value',
    
    // Loan terms
    'principal', 'interest', 'payment', 'installment', 'balloon',
    'prepayment', 'late fee', 'penalty', 'default', 'foreclosure'
  ];
  
  const foundKeywords = financialKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return foundKeywords.slice(0, 20); // Return first 20 keywords
}

/**
 * Extract potential amounts from text
 * @param {string} text
 * @returns {string[]}
 */
function extractAmounts(text) {
  // Multiple regex patterns for different amount formats
  const amountPatterns = [
    // Currency with symbols
    /[\$€£¥₹]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
    // Negative amounts
    /-[\$€£¥₹]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
    // Amounts in parentheses (negative)
    /\([\$€£¥₹]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?\)/g,
    // Percentages
    /\d+(?:\.\d+)?%/g,
    // Large numbers without currency
    /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
    // Decimal numbers
    /\b\d+\.\d{2}\b/g
  ];
  
  let allAmounts = [];
  
  amountPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    allAmounts = allAmounts.concat(matches);
  });
  
  // Remove duplicates and sort
  const uniqueAmounts = [...new Set(allAmounts)];
  return uniqueAmounts.slice(0, 15); // Return first 15 amounts
}

/**
 * Extract dates from text
 * @param {string} text
 * @returns {string[]}
 */
function extractDates(text) {
  // Multiple date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    // YYYY-MM-DD
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    // DD/MM/YYYY
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g,
    // Month names
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    // Abbreviated months
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
    // MM/DD/YY
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}\b/g
  ];
  
  let allDates = [];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    allDates = allDates.concat(matches);
  });
  
  // Remove duplicates and sort
  const uniqueDates = [...new Set(allDates)];
  return uniqueDates.slice(0, 10); // Return first 10 dates
}

/**
 * Run OCR on the uploaded file using Tesseract.js (free).
 * @param {string} filePath
 * @param {string} mimetype
 * @returns {Promise<string>} Extracted text
 */
async function runOCR(filePath, mimetype) {
  try {
    console.log('Starting OCR with Tesseract.js...');
    console.log('File path:', filePath);
    console.log('MIME type:', mimetype);
    console.log('Is image file:', isImageFile(mimetype));
    console.log('Is PDF file:', isPdfFile(mimetype));
    
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found or not accessible');
    }
    
    // Handle PDF files
    if (isPdfFile(mimetype)) {
      console.log('Processing PDF file...');
      const text = await extractTextFromPDF(filePath);
      if (!text || text.trim() === '') {
        throw new Error('No text could be extracted from the PDF');
      }
      return text;
    }
    
    // Handle image files
    if (isImageFile(mimetype)) {
      console.log('Processing image file...');
      
      // Try multiple OCR configurations for better results
      const ocrConfigs = [
        {
          name: 'Standard OCR',
          options: {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        },
        {
          name: 'Enhanced OCR',
          options: {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`Enhanced OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$€£¥₹()[]{}:;@#$%&*!?-_+=/\\|<>"\'',
            preserve_interword_spaces: '1',
            tessedit_pageseg_mode: '6',
            tessedit_ocr_engine_mode: '3'
          }
        },
        {
          name: 'Sparse Text OCR',
          options: {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`Sparse OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
            tessedit_pageseg_mode: '6',
            tessedit_ocr_engine_mode: '3',
            textord_heavy_nr: '1',
            textord_min_linesize: '2.5'
          }
        }
      ];
      
      let extractedText = '';
      
      // Try each OCR configuration until we get text
      for (const config of ocrConfigs) {
        try {
          console.log(`Trying ${config.name}...`);
          
          // Add timeout protection for Tesseract (120 seconds max)
          const ocrTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${config.name} timeout after 120 seconds`)), 120000)
          );
          
          const ocrPromise = Tesseract.recognize(filePath, 'eng', config.options);
          const result = await Promise.race([ocrPromise, ocrTimeoutPromise]);
          
          extractedText = result.data.text;
          
          console.log(`${config.name} completed. Text length: ${extractedText.length}`);
          
          if (extractedText && extractedText.trim() !== '') {
            console.log(`✅ Success with ${config.name}`);
            break;
          } else {
            console.log(`⚠️ ${config.name} returned empty text, trying next...`);
          }
        } catch (error) {
          console.log(`❌ ${config.name} failed:`, error.message);
          continue;
        }
      }
      
      if (!extractedText || extractedText.trim() === '') {
        console.log('❌ All OCR configurations failed to extract text');
        throw new Error('No text was extracted from the image. Please try with a clearer document with printed text.');
      }
      
      console.log('OCR completed successfully');
      console.log(`Extracted text length: ${extractedText.length} characters`);
      console.log(`First 100 characters: ${extractedText.substring(0, 100)}...`);
      
      return extractedText;
    }
    
    // If neither image nor PDF, throw error
    throw new Error('File must be an image (JPG, PNG, GIF, BMP, WEBP) or PDF. Other formats are not supported for OCR.');
    
  } catch (err) {
    console.error('OCR Error:', err);
    throw new Error('OCR failed: ' + err.message);
  }
}

/**
 * Run LLM to extract financial data from OCR text.
 * @param {string} ocrText
 * @returns {Promise<{json: object, summary: string}>}
 */
const runFinancialExtraction = async (ocrText) => {
  try {
    if (!geminiClient) {
      console.warn('⚠️ Gemini client not initialized, providing basic analysis');
      return {
        documentType: 'Financial Document',
        wordCount: ocrText.split(/\s+/).length,
        characterCount: ocrText.length,
        confidence: 'Basic Analysis',
        extractedText: ocrText,
        analysis: {
          financialKeywords: extractFinancialKeywords(ocrText),
          potentialAmounts: extractAmounts(ocrText),
          dates: extractDates(ocrText),
          lineCount: ocrText.split('\n').length,
          summary: 'AI analysis not available. Using basic extraction.'
        }
      };
    }

    const prompt = `
    You are an expert financial document analyzer with advanced OCR capabilities. Your task is to analyze the provided financial document text and extract comprehensive structured data.

    CRITICAL INSTRUCTIONS:
    1. Analyze the text thoroughly and identify ALL financial information
    2. Extract EVERY number, date, and financial term you can find
    3. Be extremely thorough - don't miss any details
    4. Return ONLY a valid JSON object - no additional text or explanations
    5. If the text is unclear or incomplete, extract what you can and note the limitations

    REQUIRED JSON STRUCTURE:
    {
      "documentType": "string (e.g., 'Bank Statement', 'Invoice', 'Receipt', 'Tax Document', 'Credit Card Statement', 'Investment Statement', 'Loan Document')",
      "wordCount": number,
      "characterCount": number,
      "confidence": "string (High/Medium/Low based on text clarity)",
      "extractedText": "string (the original OCR text)",
      "analysis": {
        "financialKeywords": ["array of ALL financial terms found - be comprehensive"],
        "potentialAmounts": ["array of ALL monetary amounts found - include currency symbols"],
        "dates": ["array of ALL dates found in any format"],
        "lineCount": number,
        "summary": "detailed analysis summary with key findings",
        "accountInfo": {
          "accountNumber": "string (if found)",
          "accountHolder": "string (if found)",
          "institution": "string (if found)"
        },
        "transactions": [
          {
            "date": "string",
            "description": "string",
            "amount": "string",
            "type": "string (debit/credit/deposit/withdrawal)"
          }
        ],
        "balances": {
          "opening": "string (if found)",
          "closing": "string (if found)",
          "current": "string (if found)"
        },
        "totals": {
          "deposits": "string (if found)",
          "withdrawals": "string (if found)",
          "fees": "string (if found)",
          "interest": "string (if found)"
        }
      }
    }

    FINANCIAL KEYWORDS TO LOOK FOR (be comprehensive):
    - Account, Balance, Amount, Total, Payment, Invoice, Receipt
    - Bank, Credit, Debit, Deposit, Withdrawal, Transaction
    - Date, Time, Reference, Number, ID, Customer, Client
    - Statement, Fee, Charge, Interest, Loan, Mortgage, Tax
    - Income, Expense, Revenue, Profit, Loss, Budget, Investment
    - Savings, Checking, Credit Card, Debit Card, Cash, Check
    - Transfer, Withdrawal, Deposit, Balance, Statement
    - Purchase, Sale, Refund, Credit, Debit, Fee, Charge
    - Interest, Principal, Rate, Term, Maturity, Due Date
    - Tax, Deduction, Exemption, Credit, Liability, Asset

    AMOUNT PATTERNS TO EXTRACT:
    - Currency symbols: $, €, £, ¥, ₹, etc.
    - Numbers with decimals: 123.45, 1,234.56
    - Negative amounts: -$50.00, ($100.00)
    - Positive amounts: +$200.00, $500.00
    - Percentages: 5.25%, 12.5%
    - Large numbers: 1,000,000, 2,500.00

    DATE PATTERNS TO EXTRACT:
    - MM/DD/YYYY: 01/15/2024
    - DD/MM/YYYY: 15/01/2024
    - YYYY-MM-DD: 2024-01-15
    - MM-DD-YY: 01-15-24
    - Month names: January 15, 2024
    - Abbreviated months: Jan 15, 2024

    DOCUMENT TEXT TO ANALYZE:
    ${ocrText}

    IMPORTANT: 
    - Extract EVERY piece of financial information you can find
    - Be thorough and comprehensive
    - Don't skip any numbers, dates, or financial terms
    - If text is unclear, extract what you can and note limitations
    - Return ONLY the JSON object - no other text
    - Make sure the JSON is valid and complete
    `;

    console.log('Sending request to Gemini API...');
    
    // Add timeout protection (60 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API timeout after 60 seconds')), 60000)
    );
    
    const responsePromise = (async () => {
      const response = await geminiClient(prompt);
      return response;
    })();
    
    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    console.log('Gemini response received, length:', response ? response.length : 0);
    
    // Check if response is empty or null
    if (!response || response.trim() === '') {
      console.error('Empty response from Gemini API');
      throw new Error('Empty response from AI service');
    }
    
    // Try to parse the response as JSON
    let parsedResponse;
    try {
      // Extract JSON from the response (in case Gemini adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.log('Raw response:', response);
      throw new Error('Invalid JSON response from AI service');
    }

    // Validate the parsed response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from AI service');
    }

    // Ensure the response has the required structure
    if (!parsedResponse.analysis) {
      parsedResponse.analysis = {};
    }
    
    // Add extracted text if not present
    if (!parsedResponse.extractedText) {
      parsedResponse.extractedText = ocrText;
    }

    // Ensure all required fields are present
    if (!parsedResponse.documentType) {
      parsedResponse.documentType = 'Financial Document';
    }
    
    if (!parsedResponse.wordCount) {
      parsedResponse.wordCount = ocrText.split(/\s+/).length;
    }
    
    if (!parsedResponse.characterCount) {
      parsedResponse.characterCount = ocrText.length;
    }
    
    if (!parsedResponse.confidence) {
      parsedResponse.confidence = 'Medium';
    }

    return parsedResponse;

  } catch (error) {
    console.error('Gemini extraction failed:', error.message);
    
    // Fallback to basic analysis
    return {
      documentType: 'Financial Document',
      wordCount: ocrText.split(/\s+/).length,
      characterCount: ocrText.length,
      confidence: 'Basic Analysis (AI Failed)',
      extractedText: ocrText,
      analysis: {
        financialKeywords: extractFinancialKeywords(ocrText),
        potentialAmounts: extractAmounts(ocrText),
        dates: extractDates(ocrText),
        lineCount: ocrText.split('\n').length,
        summary: `AI analysis failed: ${error.message}. Using basic extraction.`
      }
    };
  }
};

exports.handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 File received:', req.file.originalname, 'Type:', req.file.mimetype);

    const ocrText = await runOCR(req.file.path, req.file.mimetype);
    
    if (!ocrText || ocrText.trim() === '') {
      return res.status(400).json({ error: 'No text could be extracted from the document' });
    }

    console.log('📝 OCR completed, extracting financial data...');
    
    const result = await runFinancialExtraction(ocrText);
    
    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    console.log('✅ Financial extraction completed');
    
    // Ensure we always return a valid JSON response
    const response = {
      json: result,
      summary: result.analysis?.summary || `Successfully extracted ${result.wordCount} words from the document.`
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    // Always return a valid JSON response even on error
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message,
      json: {
        documentType: 'Error',
        wordCount: 0,
        characterCount: 0,
        confidence: 'Error',
        extractedText: '',
        analysis: {
          financialKeywords: [],
          potentialAmounts: [],
          dates: [],
          lineCount: 0,
          summary: 'Document processing failed'
        }
      },
      summary: 'Document processing failed'
    });
  }
};

exports.handleExtract = async (req, res) => {
  try {
    const { ocrText } = req.body;
    
    if (!ocrText || ocrText.trim() === '') {
      return res.status(400).json({ error: 'No OCR text provided' });
    }

    console.log('📝 Processing provided OCR text...');
    
    const result = await runFinancialExtraction(ocrText);
    
    console.log('✅ Financial extraction completed');
    
    // Ensure we always return a valid JSON response
    const response = {
      json: result,
      summary: result.analysis?.summary || `Successfully analyzed ${result.wordCount} words from the provided text.`
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('❌ Extraction error:', error);
    
    // Always return a valid JSON response even on error
    res.status(500).json({ 
      error: 'Extraction failed', 
      details: error.message,
      json: {
        documentType: 'Error',
        wordCount: 0,
        characterCount: 0,
        confidence: 'Error',
        extractedText: '',
        analysis: {
          financialKeywords: [],
          potentialAmounts: [],
          dates: [],
          lineCount: 0,
          summary: 'Text analysis failed'
        }
      },
      summary: 'Text analysis failed'
    });
  }
}; 