// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
    apiKey: "AIzaSyBJ1YopHxP78CvQARIbf65QzOBGZxxgA4A",
    authDomain: "wispr.mn",
    projectId: "studio-7612144134-fcc76",
    storageBucket: "studio-7612144134-fcc76.firebasestorage.app",
    messagingSenderId: "336714023784",
    appId: "1:336714023784:web:4190c771fc83e14eeb4cdd",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize notification here
    const notificationTitle = payload.notification?.title || 'Wispr';
    const notificationOptions = {
        body: payload.notification?.body || 'Танд шинэ мэдэгдэл ирлээ.',
        icon: '/icon-192x192.png', // Make sure this exists, or use standard paths
        badge: '/icon-192x192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add click event listener to handle notification clicks
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Default to the origin if no URL is provided in the payload data
    let urlToOpen = new URL('/', self.location.origin).href;

    if (event.notification.data && event.notification.data.url) {
        urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
    } else if (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.url) {
        urlToOpen = new URL(event.notification.data.FCM_MSG.data.url, self.location.origin).href;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // If so, focus it. Let's just focus any client from our origin first. 
                // But specifically exact URL match is best. If none, focus any of our app and navigate? 
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If we didn't return, check if ANY client is from our origin to focus.
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client && 'navigate' in client) {
                    return client.focus().then(c => c.navigate(urlToOpen));
                }
            }

            // If not open, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
