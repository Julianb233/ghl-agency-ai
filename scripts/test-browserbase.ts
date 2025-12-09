
import dotenv from 'dotenv';
dotenv.config({ override: true });

async function testBrowserbase() {
    console.log('Testing Browserbase Connection...');
    console.log('API Key present:', !!process.env.BROWSERBASE_API_KEY);
    console.log('Project ID present:', !!process.env.BROWSERBASE_PROJECT_ID);

    if (!process.env.BROWSERBASE_API_KEY) {
        console.error('ERROR: BROWSERBASE_API_KEY is missing from .env');
        return;
    }

    if (!process.env.BROWSERBASE_PROJECT_ID) {
        console.error('ERROR: BROWSERBASE_PROJECT_ID is missing from .env');
        return;
    }

    // Dynamic import to ensure env vars are loaded first
    const { browserbaseSDK } = await import('../server/_core/browserbaseSDK');

    try {
        const session = await browserbaseSDK.createSession({
            proxies: true,
        });
        console.log('Session created successfully:', session.id);

        const debug = await browserbaseSDK.getSessionDebug(session.id);
        console.log('Debug URL:', debug.debuggerFullscreenUrl);

        console.log('Browserbase API is working correctly.');
    } catch (error) {
        console.error('Browserbase API Test Failed:', error);
    }
}

testBrowserbase();
