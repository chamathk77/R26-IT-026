const axios = require('axios');

function getSmsConfig() {
  const apiUrl = process.env.NOTIFY_SMS_API_URL;
  const userId = process.env.NOTIFY_SMS_USER_ID;
  const apiKey = process.env.NOTIFY_SMS_API_KEY;
  const senderId = process.env.NOTIFY_SMS_SENDER_ID || 'SMARTCOST';

  if (!apiUrl?.trim()) {
    throw new Error('NOTIFY_SMS_API_URL is not configured');
  }
  if (!userId?.trim() || !apiKey?.trim()) {
    throw new Error('SMS API credentials are not configured');
  }

  return { apiUrl: apiUrl.trim(), userId, apiKey, senderId };
}

/** Local 07XXXXXXXX -> 947XXXXXXXX for Notify SMS API */
function formatSmsRecipient(mobileNumber) {
  const digits = String(mobileNumber).replace(/\D/g, '');
  if (digits.startsWith('94')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `94${digits.slice(1)}`;
  }
  return `94${digits}`;
}

async function sendSms({ to, message }) {
  const { apiUrl, userId, apiKey, senderId } = getSmsConfig();
  console.log('to in sendSms', to);
  console.log('message in sendSms', message);

  const response = await axios.post(
    apiUrl,
    {
      user_id: userId,
      api_key: apiKey,
      sender_id: senderId,
      to: formatSmsRecipient(to),
      message,
    },
    { timeout: 15000 },
  );

  console.log('response from sendSms', response.data);

  return response.data;
}

module.exports = {
  sendSms,
  formatSmsRecipient,
};
