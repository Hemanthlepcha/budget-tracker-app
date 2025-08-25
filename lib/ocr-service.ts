import { GoogleGenAI } from "@google/genai";
import { createWorker as tesseractCreateWorker, Worker } from 'tesseract.js';

export interface TransactionData {
    amount: number
    merchant: string
    category: string
    date: string
    type: 'expense' | 'income'
    description?: string
}

export async function extractTransactionData(imageUrl: string): Promise<TransactionData | null> {
    try {
        console.log('🔎 Starting transaction extraction with Gemini...');

        if (typeof window !== 'undefined') {
            // Browser-side: use fetch + Gemini
            return await extractWithGemini(imageUrl);
        }

        // Server-side: also use Gemini
        return await extractWithGemini(imageUrl);

    } catch (error) {
        console.error('❌ Transaction extraction error:', error);
        return createFallbackTransaction();
    }
}
function safeParseJSON(text: string): any | null {
    try {
        // Try direct parse first
        return JSON.parse(text);
    } catch {
        // Attempt to extract JSON block using regex
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn('❌ Still failed to parse JSON:', e);
                return null;
            }
        }
        return null;
    }
}

async function extractWithGemini(imageUrl: string): Promise<TransactionData | null> {
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        // Fetch the image and convert to base64
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        // Prompt the model to extract transaction data in JSON format
        const prompt = `
Extract the transaction details from this image. 
Return ONLY a JSON object with fields: 
amount (number), merchant (string), category (string), date (YYYY-MM-DD), type ('expense' or 'income'), description (optional). 
Do not add any extra text.
`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: 'image/jpeg', // adjust if your images are PNG
                        data: base64Image,
                    },
                },
                { text: prompt }
            ]
        });

        const text = result?.text?.trim();
        console.log('📜 Gemini OCR output:', text);

        // Try parsing JSON
        try {
            const data = safeParseJSON(text ?? "");
            return validateTransactionData(data) || createFallbackTransaction();
        } catch {
            console.warn('❌ Failed to parse JSON from Gemini output, using fallback');
            return createFallbackTransaction();
        }

    } catch (error) {
        console.error('❌ Gemini extraction error:', error);
        return createFallbackTransaction();
    }
}


// Server-side pattern matching for known transaction images
async function extractWithPatternMatching(imageUrl: string): Promise<TransactionData | null> {
    try {
        console.log('🔍 Using server-side Tesseract for extraction...')

        // Create a Tesseract worker
        const worker = await createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        // Recognize the text from the image URL
        const { data: { text } } = await worker.recognize(imageUrl);

        // Terminate the worker to free up resources
        await worker.terminate();

        console.log('📜 OCR extracted text:', text)
        return parseTransactionText(text)

    } catch (error) {
        console.error('Server Tesseract error:', error)
        return createFallbackTransaction()
    }
}


// Parse OCR text for transaction data
function parseTransactionText(text: string): TransactionData | null {
    // Your existing parsing logic
    try {
        if (!text || text.trim().length === 0) {
            console.log('❌ No text to parse')
            return createFallbackTransaction()
        }

        console.log('🔍 Parsing OCR text:', text)

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

        let amount: number = 0
        let merchant: string = ''
        let dateStr: string = ''

        // Look for specific patterns in the OCR text
        for (const line of lines) {
            const lineLower = line.toLowerCase()

            // Extract amount - look for "Amount" followed by "Nu." and number
            if (lineLower.includes('amount') && line.includes('nu.')) {
                const amountMatch = line.match(/nu\.?\s*(\d+(?:[.,]\d{2})?)/i)
                if (amountMatch) {
                    // Handle both comma and dot as decimal separator
                    const amountStr = amountMatch[1].replace(',', '.')
                    amount = parseFloat(amountStr)
                }
            }

            // Extract purpose/merchant
            if (lineLower.includes('purpose')) {
                const purposeMatch = line.match(/purpose\s*:?\s*(.+)/i)
                if (purposeMatch) {
                    merchant = purposeMatch[1].trim()
                }
            }

            // Extract date
            if (lineLower.includes('date')) {
                const dateMatch = line.match(/date\s*:?\s*(.+)/i)
                if (dateMatch) {
                    dateStr = dateMatch[1].trim()
                }
            }

            // Look for standalone amounts
            if (!amount) {
                const directAmountMatch = line.match(/nu\.?\s*(\d+(?:[.,]\d{2})?)/i)
                if (directAmountMatch && !lineLower.includes('a/c')) {
                    const amountStr = directAmountMatch[1].replace(',', '.')
                    const parsedAmount = parseFloat(amountStr)
                    if (parsedAmount > 0 && parsedAmount < 100000) {
                        amount = parsedAmount
                    }
                }
            }

            // Look for common transaction purposes
            const foodKeywords = ['momo', 'jhol momo', 'food', 'restaurant', 'cafe']
            for (const keyword of foodKeywords) {
                if (lineLower.includes(keyword.toLowerCase()) && !merchant) {
                    merchant = line.trim()
                    break
                }
            }

            // Look for date patterns
            const datePattern = /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i
            const dateMatch = line.match(datePattern)
            if (dateMatch && !dateStr) {
                dateStr = line.trim()
            }
        }

        // Validate and create transaction
        if (amount > 0) {
            const category = improveCategory(merchant, 'Other')
            const date = parseBhutanDate(dateStr) || new Date().toISOString().split('T')[0]

            const transaction: TransactionData = {
                amount,
                merchant: merchant || 'Bank Transfer',
                category,
                date,
                type: determineTransactionType(merchant, category),
                description: `Fund transfer - ${merchant || 'Bank Transfer'}`
            }

            console.log('✅ Successfully parsed transaction:', transaction)
            return transaction
        }

        console.log('❌ Could not extract valid amount, using fallback')
        return createFallbackTransaction()

    } catch (error) {
        console.error('❌ Text parsing error:', error)
        return createFallbackTransaction()
    }
}


// Create a fallback transaction when extraction fails
function createFallbackTransaction(): TransactionData {
    return {
        amount: 0,
        merchant: 'Transaction (OCR Failed)',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        description: 'Transaction - OCR extraction failed'
    }
}

// Determine transaction type based on merchant and category
function determineTransactionType(merchant: string, category: string): 'expense' | 'income' {
    if (!merchant) return 'expense'

    const merchantLower = merchant.toLowerCase()

    if (merchantLower.includes('salary') ||
        merchantLower.includes('allowance') ||
        merchantLower.includes('deposit') ||
        merchantLower.includes('credit') ||
        category === 'Salary') {
        return 'income'
    }

    return 'expense'
}

// Helper function to parse Bhutanese date format (18 Aug 2025 -> 2025-08-18)
function parseBhutanDate(dateStr: string): string | null {
    try {
        if (!dateStr) return null

        // Handle different date formats
        const patterns = [
            /(\d{1,2})\s+(\w{3})\s+(\d{4})/, // "18 Aug 2025"
            /(\d{4})-(\d{2})-(\d{2})/, // Already in correct format
        ]

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i]
            const match = dateStr.match(pattern)
            if (match) {
                if (i === 1) {
                    // Already in YYYY-MM-DD format
                    return match[0]
                } else {
                    // Convert "18 Aug 2025" format
                    const day = match[1].padStart(2, '0')
                    const monthName = match[2]
                    const year = match[3]

                    const monthMap: Record<string, string> = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                    }

                    const month = monthMap[monthName]
                    if (month) {
                        return `${year}-${month}-${day}`
                    }
                }
            }
        }

        // Try parsing as a regular date string
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
        }

        return null
    } catch (error) {
        console.error('Date parsing error:', error)
        return null
    }
}

// Enhanced category mapping for Bhutanese context
export const categoryMappings: Record<string, string> = {
    // Food & Dining (including local Bhutanese food)
    'momo': 'Food',
    'jhol momo': 'Food',
    'jhol': 'Food',
    'restaurant': 'Food',
    'cafe': 'Food',
    'food': 'Food',
    'dining': 'Food',
    'grocery': 'Food',
    'supermarket': 'Food',
    'thukpa': 'Food',
    'ema datshi': 'Food',
    'chow mein': 'Food',
    'snack': 'Food',
    'meal': 'Food',

    // Transportation
    'taxi': 'Transportation',
    'bus': 'Transportation',
    'fuel': 'Transportation',
    'petrol': 'Transportation',
    'parking': 'Transportation',
    'transport': 'Transportation',
    'vehicle': 'Transportation',

    // Shopping
    'shopping': 'Shopping',
    'store': 'Shopping',
    'market': 'Shopping',
    'clothes': 'Shopping',
    'electronics': 'Shopping',
    'purchase': 'Shopping',

    // Bills & Utilities
    'electricity': 'Bills',
    'water': 'Bills',
    'internet': 'Bills',
    'phone': 'Bills',
    'mobile': 'Bills',
    'bill': 'Bills',
    'utility': 'Bills',

    // Transfers & Banking
    'transfer': 'Transfer',
    'send money': 'Transfer',
    'fund transfer': 'Transfer',
    'beneficiary': 'Transfer',
    'payment': 'Transfer',

    // Healthcare
    'hospital': 'Healthcare',
    'pharmacy': 'Healthcare',
    'doctor': 'Healthcare',
    'medical': 'Healthcare',

    // Entertainment
    'movie': 'Entertainment',
    'cinema': 'Entertainment',
    'game': 'Entertainment',

    // Education
    'school': 'Education',
    'college': 'Education',
    'university': 'Education',
    'book': 'Education',
    'tuition': 'Education',
}

export function improveCategory(merchant: string, extractedCategory: string): string {
    if (!merchant) return extractedCategory || 'Other'

    const merchantLower = merchant.toLowerCase()

    // Check if merchant matches any known patterns
    for (const [keyword, category] of Object.entries(categoryMappings)) {
        if (merchantLower.includes(keyword)) {
            return category
        }
    }

    // Special handling for common Bhutanese banking purposes
    if (merchantLower.includes('salary') || merchantLower.includes('allowance')) {
        return 'Salary'
    }

    if (merchantLower.includes('rent')) {
        return 'Housing'
    }

    if (merchantLower.includes('loan') || merchantLower.includes('emi')) {
        return 'Loan'
    }

    // Return the extracted category or default
    return extractedCategory || 'Other'
}

// Legacy validation function - kept for backwards compatibility
export function validateTransactionData(data: any): TransactionData | null {
    try {
        if (!data || typeof data !== 'object') {
            return null
        }

        const amount = parseFloat(data.amount)
        if (!amount || isNaN(amount) || amount <= 0) {
            return null
        }

        const merchant = data.merchant?.toString().trim() || 'Bank Transfer'
        const category = improveCategory(merchant, data.category)
        const date = parseBhutanDate(data.date) || new Date().toISOString().split('T')[0]
        const type = determineTransactionType(merchant, category)

        return {
            amount,
            merchant,
            category,
            date,
            type,
            description: data.description || `Fund transfer - ${merchant}`
        }
    } catch (error) {
        console.error('❌ Validation error:', error)
        return null
    }
}

// Manual transaction entry function (for when OCR completely fails)
export function createManualTransaction(
    amount: number,
    merchant: string,
    purpose?: string
): TransactionData {
    const category = improveCategory(merchant, 'Other')

    return {
        amount,
        merchant,
        category,
        date: new Date().toISOString().split('T')[0],
        type: determineTransactionType(merchant, category),
        description: purpose || `Manual entry - ${merchant}`
    }
}
async function createWorker(): Promise<Worker> {
    // Create and return a Tesseract.js worker instance
    const worker = await tesseractCreateWorker();
    await worker.load();
    return worker;
}
