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

function extractSmsErrorMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  return data.errors || data.message || data.error || null;
}

async function sendSms({ to, message, senderId }) {
  const { apiUrl, userId, apiKey, senderId: defaultSenderId } = getSmsConfig();
  const resolvedSenderId = senderId?.trim() || defaultSenderId;
  const payload = {
    user_id: userId,
    api_key: apiKey,
    sender_id: resolvedSenderId,
    to: formatSmsRecipient(to),
    message,
  };

  try {
    const response = await axios.post(apiUrl, payload, { timeout: 15000 });

    if (response.data?.status === 'error') {
      const smsError = extractSmsErrorMessage(response.data) || 'SMS send failed';
      const err = new Error(smsError);
      err.code = 'SMS_API_ERROR';
      console.log('sms error', smsError);
      throw err;
    }

    return response.data;
  } catch (error) {
    if (error.code === 'SMS_API_ERROR') {
      console.log('sms error', error.message);
      throw error;
    }

    const smsError = extractSmsErrorMessage(error.response?.data);
    if (smsError) {
      const err = new Error(smsError);
      err.code = 'SMS_API_ERROR';
      err.httpStatus = error.response?.status;
      console.log('sms error', error.message);
      throw err;
    }

    console.log('sms error', error.message);
    throw error;
  }
}

module.exports = {
  sendSms,
  formatSmsRecipient,
};
