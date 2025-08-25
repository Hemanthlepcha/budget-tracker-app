// Test webhook manually
const testWebhook = async () => {
  const webhookUrl = 'http://localhost:3000/api/whatsapp/webhook'
  
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551847923',
            phone_number_id: '671548539385774'
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: '97517773326'
          }],
          messages: [{
            from: '97517773326',
            id: 'test-message-id',
            timestamp: '1234567890',
            type: 'image',
            image: { 
              id: 'test-image-id',
              mime_type: 'image/jpeg'
            }
          }]
        }
      }]
    }]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    console.log('Webhook test result:', result)
  } catch (error) {
    console.error('Webhook test error:', error)
  }
}

testWebhook()