'use client';

import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { Manrope } from 'next/font/google';
import AudioProvider from '@/context/AudioProvider';
import React from 'react';
import ConditionalLayout from '@/components/ConditionalLayout';
import AetherCursor from '@/components/AetherCursor';
import AuthGuard from '@/components/AuthGuard';
import { FirebaseClientProvider } from '@/firebase';
import { I18nProvider } from '@/i18n';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} dark`}>
       <head>
        <title>AETHER: THE FIFTH ELEMENT</title>
        <meta name="description" content="Official Card Game" />
      </head>
      <body className="font-body antialiased overflow-x-hidden">
        <AetherCursor />
        <FirebaseClientProvider>
          <I18nProvider>
            <AppProvider>
              <AudioProvider>
                <AuthGuard>
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                </AuthGuard>
                <Toaster />
              </AudioProvider>
            </AppProvider>
          </I18nProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
