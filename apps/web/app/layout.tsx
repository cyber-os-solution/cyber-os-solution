import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CYBER-OS',
  description: 'Plataforma de operações para negócios.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
