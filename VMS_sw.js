// ABMH Visitor Management — Service Worker with FCM
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:"AIzaSyDzPlIQKB_7tZfH12dQfraq6avwQv_vKNg",
  authDomain:"abmh-vms.firebaseapp.com",
  projectId:"abmh-vms",
  storageBucket:"abmh-vms.firebasestorage.app",
  messagingSenderId:"1044748365663",
  appId:"1:1044748365663:web:795ef4d373df75018590ea",
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  const n=payload.notification||{};
  self.registration.showNotification(n.title||'ABMH VMS - Visitor Waiting',{
    body:n.body||'A visitor is waiting for your approval',
    icon:'/icon-192.png',
    badge:'/icon-192.png',
    vibrate:[200,100,200,100,200],
    tag:'visitor-approval',
    requireInteraction:true,
    actions:[
      {action:'view',title:'View & Approve'}
    ]
  });
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('abmh-vms')&&'focus' in c)return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
