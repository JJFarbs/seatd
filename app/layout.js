import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: "Seat'd — Tables. Not phone calls.",
  description: 'Book club tables, pay upfront, skip the queue.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: "Seat'd" },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0710',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
