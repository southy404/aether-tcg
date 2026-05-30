

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { playSound } from '@/lib/audio';
import { useI18n } from '@/i18n';

const goldPackages = [
    {
        name: '500 Gold',
        amount: 500,
        bonus: null,
        price: '4,99 €',
        image: '/coins.png',
        popular: false,
    },
    {
        name: '1200 Gold',
        amount: 1200,
        bonus: '1000 + 200 Bonus!',
        price: '9,99 €',
        image: '/coins-xl.png',
        popular: true,
    },
    {
        name: '3000 Gold',
        amount: 3000,
        bonus: null,
        price: '19,99 €',
        image: '/coins-xxl.png',
        popular: false,
    }
];

export default function GoldShopPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <Image 
            src="/ui/background/loading-2.jpg" 
            alt="Fantasy Market"
            fill
            className="object-cover opacity-10 z-0"
            data-ai-hint="fantasy market"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>
        
        <div className="container relative z-10 mx-auto flex flex-col items-center justify-center p-4 py-12 text-center">
            <h1 className="mb-4 text-5xl font-bold tracking-wider title-gradient uppercase">{t('goldShop')}</h1>
            <p className="text-lg text-muted-foreground mb-12">{t('goldShopDescription')}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
                {goldPackages.map((pkg) => (
                    <Card 
                        key={pkg.name} 
                        className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl"
                        onMouseEnter={() => playSound('positive')}
                    >
                        {pkg.popular && (
                             <div className="absolute top-0 right-4 -mt-3 bg-primary px-4 py-1.5 rounded-md text-sm font-bold text-primary-foreground shadow-lg z-20">
                                {t('popular')}
                            </div>
                        )}
                        <div className="rounded-t-lg">
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                                <CardDescription>{pkg.bonus || `${pkg.amount.toLocaleString('de-DE')} Gold`}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <div className="relative h-48 w-48 transition-transform duration-500 group-hover:scale-110">
                                    <Image src={pkg.image} alt={pkg.name} fill className="object-contain" />
                                </div>
                            </CardContent>
                        </div>
                        <CardFooter className="p-4">
                            <Button 
                                size="lg" 
                                className="w-full text-lg font-bold" 
                                onClick={() => playSound('selection')}
                            >
                                {t('buyPrice', { price: pkg.price })}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Link href="/shop" passHref className="inline-block mt-16">
                <Button variant="tcg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToShopOverview')}
                </Button>
            </Link>
        </div>
      </div>
    </>
  );
}
