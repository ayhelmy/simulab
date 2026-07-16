import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AntdProvider from '@/components/AntdProvider';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bedo SimuLearn — Simulation-Based Learning',
  description: 'Virtual lab simulations integrated with course management.',
  
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body>
        <AntdRegistry>
          <AntdProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </AuthProvider>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
