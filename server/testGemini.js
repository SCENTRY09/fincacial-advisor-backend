/**
 * Standalone Gemini API Test
 * Run: node testGemini.js
 */

require('dotenv').config({ override: true });

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('\n========================================');
  console.log('GEMINI API DIAGNOSTIC TEST');
  console.log('========================================\n');

  // 1. SDK version
  const sdkPkg = require('@google/generative-ai/package.json');
  console.log('SDK Version       :', sdkPkg.version);

  // 2. API key check
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key Loaded    :', !!apiKey);
  console.log('API Key Length    :', apiKey?.length);
  console.log('API Key Prefix    :', apiKey?.substring(0, 12) + '...');

  // Detect key type
  // Detect key type - AQ. keys are new Google AI Studio format (2024+)
  if (apiKey?.startsWith('AQ.')) {
    console.log('Key Format        : ✅ New Google AI Studio format (AQ. prefix)');
  } else if (apiKey?.startsWith('AIzaSy')) {
    console.log('Key Format        : ✅ Classic format (AIzaSy prefix)');
  } else {
    console.log('Key Format        : ⚠️  Unknown format');
  }

  // 3. Model name check
  const modelName = 'gemini-2.0-flash';
  console.log('\nModel Name        :', modelName);

  // 4. Initialize SDK
  console.log('\n--- Initializing Gemini SDK ---');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  console.log('Internal model ID :', model.model);

  // 5. Send test request
  console.log('\n--- Sending test request ---');
  try {
    const result = await model.generateContent('Say "Hello from Gemini" in one sentence.');
    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('\n✅ SUCCESS!');
    console.log('Response:', text);
  } catch (err) {
    console.log('\n❌ API CALL FAILED');
    console.log('Error Type   :', err.constructor.name);
    console.log('Error Message:', err.message);

    if (err.message?.includes('404')) {
      console.log('\nDIAGNOSIS: 404 Not Found');
      console.log('  → Model name is wrong OR API key has no access to this model');
      console.log('  → Try: gemini-1.5-flash-latest');
    }
    if (err.message?.includes('403')) {
      console.log('\nDIAGNOSIS: 403 Forbidden');
      console.log('  → API key is invalid or revoked');
      console.log('  → Generate a new key at: https://aistudio.google.com/app/apikey');
    }
    if (err.message?.includes('429')) {
      console.log('\nDIAGNOSIS: 429 Quota Exceeded');
      console.log('  → Free tier limit reached');
      console.log('  → Enable billing or use a different Google account');
    }
  }

  console.log('\n========================================\n');
}

testGemini();
