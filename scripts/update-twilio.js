require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const webhookUrl = process.env.TWILIO_WEBHOOK_URL;

const client = twilio(accountSid, authToken);

async function updateWebhook() {
  console.log(`Updating Twilio Webhook for ${phoneNumber}...`);
  try {
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });

    if (incomingPhoneNumbers.length === 0) {
      console.error(`Phone number ${phoneNumber} not found in account.`);
      return;
    }

    const sid = incomingPhoneNumbers[0].sid;
    await client.incomingPhoneNumbers(sid).update({
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });

    console.log(`SUCCESS! Twilio Webhook updated to: ${webhookUrl}`);
  } catch (err) {
    console.error('FAILED to update Twilio Webhook:', err.message);
  }
}

updateWebhook();
