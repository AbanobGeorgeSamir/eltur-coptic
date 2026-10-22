const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const User = require('../models/User');

let messagingClient;
let initializationAttempted = false;

function getMessagingClient() {
    if (initializationAttempted) return messagingClient;
    initializationAttempted = true;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let app;

    if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        app = getApps()[0] || initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId || serviceAccount.project_id,
        });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        app = getApps()[0] || initializeApp({
            credential: applicationDefault(),
            ...(projectId ? { projectId } : {}),
        });
    }

    if (app) messagingClient = getMessaging(app);
    return messagingClient;
}

async function sendToTargets(messaging, targetField, targets, message, invalidCodes) {
    const invalidTargets = [];
    let sent = 0;

    for (let index = 0; index < targets.length; index += 500) {
        const batch = targets.slice(index, index + 500);
        const response = await messaging.sendEachForMulticast({
            ...message,
            [targetField]: batch,
        });

        response.responses.forEach((result, responseIndex) => {
            if (result.success) {
                sent += 1;
                return;
            }
            if (invalidCodes.includes(result.error?.code)) {
                invalidTargets.push(batch[responseIndex]);
            }
        });
    }

    return { sent, invalidTargets };
}

async function sendFeaturedVerseUpdate(verse) {
    const messaging = getMessagingClient();
    if (!messaging) return { sent: 0, configured: false };

    const subscribedUsers = await User.find({
        isActive: { $ne: false },
        'notificationPreferences.verseUpdates': { $ne: false },
        $or: [
            { pushTokens: { $exists: true, $ne: [] } },
            { pushFids: { $exists: true, $ne: [] } },
        ],
        $and: [{
            $or: [
                { role: { $ne: 'student' } },
                { role: 'student', meetingGroup: { $exists: true, $ne: null } },
            ],
        }],
    }).select('+pushTokens +pushFids').lean();
    const tokens = [...new Set(subscribedUsers.flatMap((user) => user.pushTokens || []))];
    const fids = [...new Set(subscribedUsers.flatMap((user) => user.pushFids || []))];
    if (tokens.length === 0 && fids.length === 0) return { sent: 0, configured: true };

    const reference = String(verse.reference || '').trim();
    const text = String(verse.text || '').trim();
    const excerpt = text.length > 110 ? `${text.slice(0, 107)}…` : text;
    const body = [reference, excerpt].filter(Boolean).join(' · ').slice(0, 240);
    const message = {
        notification: {
            title: 'تم تحديث الآية المميزة',
            body: body || 'تم تغيير الآية المميزة.',
        },
        data: {
            type: 'featured_verse_updated',
            reference,
            deepLink: 'eltorcoptic://featured-verse',
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'verse_updates',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
        },
        apns: {
            payload: { aps: { sound: 'default' } },
        },
    };

    const tokenResult = tokens.length > 0
        ? await sendToTargets(messaging, 'tokens', tokens, message, [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
        ])
        : { sent: 0, invalidTargets: [] };
    const fidResult = fids.length > 0
        ? await sendToTargets(messaging, 'fids', fids, message, [
            'messaging/installation-id-not-registered',
        ])
        : { sent: 0, invalidTargets: [] };
    const sent = tokenResult.sent + fidResult.sent;

    if (tokenResult.invalidTargets.length > 0) {
        await User.updateMany(
            { pushTokens: { $in: tokenResult.invalidTargets } },
            { $pull: { pushTokens: { $in: tokenResult.invalidTargets } } },
        );
    }
    if (fidResult.invalidTargets.length > 0) {
        await User.updateMany(
            { pushFids: { $in: fidResult.invalidTargets } },
            { $pull: { pushFids: { $in: fidResult.invalidTargets } } },
        );
    }

    return { sent, configured: true };
}

module.exports = { sendFeaturedVerseUpdate };
