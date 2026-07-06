export default function manifest() {
  return {
    name: "Seat'd",
    short_name: "Seat'd",
    description: 'Book club tables, pay upfront, skip the queue.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0710',
    theme_color: '#0B0710',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
