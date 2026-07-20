import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Instant Tailwind engine injector */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="bg-slate-900 text-slate-100 min-h-screen font-sans">
        <header className="border-b border-slate-800 p-4 max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">ARVENIQ AI</h1>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Trade Operations MVP</span>
        </header>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}