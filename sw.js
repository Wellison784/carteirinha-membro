const CACHE_NAME = 'comunidade-v1';
const assets = [
  '/carteirinha-membro/',
  '/carteirinha-membro/index.html',
  '/carteirinha-membro/style.css',
  '/carteirinha-membro/script.js',
  '/carteirinha-membro/icon-192.png',
  '/carteirinha-membro/icon-512.png'
];

// Instalando o Service Worker e armazenando arquivos em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Ativando e limpando caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker ativo');
});

// Respondendo requisições (Offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});