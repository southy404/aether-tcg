 'use client';

import Link from "next/link";
import Image from "next/image";
import { BookText, Twitter } from "lucide-react";
import { useI18n } from "@/i18n";

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M20.3,3.3C18.8,2.5,17.2,2,15.5,1.7C15.3,2.3,15.1,3,14.9,3.6c-1.8-0.3-3.6-0.3-5.4,0C9.3,3,9.1,2.3,8.9,1.7C7.2,2,5.6,2.5,4.1,3.3C1.6,7.2,1.8,11.1,4.4,13.9c1.4,1.5,3.2,2.5,5,3.1c0.2-0.5,0.4-1,0.6-1.5c-0.5-0.2-1-0.5-1.5-0.8c-1.2-0.7-2.3-1.6-3.1-2.9c-0.2-0.2-0.2-0.5,0-0.7c0.2-0.2,0.5-0.2,0.7,0c0,0,0,0,0,0c0.4,0.4,0.8,0.7,1.2,1c0.1,0.1,0.2,0.1,0.3,0.1c2.1,1.2,4.5,1.2,6.7,0c0.1,0,0.2,0,0.3-0.1c0.4-0.3,0.8-0.6,1.2-1c0.2-0.2,0.5-0.2,0.7,0c0.2,0.2,0.2,0.5,0,0.7c-0.8,1.3-1.9,2.2-3.1,2.9c-0.5,0.3-1,0.6-1.5,0.8c0.2,0.5,0.4,1,0.6,1.5c1.8-0.6,3.6-1.6,5-3.1C22.6,11.1,22.8,7.2,20.3,3.3z M8.5,11.2c-0.9,0-1.7-0.8-1.7-1.8s0.8-1.8,1.7-1.8s1.7,0.8,1.7,1.8S9.4,11.2,8.5,11.2z M15.9,11.2c-0.9,0-1.7-0.8-1.7-1.8s0.8-1.8,1.7-1.8s1.7,0.8,1.7,1.8S16.8,11.2,15.9,11.2z"/>
    </svg>
)

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-background border-t border-border/50">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/game" className="flex items-center gap-3">
              <Image src={`/logo.png?v=2`} alt="AETHER Logo" width={150} height={31} className="h-auto w-[150px]" />
            </Link>
            <p className="text-muted-foreground mt-4 text-sm">
              &copy; {new Date().getFullYear()} AETHER Card Game. {t('copyright')}
            </p>
          </div>
          <div className="col-span-1 md:col-start-2">
            <h3 className="font-semibold text-primary tracking-wider uppercase">{t('help')}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="#" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
              <li><Link href="/rulebook" target="_blank" className="text-muted-foreground hover:text-primary">{t('rulebook')}</Link></li>
              <li><Link href="/roadmap" className="text-muted-foreground hover:text-primary">Roadmap</Link></li>
              <li><Link href="/arcade" className="text-muted-foreground hover:text-primary">{t('arcade')}</Link></li>
            </ul>
          </div>
          <div className="col-span-1">
             <h3 className="font-semibold text-primary tracking-wider uppercase">{t('legal')}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="#" className="text-muted-foreground hover:text-primary">{t('terms')}</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary">{t('privacy')}</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary">{t('imprint')}</Link></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h3 className="font-semibold text-primary tracking-wider uppercase">Community</h3>
            <div className="flex mt-4 space-x-4">
              <Link href="#" target="_blank" aria-label="X (Twitter)">
                <Twitter className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
              <Link href="#" target="_blank" aria-label="Discord">
                <DiscordIcon className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
