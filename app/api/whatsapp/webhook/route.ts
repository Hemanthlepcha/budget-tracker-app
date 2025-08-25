import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { extractTransactionData } from '../../../../lib/ocr-service'

// Store processed message IDs to prevent duplicates
const processedMessages = new Set<string>()

// Clean up old processed messages every hour (optional)
setInterval(() => {
  if (processedMessages.size > 1000) {
    processedMessages.clear()
  }
}, 3600000)

// WhatsApp Business API webhook endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 WhatsApp webhook received at:', new Date().toISOString())
    console.log('🌐 Request URL:', request.url)
    console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()))

    const body = await request.json()
    console.log('📨 FULL WEBHOOK BODY:')
    // console.log(JSON.stringify(body, null, 2))

    // Verify webhook (required by WhatsApp)
    if (body.object === 'whatsapp_business_account') {
      console.log('✅ Valid WhatsApp webhook object')

      // Process incoming messages
      for (const entry of body.entry) {
        console.log('📋 Processing entry:', entry.id)

        for (const change of entry.changes) {
          console.log('🔄 Processing change field:', change.field)

          if (change.field === 'messages') {
            console.log('📝 Message field detected')
            console.log('🔍 Change value keys:', Object.keys(change.value || {}))

            // Check if this is a status update (not an incoming message)
            if (change.value.statuses && change.value.statuses.length > 0) {
              console.log('📊 Status update received:', change.value.statuses[0].status)
              console.log('👤 Status for recipient:', change.value.statuses[0].recipient_id)
              // This is just a status update (delivered, read, etc.), not an incoming message
              continue
            }

            // Check if this is an actual incoming message
            if (change.value.messages && change.value.messages.length > 0) {
              console.log('💬 Incoming message detected!')

              for (const message of change.value.messages) {
                const contact = change.value.contacts?.find((c: { wa_id: any }) => c.wa_id === message.from)

                console.log('📨 Message details:', {
                  type: message?.type,
                  from: message?.from,
                  contact: contact?.wa_id,
                  timestamp: message?.timestamp,
                  id: message?.id
                })

                // **DUPLICATE PREVENTION: Check if we've already processed this message**
                if (message.id && processedMessages.has(message.id)) {
                  console.log('⚠️ Message already processed, skipping:', message.id)
                  continue
                }

                // Add message ID to processed set
                if (message.id) {
                  processedMessages.add(message.id)
                  console.log('✅ Marked message as processed:', message.id)
                }

                if (message && message.type === 'image') {
                  console.log('🖼️ Image message detected, processing...')
                  await processTransactionImage(message, contact || { wa_id: message.from })
                } else if (message && message.type === 'text') {
                  console.log('📝 Text message received:', message.text?.body)
                  await handleTextMessage(message, contact || { wa_id: message.from })
                } else if (message) {
                  console.log('📝 Non-image message type:', message.type)
                  // Send help message for other message types
                  const phoneNumber = contact?.wa_id || message.from
                  if (phoneNumber) {
                    await sendWhatsAppMessage(phoneNumber,
                      "Hi! Please send a screenshot of your transaction for automatic processing. 📸\n\nCommands:\n• Send image = Auto-add transaction\n• Type 'help' = Show this message")
                  }
                }
              }
            } else {
              console.log('❌ No incoming messages found in webhook')
              console.log('🔍 Available keys in change.value:', Object.keys(change.value || {}))

              // Log what we actually received
              if (change.value.statuses) {
                console.log('📊 This is a status update, not an incoming message')
              } else {
                console.log('❓ Unknown webhook payload structure')
              }
            }
          } else {
            console.log('🔄 Non-message change field:', change.field)
          }
        }
      }
    } else {
      console.log('❌ Invalid webhook object:', body.object)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Verify webhook (GET request from WhatsApp)
export async function GET(request: NextRequest) {
  console.log('🔍 GET request received for webhook verification')
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('📋 Verification params:', { mode, token, challenge })
  console.log('🔑 Expected token:', process.env.WHATSAPP_VERIFY_TOKEN)

  // Verify the webhook
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verification successful')
    return new NextResponse(challenge)
  }

  console.log('❌ Webhook verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

async function handleTextMessage(message: any, contact: any) {
  try {
    const phoneNumber = contact?.wa_id || message.from
    const textMessage = message.text?.body?.toLowerCase()

    if (!phoneNumber || !textMessage) return

    console.log('📝 Processing text message from:', phoneNumber, 'Message:', textMessage)

    if (textMessage.includes('help')) {
      await sendWhatsAppMessage(phoneNumber,
        "🤖 Budget Tracker Bot\n\n📸 Send a transaction screenshot to automatically add it to your budget.\n\n✨ Commands:\n• 'help' - Show this message\n• 'status' - Check your registration\n• 'test' - Test message\n\nMake sure you're registered in the Budget Tracker app first!")
    } else if (textMessage.includes('status')) {
      // Check if user is registered
      const userProfile = await findUserByPhone(phoneNumber)
      if (userProfile) {
        await sendWhatsAppMessage(phoneNumber,
          `✅ You're registered!\nUser ID: ${userProfile.user_id.substring(0, 8)}...\nPhone: ${userProfile.phone_number}\n\nYou can now send transaction screenshots for automatic processing.`)
      } else {
        await sendWhatsAppMessage(phoneNumber,
          `❌ You're not registered yet.\nYour WhatsApp number: ${phoneNumber}\nPlease register this exact number in the Budget Tracker app first.`)
      }
    } else if (textMessage.includes('test')) {
      await sendWhatsAppMessage(phoneNumber,
        `✅ Test successful!\nReceived from: ${phoneNumber}\nMessage: "${textMessage}"\nWebhook is working correctly!`)
    } else {
      await sendWhatsAppMessage(phoneNumber,
        "I didn't understand that. Send 'help' for available commands or send a transaction screenshot. 📸")
    }
  } catch (error) {
    console.error('Error handling text message:', error)
  }
}

async function processTransactionImage(message: any, contact: any) {
  try {
    const phoneNumber = contact?.wa_id || message.from
    if (!phoneNumber) {
      console.log('❌ No phone number found in contact or message')
      return
    }

    console.log('🔍 Processing transaction image for phone:', phoneNumber)
    console.log('🔍 Message ID being processed:', message.id)

    // **ADDITIONAL DUPLICATE CHECK: Check if we've recently processed an image from this user**
    const recentTransactionKey = `${phoneNumber}-image-${Date.now().toString().slice(0, -4)}` // 10-second window
    if (processedMessages.has(recentTransactionKey)) {
      console.log('⚠️ Recent image transaction detected, skipping to prevent duplicate')
      return
    }
    processedMessages.add(recentTransactionKey)

    // Find user by phone number
    const userProfile = await findUserByPhone(phoneNumber)
    // await debugPhoneNumberIssue(phoneNumber)

    if (!userProfile) {
      console.log('❌ User not found for phone:', phoneNumber)
      await sendWhatsAppMessage(phoneNumber,
        `Welcome! 👋\n\nTo use this feature, please:\n1. Download the Budget Tracker app\n2. Register with this phone number: ${phoneNumber}\n3. Then send transaction screenshots here!\n\n📱 This ensures your transactions are saved to YOUR account.`)
      return
    }

    console.log('✅ User found:', userProfile.user_id)

    // Send processing message
    await sendWhatsAppMessage(phoneNumber, "🔄 Processing your transaction screenshot...")

    // Download and process the image
    console.log('📥 Downloading image with ID:', message.image?.id || message.image)

    // Check different possible image structures
    let imageId = null
    if (message.image?.id) {
      imageId = message.image.id
    } else if (typeof message.image === 'string') {
      imageId = message.image
    } else if (message.media?.id) {
      imageId = message.media.id
    }

    if (!imageId) {
      console.log('❌ No image ID found in message:', JSON.stringify(message, null, 2))
      await sendWhatsAppMessage(phoneNumber, "❌ Could not find image in the message. Please try sending the screenshot again.")
      return
    }

    const imageDataUrl = await downloadWhatsAppImage(imageId)

    console.log('🤖 Extracting transaction data using OCR...')
    const transactionData = await extractTransactionData(imageDataUrl)

    if (transactionData && transactionData.amount && transactionData.amount > 0) {
      console.log('✅ Transaction data extracted:', transactionData)

      // **DUPLICATE CHECK: Verify this exact transaction doesn't already exist**
      const isDuplicate = await checkForDuplicateTransaction(userProfile.user_id, transactionData, phoneNumber)
      if (isDuplicate) {
        console.log('⚠️ Duplicate transaction detected, skipping creation')
        await sendWhatsAppMessage(phoneNumber,
          `⚠️ This transaction appears to be a duplicate!\n\n💰 Amount: Nu.${transactionData.amount}\n📂 Category: ${transactionData.category}\n📅 Date: ${transactionData.date}\n🏪 Merchant: ${transactionData.merchant}\n\n✅ Transaction already exists in your budget.`)
        return
      }

      // Create transaction in database
      await createAutoTransaction(userProfile.user_id, transactionData, phoneNumber)

      // Send detailed confirmation message
      await sendWhatsAppMessage(phoneNumber,
        `✅ Transaction added successfully!\n\n💰 Amount: Nu.${transactionData.amount}\n📂 Category: ${transactionData.category}\n📅 Date: ${transactionData.date}\n🏪 Merchant: ${transactionData.merchant}\n📝 Type: ${transactionData.type}\n\n🎉 Your budget has been updated!`)
    } else {
      console.log('❌ Could not extract valid transaction data')
      await sendWhatsAppMessage(phoneNumber,
        "❌ Could not extract transaction details from the image.\n\nPlease make sure your screenshot clearly shows:\n• 💰 Amount\n• 🏪 Merchant/Store name\n• 📅 Transaction date\n• 💳 Transaction type\n\nTry taking a clearer screenshot and send it again!")
    }

  } catch (error) {
    console.error('❌ Error processing transaction image:', error)
    const phoneNumber = contact?.wa_id || message?.from
    if (phoneNumber) {
      await sendWhatsAppMessage(phoneNumber,
        "❌ Sorry, there was an error processing your transaction.\n\nPlease try again or add the transaction manually in the app.\n\nIf this continues, contact support.")
    }
  }
}

// **NEW FUNCTION: Check for duplicate transactions**
async function checkForDuplicateTransaction(userId: string, transactionData: any, phoneNumber: string): Promise<boolean> {
  try {
    console.log('🔍 Checking for duplicate transaction...')

    // Look for transactions with same amount, date, and merchant within the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: existingTransactions, error } = await supabase
      .from('transactions')
      .select('id, amount, date, merchant, notes, created_at, source')
      .eq('user_id', userId)
      .eq('amount', parseFloat(transactionData.amount))
      .eq('date', transactionData.date)
      .gte('created_at', oneDayAgo) // Only check recent transactions
      .limit(10)

    if (error) {
      console.error('❌ Error checking for duplicates:', error)
      return false // Don't block transaction if we can't check
    }

    if (existingTransactions && existingTransactions.length > 0) {
      // Check if any existing transaction matches closely
      for (const existing of existingTransactions) {
        const merchantMatch = transactionData.merchant && existing.merchant &&
          (existing.merchant.toLowerCase().includes(transactionData.merchant.toLowerCase()) ||
            transactionData.merchant.toLowerCase().includes(existing.merchant.toLowerCase()))

        const isWhatsAppTransaction = existing.notes?.includes('Auto-added via WhatsApp') || existing.source === 'whatsapp'

        if (merchantMatch || isWhatsAppTransaction) {
          console.log('⚠️ Potential duplicate found:', {
            existing: { id: existing.id, amount: existing.amount, merchant: existing.merchant, date: existing.date },
            new: { amount: transactionData.amount, merchant: transactionData.merchant, date: transactionData.date }
          })
          return true
        }
      }
    }

    console.log('✅ No duplicates found')
    return false

  } catch (error) {
    console.error('❌ Error in duplicate check:', error)
    return false // Don't block transaction if duplicate check fails
  }
}

// ... rest of your existing functions remain the same ...
async function findUserByPhone(phoneNumber: string) {
  try {
    console.log('🔍 Original phone number from WhatsApp:', phoneNumber)

    // Test database connection first
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return null;
    }

    console.log('✅ Database connection successful, total records:', connectionTest);

    // Remove all non-digits for analysis
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    console.log('🔍 Clean number:', cleanNumber)

    // First, let's see what phone numbers are actually in the database
    console.log('🔍 Checking existing phone numbers in database...')
    const { data: existingNumbers, error: listError } = await supabase
      .from('user_profiles')
      .select('phone_number, whatsapp_enabled, user_id')
      .eq('whatsapp_enabled', true)

    if (listError) {
      console.error('❌ Error fetching existing numbers:', listError)
      return null
    }

    if (existingNumbers && existingNumbers.length > 0) {
      console.log('📱 Existing phone numbers in DB:', existingNumbers.map(u => ({ phone: u.phone_number, userId: u.user_id.substring(0, 8) + '...' })))
    } else {
      console.log('📱 No phone numbers found in database or no WhatsApp-enabled users')
      return null
    }

    // Create comprehensive list of possible formats
    const phoneFormats = new Set<string>()

    // Always add the original formats
    phoneFormats.add(phoneNumber.trim())
    phoneFormats.add(`+${phoneNumber.trim()}`)
    if (phoneNumber.startsWith('+')) {
      phoneFormats.add(phoneNumber.substring(1).trim())
    }

    // Handle Bhutan numbers specifically (975 + 8 digits = 11 total)
    if (cleanNumber.length === 11 && cleanNumber.startsWith('975')) {
      // This is a full Bhutan number like 97517773326
      const localPart = cleanNumber.substring(3) // Get 17773326

      phoneFormats.add(cleanNumber) // 97517773326
      phoneFormats.add(`+${cleanNumber}`) // +97517773326
      phoneFormats.add(localPart) // 17773326
      phoneFormats.add(`+975${localPart}`) // +97517773326 (duplicate, but Set will handle it)
      phoneFormats.add(`975${localPart}`) // 97517773326 (duplicate, but Set will handle it)

      console.log('🇧🇹 Detected Bhutan number, local part:', localPart)
    }
    // Handle 8-digit local Bhutan numbers (17, 77)
    else if (cleanNumber.length === 8 && (cleanNumber.startsWith('17') || cleanNumber.startsWith('77'))) {
      phoneFormats.add(cleanNumber) // 17773326
      phoneFormats.add(`+${cleanNumber}`) // +17773326
      phoneFormats.add(`975${cleanNumber}`) // 97517773326
      phoneFormats.add(`+975${cleanNumber}`) // +97517773326

      console.log('🇧🇹 Detected local Bhutan number')
    }
    // Handle other international numbers
    else if (cleanNumber.length >= 10) {
      phoneFormats.add(cleanNumber)
      phoneFormats.add(`+${cleanNumber}`)

      // Try assuming it might be missing country code
      if (cleanNumber.length === 10) {
        phoneFormats.add(`+1${cleanNumber}`) // US format
      }
    }

    // Remove duplicates and empty strings
    const formatArray = Array.from(phoneFormats).filter(f => f && f.length > 0)
    console.log('🔍 Generated phone formats:', formatArray)

    // Try each format with database lookup
    for (const format of formatArray) {
      console.log(`🔍 Checking format: "${format}" (length: ${format.length})`)

      try {
        // Use a simpler, more reliable query structure
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, phone_number, whatsapp_enabled')
          .eq('phone_number', format)
          .eq('whatsapp_enabled', true)
          .maybeSingle()

        console.log(`🔍 Query result for "${format}":`, {
          data: data ? { user_id: data.user_id.substring(0, 8) + '...', phone_number: data.phone_number } : null,
          error: error?.message || null
        })

        if (data && !error) {
          console.log('✅ FOUND USER! Format:', format, 'User ID:', data.user_id.substring(0, 8) + '...')
          return data
        }

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found", which is expected
          console.log('⚠️ Database error for format', format, ':', error)
        }

      } catch (dbError) {
        console.log('⚠️ Database query exception for format', format, ':', dbError)
      }
    }

    // If no exact matches, try checking if any existing numbers contain our number or vice versa
    console.log('🔍 Trying fuzzy matching...')
    if (existingNumbers && existingNumbers.length > 0) {
      for (const existing of existingNumbers) {
        const existingClean = existing.phone_number.replace(/\D/g, '')

        // Check if numbers match when cleaned
        if (existingClean === cleanNumber) {
          console.log('✅ FOUND USER via fuzzy match! DB format:', existing.phone_number, 'WhatsApp format:', phoneNumber)
          return existing
        }

        // Check if WhatsApp number contains the DB number or vice versa
        if (cleanNumber.includes(existingClean) || existingClean.includes(cleanNumber)) {
          console.log('🔍 Possible partial match found:', existing.phone_number, 'vs', phoneNumber)
          console.log('🔍 Clean comparison:', existingClean, 'vs', cleanNumber)

          // For Bhutan numbers, be more specific about partial matches
          if (cleanNumber.length === 11 && existingClean.length === 8) {
            // WhatsApp has full number (97517773326), DB has local (17773326)
            if (cleanNumber.endsWith(existingClean)) {
              console.log('✅ FOUND USER via Bhutan number match! DB local:', existingClean, 'WhatsApp full:', cleanNumber)
              return existing
            }
          } else if (cleanNumber.length === 8 && existingClean.length === 11) {
            // WhatsApp has local number, DB has full number
            if (existingClean.endsWith(cleanNumber)) {
              console.log('✅ FOUND USER via Bhutan number match! WhatsApp local:', cleanNumber, 'DB full:', existingClean)
              return existing
            }
          }
        }
      }
    }

    console.log('❌ User not found with any method')
    console.log('💡 Debug info:')
    console.log('  - WhatsApp number:', phoneNumber)
    console.log('  - Clean WhatsApp number:', cleanNumber)
    console.log('  - Generated formats:', formatArray)
    console.log('  - DB numbers found:', existingNumbers?.length || 0)

    return null

  } catch (error) {
    console.error('❌ Critical error in findUserByPhone:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    return null
  }
}

// Enhanced debug function to help troubleshoot
// async function debugPhoneNumberIssue(whatsappPhone: string) {
//   try {
//     console.log('🐛 DEBUG: Phone number issue analysis')
//     console.log('🐛 WhatsApp phone:', whatsappPhone)

//     // Check total users
//     const { count: totalUsers } = await supabase
//       .from('user_profiles')
//       .select('*', { count: 'exact', head: true })

//     console.log('🐛 Total users in database:', totalUsers)

//     // Check WhatsApp enabled users
//     const { data: whatsappUsers, count: whatsappCount } = await supabase
//       .from('user_profiles')
//       .select('user_id, phone_number, whatsapp_enabled', { count: 'exact' })
//       .eq('whatsapp_enabled', true)

//     console.log('🐛 WhatsApp enabled users:', whatsappCount)
//     console.log('🐛 WhatsApp users details:', whatsappUsers?.map(u => ({
//       userId: u.user_id.substring(0, 8) + '...',
//       phone: u.phone_number,
//       whatsappEnabled: u.whatsapp_enabled
//     })))

//     // Check for any users with similar phone numbers
//     const cleanWhatsapp = whatsappPhone.replace(/\D/g, '')
//     console.log('🐛 Clean WhatsApp number:', cleanWhatsapp)

//     // Try ILIKE search for partial matches
//     const { data: likeMatches } = await supabase
//       .from('user_profiles')
//       .select('user_id, phone_number, whatsapp_enabled')
//       .ilike('phone_number', `%${cleanWhatsapp}%`)

//     console.log('🐛 ILIKE matches:', likeMatches?.map(u => ({
//       userId: u.user_id.substring(0, 8) + '...',
//       phone: u.phone_number,
//       whatsappEnabled: u.whatsapp_enabled
//     })))

//     // Check for Bhutan number patterns
//     if (cleanWhatsapp.length === 11 && cleanWhatsapp.startsWith('975')) {
//       const localPart = cleanWhatsapp.substring(3)
//       console.log('🐛 Bhutan local part:', localPart)

//       const { data: localMatches } = await supabase
//         .from('user_profiles')
//         .select('user_id, phone_number, whatsapp_enabled')
//         .ilike('phone_number', `%${localPart}%`)

//       console.log('🐛 Local part matches:', localMatches?.map(u => ({
//         userId: u.user_id.substring(0, 8) + '...',
//         phone: u.phone_number,
//         whatsappEnabled: u.whatsapp_enabled
//       })))
//     }

//   } catch (error) {
//     console.error('🐛 Debug function error:', error)
//   }
// }

// WhatsApp API functions
async function downloadWhatsAppImage(imageId: string): Promise<string> {
  try {
    console.log('📥 Getting image URL for ID:', imageId)

    // First, get the image URL from WhatsApp
    const response = await fetch(`https://graph.facebook.com/v18.0/${imageId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get image URL: ${response.status} ${response.statusText}`)
    }

    const imageData = await response.json()
    console.log('📸 Image URL received:', imageData.url)

    // Download the actual image file
    const imageResponse = await fetch(imageData.url, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
      }
    })

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`)
    }

    // Convert to base64 for OCR service
    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    console.log('🖼️ Image downloaded and converted to base64, size:', buffer.length, 'bytes')
    return dataUrl

  } catch (error) {
    console.error('❌ Error downloading WhatsApp image:', error)
    throw error
  }
}

async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  try {
    console.log('📤 Sending WhatsApp message to:', phoneNumber)

    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Failed to send WhatsApp message:', result)
      throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`)
    }

    console.log('✅ WhatsApp message sent successfully:', result.messages?.[0]?.id)

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error)
  }
}

async function createAutoTransaction(userId: string, transactionData: any, phoneNumber: string) {
  try {
    console.log('💾 Creating transaction for user:', userId)

    // Validate transaction data
    if (!transactionData.amount || transactionData.amount <= 0) {
      throw new Error('Invalid transaction amount')
    }

    // Ensure category exists
    await ensureCategoryExists(userId, transactionData.category, transactionData.type)

    // Create the transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: parseFloat(transactionData.amount),
        category: transactionData.category,
        type: transactionData.type,
        date: transactionData.date,
        notes: `Auto-added via WhatsApp for${transactionData.merchant ? ': ' + transactionData.merchant : ''}`,
        source: 'whatsapp',
        merchant: transactionData.merchant || 'Unknown'
      })
      .select()

    if (error) {
      console.error('❌ Database error creating transaction:', error)
      throw error
    }

    console.log('✅ Auto transaction created successfully:', data?.[0]?.id)

  } catch (error) {
    console.error('❌ Error creating auto transaction:', error)
    await sendWhatsAppMessage(phoneNumber,
      "❌ Error saving transaction to database.\n\nThe transaction data was extracted but couldn't be saved. Please try again or add it manually in the app.")
    throw error
  }
}

async function ensureCategoryExists(userId: string, categoryName: string, type: 'income' | 'expense') {
  try {
    console.log('🏷️ Ensuring category exists:', categoryName, type)

    // Check if category exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .eq('name', categoryName)
      .eq('type', type)
      .single()

    if (existingCategory) {
      console.log('✅ Category already exists:', existingCategory.id)
      return existingCategory
    }

    // Create the category if it doesn't exist
    console.log('➕ Creating new category:', categoryName)

    // Get the highest order number for this user and type
    const { data: categories } = await supabase
      .from('categories')
      .select('order')
      .eq('user_id', userId)
      .eq('type', type)
      .order('order', { ascending: false })
      .limit(1)

    const maxOrder = categories?.[0]?.order || 0

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: categoryName,
        type: type,
        color: type === 'income' ? '#10b981' : '#ef4444', // Green for income, red for expense
        order: maxOrder + 1
      })
      .select()

    if (error) {
      console.error('❌ Error creating category:', error)
      throw error
    }

    console.log('✅ New category created:', newCategory?.[0]?.id)
    return newCategory?.[0]

  } catch (error) {
    console.error('❌ Error ensuring category exists:', error)
    // Don't throw error here, just log it - transaction can still be created with existing categories
  }
}