
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavVisible, setIsNavVisible] = useState(true);
  
  // Hide Header/Footer on root, game board, and pack opening screen.
  const isImmersiveRoute = 
    pathname === '/' || 
    (pathname.startsWith('/play/') && !pathname.endsWith('/play')) || 
    pathname.includes('/open-pack');

  useEffect(() => {
    if (isImmersiveRoute) {
      setIsNavVisible(true);
      return;
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.closest('a')) {
        e.preventDefault();
        setIsNavVisible(prev => !prev);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [pathname, isImmersiveRoute]);

  if (isImmersiveRoute) {
    return <main className="flex-grow">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {isNavVisible && <Header />}
      <main className="flex-grow">{children}</main>
      {isNavVisible && <Footer />}
    </div>
  );
};
