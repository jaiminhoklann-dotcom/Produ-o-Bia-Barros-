const VERSION='bia-barros-producao-sync-v6';
const BASE=self.registration.scope;
const FILES=['./','./index.html','./app.js','./style.css','./logo.png','./icon.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',ev=>ev.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',ev=>ev.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',ev=>{if(ev.request.method!=='GET'||new URL(ev.request.url).origin!==self.location.origin)return;ev.respondWith(fetch(ev.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(ev.request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(ev.request).then(cache=>cache||caches.match('./index.html'))));});
