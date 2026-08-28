/**
 * Send push notification to a specific user using OneSignal REST API.
 * @param {string} userId - The external user ID of the recipient.
 * @param {string} title - The notification title.
 * @param {string} message - The notification content.
 * @param {object} data - Optional additional data payload.
 */
export const sendPushNotification = async (userId, title, message, data = {}) => {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  // console.log(`\n=================== [OneSignal Push Trigger] ===================`);
  // console.log(`[OneSignal Helper] Target User ID: ${userId}`);
  // console.log(`[OneSignal Helper] App ID: ${appId}`);
  // console.log(`[OneSignal Helper] Title: "${title}" | Message: "${message}"`);
  // console.log(`[OneSignal Helper] Data:`, data);

  if (!appId || !apiKey || apiKey === 'YOUR_ONESIGNAL_REST_API_KEY') {
    console.warn("[OneSignal Helper] OneSignal credentials are not configured properly. Skipping push notification.");
    // console.log(`=================================================================\n`);
    return false;
  }

  const targetUserId = String(userId);

  try {
    const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;

    const payload = {
      app_id: appId,
      include_external_user_ids: [targetUserId],
      include_aliases: {
        external_id: [targetUserId]
      },
      target_channel: "push",
      headings: {
        en: title
      },
      contents: {
        en: message
      },
      data: data
    };

    console.log(`[OneSignal Helper] Sending payload to OneSignal:`, JSON.stringify(payload));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    // console.log(`[OneSignal Helper] OneSignal API HTTP Status: ${response.status}`);
    // console.log(`[OneSignal Helper] OneSignal Response Body:`, JSON.stringify(responseData));

    if (!response.ok || (responseData.errors && responseData.errors.length > 0)) {
      console.error(`[OneSignal Helper] Error response for target user (${targetUserId}):`, responseData);
      // console.log(`=================================================================\n`);
      return false;
    }

    console.log(`[OneSignal Helper] SUCCESS: Notification accepted by OneSignal for user (${targetUserId})`);
    // console.log(`=================================================================\n`);
    return true;
  } catch (error) {
    console.error(`[OneSignal Helper] EXCEPTION sending push notification to user (${userId}):`, error);
    // console.log(`=================================================================\n`);
    return false;
  }
};
