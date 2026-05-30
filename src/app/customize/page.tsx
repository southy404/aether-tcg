

'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Warehouse } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio';
import { cosmeticItems, type CosmeticType, type CosmeticItem, FrameItem } from '@/lib/cosmetics';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/i18n';

export default function CustomizePage() {
    const { ownedCosmetics, equippedCosmetics, setEquippedCosmetic } = useAppContext();
    const { toast } = useToast();
    const { t, localizeCosmetic } = useI18n();
    const [inspectedCosmetic, setInspectedCosmetic] = useState<CosmeticItem | null>(null);
    const cosmeticName = (item?: CosmeticItem | null) => item ? localizeCosmetic(item).name : '';
    const cosmeticImage = (item: CosmeticItem) => 'img' in item ? item.img : '';

    const handleEquip = (itemId: string, type: CosmeticType) => {
        setEquippedCosmetic(type, itemId);
        playSound('selection');
        toast({ title: t('equippedSuccess') });
    }

    const handleInspect = (item: CosmeticItem) => {
        playSound('positive');
        setInspectedCosmetic(item);
    }

    const isAvatar = inspectedCosmetic?.id.startsWith('avatar');
    const isCoin = inspectedCosmetic?.id.startsWith('coin');
    const isFrame = inspectedCosmetic?.id.startsWith('frame');
    const isPlaymat = inspectedCosmetic?.id.startsWith('playmat');
    const equippedAvatar = cosmeticItems.avatars.find(a => a.id === equippedCosmetics.avatar);


  return (
    <>
      <Dialog open={!!inspectedCosmetic} onOpenChange={(open) => !open && setInspectedCosmetic(null)}>
        <DialogContent className="bg-transparent border-none shadow-none max-w-fit w-full flex flex-col items-center p-0">
          {inspectedCosmetic && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{cosmeticName(inspectedCosmetic)}</DialogTitle>
              </DialogHeader>
              <div className="relative">
                 {isAvatar ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-primary shadow-lg">
                           <Image src={cosmeticImage(inspectedCosmetic)} alt={cosmeticName(inspectedCosmetic)} fill className="object-cover" />
                        </div>
                        <h3 className="text-3xl font-bold text-white text-center" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{cosmeticName(inspectedCosmetic)}</h3>
                    </div>
                 ) : isCoin ? (
                     <div className="flex flex-col items-center gap-4">
                        <div className="coin-preview-wrapper w-64 h-64 md:w-80 md:h-80">
                            <div className="coin-preview">
                                <div className="coin-preview-side front">
                                    <img src={(inspectedCosmetic as any).imgHead} alt={cosmeticName(inspectedCosmetic)} />
                                </div>
                                <div className="coin-preview-side back">
                                    <img src={(inspectedCosmetic as any).imgTail} alt={cosmeticName(inspectedCosmetic)} />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white text-center" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{cosmeticName(inspectedCosmetic)}</h3>
                    </div>
                 ) : isFrame ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="avatar-container" style={{ transform: 'scale(1.8)'}}>
                            {(inspectedCosmetic as FrameItem).glowColor && (
                                <div className="back-aura" style={{ '--glow-color': (inspectedCosmetic as FrameItem).glowColor } as React.CSSProperties} />
                            )}
                            {(inspectedCosmetic as FrameItem).particleEffect && (
                                <div className={cn("particle-wrap", (inspectedCosmetic as FrameItem).particleEffect)} style={{ filter: `drop-shadow(0 0 5px ${(inspectedCosmetic as FrameItem).glowColor || '#fff'})` }}>
                                    <div className="p-dot p1" /><div className="p-dot p2" /><div className="p-dot p3" /><div className="p-dot p4" /><div className="p-dot p5" />
                                </div>
                            )}
                            {inspectedCosmetic && <div className={cn("frame-base", (inspectedCosmetic as FrameItem).className)} />}
                            <div className={cn("avatar-content", (inspectedCosmetic as FrameItem).shine && "cosmetic-shine")}>
                                {(inspectedCosmetic as FrameItem).glowColor && (
                                    <div className="cosmetic-glow" style={{ '--glow-color': `${(inspectedCosmetic as FrameItem).glowColor}40` } as React.CSSProperties} />
                                )}
                                {equippedAvatar && <Image src={equippedAvatar.img} alt="User Avatar" fill className="object-cover" />}
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white text-center mt-8" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{cosmeticName(inspectedCosmetic)}</h3>
                    </div>
                 ) : isPlaymat ? (
                    <div className="relative aspect-video w-[min(90vw,640px)]">
                        <Image src={cosmeticImage(inspectedCosmetic)} alt={cosmeticName(inspectedCosmetic)} fill className="object-cover rounded-xl border-4 border-primary" />
                    </div>
                 ) : (
                    <div className="relative w-[300px] h-[435px] md:w-[350px] md:h-[510px]">
                        <Image src={cosmeticImage(inspectedCosmetic)} alt={cosmeticName(inspectedCosmetic)} fill className="object-cover rounded-xl border-4 border-primary" />
                    </div>
                 )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <Image 
            src="/ui/background/loading.png"
            alt="Cosmetics Shop"
            fill
            className="object-cover opacity-10 z-0"
            data-ai-hint="artistic background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>

        <div className="container relative z-10 mx-auto flex flex-col items-center p-4 py-12 text-center">
            <h1 className="mb-4 text-5xl font-bold tracking-wider title-gradient uppercase">{t('customizeTitle')}</h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
                {t('customizeDescription')}
            </p>

            <Tabs defaultValue="avatars" className="w-full max-w-7xl">
                <TabsList className="grid w-full grid-cols-6 mb-8">
                    <TabsTrigger value="avatars">{t('avatars')}</TabsTrigger>
                    <TabsTrigger value="frames">{t('frames')}</TabsTrigger>
                    <TabsTrigger value="effects">{t('effects')}</TabsTrigger>
                    <TabsTrigger value="cardBacks">{t('cardBacks')}</TabsTrigger>
                    <TabsTrigger value="coins">{t('coins')}</TabsTrigger>
                    <TabsTrigger value="playmats">{t('playmats')}</TabsTrigger>
                </TabsList>

                <TabsContent value="avatars">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.avatars.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.avatar === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center cursor-pointer p-2" onClick={() => handleInspect(item)}>
                                        <div className="relative h-32 w-32 transition-transform duration-500 group-hover:scale-110">
                                            <Image src={item.img} alt={cosmeticName(item)} fill className="object-cover rounded-full border-4 border-primary/50" data-ai-hint={item.hint} />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'avatar')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
                
                <TabsContent value="frames">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.frames.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.frame === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center p-2 cursor-pointer" onClick={() => handleInspect(item)}>
                                        <div className="avatar-container" style={{transform: 'scale(0.9)'}}>
                                            {(item as FrameItem).glowColor && (
                                                <div className="back-aura" style={{ '--glow-color': (item as FrameItem).glowColor } as React.CSSProperties} />
                                            )}
                                            {(item as FrameItem).particleEffect && (
                                                <div className={cn("particle-wrap", (item as FrameItem).particleEffect)} style={{ filter: `drop-shadow(0 0 5px ${(item as FrameItem).glowColor || '#fff'})` }}>
                                                    <div className="p-dot p1" /><div className="p-dot p2" /><div className="p-dot p3" /><div className="p-dot p4" /><div className="p-dot p5" />
                                                </div>
                                            )}
                                            {item && <div className={cn("frame-base", (item as FrameItem).className)} />}
                                            <div className={cn("avatar-content", (item as FrameItem).shine && "cosmetic-shine")}>
                                                {(item as FrameItem).glowColor && (
                                                    <div className="cosmetic-glow" style={{ '--glow-color': `${(item as FrameItem).glowColor}40` } as React.CSSProperties} />
                                                )}
                                                <div className="w-full h-full bg-card"></div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'frame')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="effects">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.effects.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.effect === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center cursor-pointer p-2">
                                         <div className="relative h-32 w-32 transition-transform duration-500 group-hover:scale-110 bg-black/20 rounded-full flex items-center justify-center">
                                            {item.id === 'effect_1' && <span className="text-sm text-muted-foreground">{t('noEffect')}</span>}
                                            {item.id === 'effect_2' && <div className="w-24 h-24 bg-red-500/30 rounded-full animate-pulse blur-sm flex items-center justify-center text-center p-2"><span className="text-sm text-white/80">{cosmeticName(item)}</span></div>}
                                            {item.id === 'effect_3' && <div className="w-24 h-24 bg-blue-500/40 rounded-full animate-pulse blur-md flex items-center justify-center text-center p-2"><span className="text-sm text-white/80">{cosmeticName(item)}</span></div>}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'effect')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="cardBacks">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {cosmeticItems.cardBacks.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.cardBack === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center p-2 cursor-pointer" onClick={() => handleInspect(item)}>
                                        <div className="relative h-48 w-32 transition-transform duration-500 group-hover:scale-105">
                                            <Image src={item.img} alt={cosmeticName(item)} fill className="object-cover rounded-lg border-2 border-primary/50" data-ai-hint={item.hint}/>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'cardBack')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="coins">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.coins.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.coin === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center cursor-pointer p-2" onClick={() => handleInspect(item)}>
                                       <div className="coin-preview-wrapper transition-transform duration-500">
                                          <div className="coin-preview">
                                            <div className="coin-preview-side front">
                                                <img src={item.imgHead} alt={cosmeticName(item)} />
                                            </div>
                                            <div className="coin-preview-side back">
                                                <img src={item.imgTail} alt={cosmeticName(item)} />
                                            </div>
                                          </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'coin')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                 <TabsContent value="playmats">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {cosmeticItems.playmats.filter(item => ownedCosmetics.includes(item.id)).map((item) => {
                            const isEquipped = equippedCosmetics.playmat === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center p-3 cursor-pointer" onClick={() => handleInspect(item)}>
                                        <div className="relative aspect-video w-full max-w-xs transition-transform duration-500 group-hover:scale-105">
                                            <Image src={item.img} alt={cosmeticName(item)} fill className="object-cover rounded-lg border-2 border-primary/50" data-ai-hint={item.hint}/>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleEquip(item.id, 'playmat')}
                                            disabled={isEquipped}
                                        >
                                            {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

            </Tabs>

            <Link href="/game" passHref className="inline-block mt-16">
                <Button variant="tcg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToMainMenu')}
                </Button>
            </Link>
        </div>
      </div>
    </>
  );
}
    

    

    
