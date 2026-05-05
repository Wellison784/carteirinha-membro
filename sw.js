const CACHE_NAME = 'comunidade-v2'; // Mudei de v1 para v2 para forçar a atualização

// Ajustei para caminhos relativos (./) que funcionam em qualquer lugar
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './logo.jpeg',
  './icon-192.png',
  './icon-512.png'
];

// Instalando o Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usamos um mapeamento para adicionar um por um.
      // Assim, se um ícone estiver faltando, ele não trava o resto do cache.
      return Promise.all(
        assets.map(url => {
          return cache.add(url).catch(err => {
            console.warn('Arquivo não encontrado para o cache:', url);
          });
        })
      );
    })
  );
});

// Ativando e limpando caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  console.log('PWA: Service Worker ativo e atualizado!');
});

// Estratégia de Cache First (Offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});