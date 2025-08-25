import { NextRequest, NextResponse } from 'next/server'
import { extractTransactionData } from '../../../lib/ocr-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert file to base64 data URL for OpenAI
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Extract transaction data using OCR
    const transactionData = await extractTransactionData(dataUrl)

    if (transactionData) {
      return NextResponse.json({
        success: true,
        data: transactionData,
        message: 'Transaction data extracted successfully!'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Could not extract transaction data from image'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('OCR test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process image'
    }, { status: 500 })
  }
}