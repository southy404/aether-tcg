
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
import { cosmeticItems, type CosmeticItem, type CosmeticType, FrameItem } from '@/lib/cosmetics';
import { useI18n } from '@/i18n';


export default function CosmeticsPage() {
    const { gems, setGems, ownedCosmetics, addOwnedCosmetic, equippedCosmetics, setEquippedCosmetic } = useAppContext();
    const { toast } = useToast();
    const { t, localizeCosmetic } = useI18n();
    const [inspectedCosmetic, setInspectedCosmetic] = useState<CosmeticItem | null>(null);
    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
    const [itemToPurchase, setItemToPurchase] = useState<{item: CosmeticItem, type: CosmeticType} | null>(null);
    const cosmeticName = (item?: CosmeticItem | null) => item ? localizeCosmetic(item).name : '';
    const cosmeticImage = (item: CosmeticItem) => 'img' in item ? item.img : '';

    const handlePurchase = (item: CosmeticItem, type: CosmeticType) => {
        if (gems < item.price) {
            toast({ title: t('notEnoughMeritsTitle'), description: t('needMerits', { amount: item.price }), variant: 'destructive' });
            playSound('negative');
            return;
        }
        setGems(g => g - item.price);
        addOwnedCosmetic(item.id);
        setEquippedCosmetic(type, item.id);
        toast({ title: t('purchaseSuccessfulTitle'), description: t('purchaseSuccessfulDescription', { item: cosmeticName(item) }) });
        playSound('positive');
    }

    const handlePurchaseClick = (item: CosmeticItem, type: CosmeticType) => {
      playSound('selection');
      setItemToPurchase({item, type});
      setShowPurchaseDialog(true);
    }
    
    const confirmPurchase = () => {
        if (itemToPurchase) {
            handlePurchase(itemToPurchase.item, itemToPurchase.type);
        }
    }

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
                        <div 
                            className="relative flex items-center justify-center"
                            style={{ 
                                width: `${(inspectedCosmetic as FrameItem).previewSize || 250}px`, 
                                height: `${(inspectedCosmetic as FrameItem).previewSize || 250}px` 
                            }}
                        >
                             {(inspectedCosmetic as FrameItem).particleEffect && (
                                <div className={cn("particle-wrap", (inspectedCosmetic as FrameItem).particleEffect)}>
                                    <div className="p-dot p1"></div><div className="p-dot p2"></div><div className="p-dot p3"></div><div className="p-dot p4"></div>
                                </div>
                            )}
                            <div className={cn("frame-base", (inspectedCosmetic as FrameItem).className)}></div>
                            <div 
                                className="relative z-10 rounded-full overflow-hidden bg-background"
                                style={{
                                     width: '100%', 
                                     height: '100%'
                                }}
                            >
                                {equippedAvatar && <Image src={equippedAvatar.img} alt="User Avatar" fill className="object-cover" />}
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white text-center" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{cosmeticName(inspectedCosmetic)}</h3>
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
      <AlertDialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>{t('purchaseConfirmTitle')}</AlertDialogTitleComponent>
            <AlertDialogDescription>
              {t('purchaseConfirmDescription', { item: cosmeticName(itemToPurchase?.item), price: itemToPurchase?.item.price ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('no')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurchase}>{t('buyConfirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <Image 
            src="/ui/background/loading-3.jpg" 
            alt="Cosmetics Shop"
            fill
            className="object-cover opacity-10 z-0"
            data-ai-hint="artistic background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>

        <div className="container relative z-10 mx-auto flex flex-col items-center p-4 py-12 text-center">
            <h1 className="mb-4 text-5xl font-bold tracking-wider title-gradient uppercase">{t('shopCosmetics')}</h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
                {t('shopCosmeticsDescription')}
            </p>

            <Tabs defaultValue="avatars" className="w-full max-w-7xl">
                <TabsList className="grid w-full grid-cols-6 mb-8 bg-background/30 backdrop-blur-sm">
                    <TabsTrigger value="avatars">{t('avatars')}</TabsTrigger>
                    <TabsTrigger value="frames">{t('frames')}</TabsTrigger>
                    <TabsTrigger value="effects">{t('effects')}</TabsTrigger>
                    <TabsTrigger value="cardBacks">{t('cardBacks')}</TabsTrigger>
                    <TabsTrigger value="coins">{t('coins')}</TabsTrigger>
                    <TabsTrigger value="playmats">{t('playmats')}</TabsTrigger>
                </TabsList>

                <TabsContent value="avatars">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.avatars.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
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
                                        {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'avatar')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'avatar')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
                
                <TabsContent value="frames">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.frames.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
                            const isEquipped = equippedCosmetics.frame === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                     <CardContent className="flex justify-center items-center cursor-pointer p-2" onClick={() => handleInspect(item)}>
                                        <div className="relative h-32 w-32 transition-transform duration-500 group-hover:scale-110 flex items-center justify-center">
                                            {item.particleEffect && (
                                                <div className={cn("particle-wrap", item.particleEffect)}>
                                                    <div className="p-dot p1"></div><div className="p-dot p2"></div><div className="p-dot p3"></div><div className="p-dot p4"></div>
                                                </div>
                                            )}
                                             <div className="w-32 h-32 rounded-full bg-background/50 flex items-center justify-center">
                                                <div className={cn("frame-base", (item as any).className)}></div>
                                                <div className="w-[90%] h-[90%] rounded-full border-2 border-border bg-card z-10"></div>
                                             </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                       {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'frame')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'frame')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="effects">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.effects.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
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
                                        {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'effect')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'effect')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
                
                <TabsContent value="cardBacks">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {cosmeticItems.cardBacks.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
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
                                        <div className="relative h-48 w-32 transition-transform duration-500">
                                            <Image src={item.img} alt={cosmeticName(item)} fill className="object-cover rounded-lg border-2 border-primary/50" data-ai-hint={item.hint}/>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'cardBack')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'cardBack')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="coins">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cosmeticItems.coins.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
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
                                        {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'coin')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'coin')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                 <TabsContent value="playmats">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {cosmeticItems.playmats.map((item) => {
                            const isOwned = ownedCosmetics.includes(item.id);
                            const isEquipped = equippedCosmetics.playmat === item.id;
                            return (
                                <Card 
                                    key={item.id} 
                                    className="shop-tile group relative bg-card/80 backdrop-blur-sm border-2 border-border/50 transition-all duration-300 hover:border-primary hover:shadow-primary/20 hover:shadow-2xl overflow-hidden"
                                >
                                    <CardHeader className="text-center">
                                        <CardTitle>{cosmeticName(item)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center cursor-pointer p-3" onClick={() => handleInspect(item)}>
                                        <div className="relative aspect-video w-full max-w-xs transition-transform duration-500 group-hover:scale-105">
                                            <Image src={item.img} alt={cosmeticName(item)} fill className="object-cover rounded-lg border-2 border-primary/50" data-ai-hint={item.hint}/>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        {isOwned ? (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleEquip(item.id, 'playmat')}
                                                disabled={isEquipped}
                                            >
                                                {isEquipped ? <><CheckCircle className="mr-2 h-4 w-4"/> {t('equipped')}</> : t('equip')}
                                            </Button>
                                        ) : (
                                            <Button className="w-full" onClick={() => handlePurchaseClick(item, 'playmat')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>{item.price}</span>
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

            </Tabs>

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
