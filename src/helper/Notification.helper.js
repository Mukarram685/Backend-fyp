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

  if (!appId || !apiKey || apiKey === 'YOUR_ONESIGNAL_REST_API_KEY') {
    console.warn("[OneSignal Helper] OneSignal credentials are not configured properly. Skipping push notification.");
    return false;
  }

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: {
          external_id: [String(userId)]
        },
        target_channel: "push",
        headings: {
          en: title
        },
        contents: {
          en: message
        },
        data: data
      })
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error("[OneSignal Helper] Error response from OneSignal:", responseData);
      return false;
    }

    console.log("[OneSignal Helper] Push notification sent successfully:", responseData);
    return true;
  } catch (error) {
    console.error("[OneSignal Helper] Exception sending push notification:", error);
    return false;
  }
};
