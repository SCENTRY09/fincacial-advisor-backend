import React, { useState } from 'react';

const FileUpload = ({ onOcrText, onFileChange, onError }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
    setSuccess('');
    onFileChange(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      const errorMsg = 'Please select a file first';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    const API_BASE = process.env.NODE_ENV === 'production'
      ? "https://financial-advisior.onrender.com"
      : 'http://localhost:5000';

    try {
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const response = await fetch(`${API_BASE}/api/ocr/upload-financial-doc`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMsg = errorData.error || errorData.details || `Upload failed (${response.status})`;
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }

      // Try to parse the response as JSON
      let data;
      try {
        const responseText = await response.text();
        console.log('Response text length:', responseText.length);
        console.log('Response text preview:', responseText.substring(0, 200));
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', await response.text());
        const errorMsg = 'Invalid response from server. Please try again.';
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }

      // Validate the response structure
      if (!data || typeof data !== 'object') {
        const errorMsg = 'Invalid response format from server';
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }

      if (!data.json) {
        const errorMsg = 'Missing analysis data in response';
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }

      console.log('Successfully parsed response:', data);
      setSuccess('Document processed successfully!');
      onOcrText(data.json, data.summary);
      
    } catch (error) {
      console.error('Upload error:', error);
      let errorMsg = error.message;
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('JSON')) {
        errorMsg = 'Server response error. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMsg = 'Request timed out. Please try again.';
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isFileValid = (file) => {
    if (!file) return false;
    
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      'application/pdf'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      return 'Please select a valid file type (JPEG, PNG, GIF, BMP, WEBP, or PDF)';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    return true;
  };

  const validationResult = file ? isFileValid(file) : null;
  const isValid = validationResult === true;

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-gray-600">
              <span className="font-medium text-green-600 hover:text-green-500">Click to upload</span> or drag and drop
            </div>
            <p className="text-xs text-gray-500">JPEG, PNG, GIF, BMP, WEBP, PDF (max 10MB)</p>
          </div>
        </label>
      </div>

      {/* File Info */}
      {file && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {isValid ? (
              <span className="text-green-600 text-sm">✓ Valid</span>
            ) : (
              <span className="text-red-600 text-sm">✗ Invalid</span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!isValid || loading}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isValid && !loading
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        ) : (
          'Upload Document'
        )}
      </button>

      {/* OCR Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Tips for Better OCR Results:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use clear, high-resolution images with good contrast</li>
          <li>• Ensure text is printed (not handwritten) and clearly visible</li>
          <li>• Avoid blurry, low-quality, or heavily compressed images</li>
          <li>• Make sure the document is well-lit and properly oriented</li>
          <li>• For PDFs, ensure they contain selectable text when possible</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload; 