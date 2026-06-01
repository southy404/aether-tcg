'use client';

import { useState, useMemo } from 'react';
import { MASTER_DB } from '@/lib/cards';
import type { CardData, CardType, Rarity, Element, InspectedCard } from '@/lib/types';
import Card from '@/components/Card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { Plus, Search, Trash2, ArrowLeft, User as UserIcon } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import CardDetailModal from '@/components/game/CardDetailModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, addDoc, deleteDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useI18n } from '@/i18n';

const LOCALE_MAP: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES' };

export default function MarketplacePage() {
  const { gold, inventory, getCardById, username } = useAppContext();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, language, cardType: tCardType, rarity: tRarity, element: tElement, localizeCard } = useI18n();
  const numberLocale = LOCALE_MAP[language] ?? 'en-US';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('price-asc');
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [elementFilter, setElementFilter] = useState<Element | 'all'>('all');

  const [inspectedCard, setInspectedCard] = useState<InspectedCard | null>(null);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [cardToSell, setCardToSell] = useState<CardData | null>(null);
  const [sellPrice, setCardSellPrice] = useState<number>(100);
  const [itemToBuy, setItemToBuy] = useState<any | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState(false);

  // Firestore Real-time Listings
  const listingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'marketListings'), where('status', '==', 'Active'));
  }, [firestore]);

  const { data: rawListings, isLoading: listingsLoading } = useCollection(listingsQuery);

  // Merge listing + card data. We keep the *card's* numeric id under `id` (other components
  // such as <CardDetailModal /> branch on `card.id === 5` for focus abilities etc.) and store
  // the Firestore document id under `listingId` for delete/update calls.
  //
  // The earlier code did `{ ...l, ...cardData }` which spread the card LAST, so the card's
  // numeric id silently clobbered the listing's Firestore id. Then `doc(firestore, 'marketListings', listing.id)`
  // got handed a number and Firestore exploded with "n.indexOf is not a function" trying to
  // validate the path segment.
  const listings = useMemo(() => {
    if (!rawListings) return [];
    return rawListings.map((l: any) => {
      const { id: docId, ...listingFields } = l;
      const cardData = getCardById(l.cardId);
      const localizedCardData = cardData ? localizeCard(cardData) : null;
      return {
        ...cardData,
        ...localizedCardData,
        ...listingFields,
        listingId: docId,
      };
    });
  }, [rawListings, getCardById, localizeCard]);

  const availableElements: Element[] = useMemo(() => {
    const elements = MASTER_DB.map(c => c.element);
    return [...new Set(elements)];
  }, []);

  const filteredAndSortedListings = useMemo(() => {
    let filtered = listings;

    if (searchTerm) {
      filtered = filtered.filter((l: any) =>
        l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter((l: any) => l.type === typeFilter);
    if (rarityFilter !== 'all') filtered = filtered.filter((l: any) => l.rarity === rarityFilter);
    if (elementFilter !== 'all') filtered = filtered.filter((l: any) => l.element === elementFilter);

    return filtered.sort((a: any, b: any) => {
      switch (sortOrder) {
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'name-asc': return a.name?.localeCompare(b.name || '') || 0;
        case 'name-desc': return b.name?.localeCompare(a.name || '') || 0;
        default: return 0;
      }
    });
  }, [listings, searchTerm, sortOrder, typeFilter, rarityFilter, elementFilter]);

  // Inventory logic for Selling
  const inventoryCounts = useMemo(() => {
    return inventory.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [inventory]);

  const uniqueInventoryCards = useMemo(() => {
    return Array.from(new Set(inventory))
      .map(id => getCardById(id))
      .filter((c): c is CardData => !!c);
  }, [inventory, getCardById]);

  const handleListCard = () => {
    if (!cardToSell || !user || !firestore) return;

    playSound('selection');
    const listingData = {
      cardId: cardToSell.id,
      sellerId: user.uid,
      // Use the in-game username from AppContext, NOT the real-name Firebase displayName,
      // so listings respect the user's chosen Binder identity.
      sellerName: username || 'Binder',
      price: sellPrice,
      currencyType: 'Gold',
      status: 'Active',
      listedAt: new Date().toISOString(),
    };

    const listingsCol = collection(firestore, 'marketListings');
    addDoc(listingsCol, listingData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: listingsCol.path,
          operation: 'create',
          requestResourceData: listingData
        }));
      });

    // Update User Profile: Remove card from inventory
    const userRef = doc(firestore, 'users', user.uid);
    const newInventory = [...inventory];
    const index = newInventory.indexOf(cardToSell.id);
    if (index > -1) {
      newInventory.splice(index, 1);
      updateDoc(userRef, { inventory: newInventory })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: { inventory: newInventory }
          }));
        });
    }

    const cardName = localizeCard(cardToSell).name;
    toast({ title: t('cardListed'), description: t('cardListedDescription', { name: cardName }) });
    setShowSellDialog(false);
    setCardToSell(null);
  };

  const handleCancelListing = (listing: any) => {
    if (!user || !firestore || !listing.listingId) return;
    playSound('negative');

    const listingRef = doc(firestore, 'marketListings', listing.listingId);
    deleteDoc(listingRef)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: listingRef.path,
          operation: 'delete'
        }));
      });

    // Return card to user inventory
    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, {
      inventory: arrayUnion(listing.cardId)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { inventory: arrayUnion(listing.cardId) }
      }));
    });

    toast({ title: t('listingCancelled'), description: t('listingCancelledDescription') });
  };

  const handleBuyConfirm = () => {
    if (!itemToBuy || !user || !firestore) return;

    if (gold < itemToBuy.price) {
      toast({ variant: 'destructive', title: t('notEnoughGoldMarket'), description: t('notEnoughGoldDescriptionMarket') });
      return;
    }

    playSound('selection');

    const buyerRef = doc(firestore, 'users', user.uid);
    const sellerRef = doc(firestore, 'users', itemToBuy.sellerId);
    const listingRef = doc(firestore, 'marketListings', itemToBuy.listingId);

    // Perform transaction (Non-blocking)
    deleteDoc(listingRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: listingRef.path,
        operation: 'delete'
      }));
    });

    updateDoc(buyerRef, {
      gold: increment(-itemToBuy.price),
      inventory: arrayUnion(itemToBuy.cardId)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: buyerRef.path,
        operation: 'update',
        requestResourceData: { gold: increment(-itemToBuy.price), inventory: arrayUnion(itemToBuy.cardId) }
      }));
    });

    updateDoc(sellerRef, {
      gold: increment(itemToBuy.price)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sellerRef.path,
        operation: 'update',
        requestResourceData: { gold: increment(itemToBuy.price) }
      }));
    });

    toast({ title: t('purchaseSuccess'), description: t('purchaseSuccessDescription', { name: itemToBuy.name }) });
    setShowBuyDialog(false);
    setItemToBuy(null);
    playSound('positive');
  };

  const handleBuyClick = (listing: any) => {
    if (listing.sellerId === user?.uid) {
      handleCancelListing(listing);
      return;
    }
    setItemToBuy(listing);
    setShowBuyDialog(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <Image
          src="/ui/background/loading-3.jpg"
          alt="Marketplace Background"
          fill
          className="object-cover opacity-10 z-0"
          data-ai-hint="fantasy marketplace"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>

      <CardDetailModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
      />

      {/* Buy Confirmation Dialog */}
      <AlertDialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('purchaseConfirmTitleMarket')}</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToBuy ? t('purchaseConfirmDescriptionMarket', {
                name: itemToBuy.name,
                price: (itemToBuy.price ?? 0).toLocaleString(numberLocale),
                seller: itemToBuy.sellerName,
              }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBuyConfirm}>{t('yesBuy')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="max-w-4xl bg-background/95 border-primary">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('sellCardTitle')}</DialogTitle>
            <DialogDescription>{t('sellCardDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            <ScrollArea className="h-[400px] pr-4 border rounded-lg p-2 bg-black/20">
              <div className="grid grid-cols-2 gap-4">
                {uniqueInventoryCards.map(card => (
                  <div
                    key={card.id}
                    className={cn(
                      "relative cursor-pointer transition-all hover:scale-105",
                      cardToSell?.id === card.id && "ring-4 ring-primary rounded-xl"
                    )}
                    onClick={() => { setCardToSell(card); playSound('selection'); }}
                  >
                    <Card card={card} className="w-full h-auto aspect-[200/290]" disableHover={true} />
                    <Badge className="absolute top-2 right-2">x{inventoryCounts[card.id]}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex flex-col justify-between p-4 bg-muted/30 rounded-lg">
              {cardToSell ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-primary uppercase">{localizeCard(cardToSell).name}</h3>
                    <p className="text-sm text-muted-foreground">{tRarity(cardToSell.rarity)} | {tElement(cardToSell.element)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('pricePerCard')}</label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={1}
                        value={sellPrice}
                        onChange={(e) => setCardSellPrice(parseInt(e.target.value) || 0)}
                        className="text-2xl h-14 font-bold text-center"
                      />
                      <Image src="/coin.png" alt="Gold" width={40} height={40} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50 text-sm text-muted-foreground italic">
                    {t('listingHint')}
                  </div>
                  <Button size="lg" className="w-full h-16 text-xl" variant="tcg" onClick={handleListCard}>
                    {t('listCardAction')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                  <Search className="h-16 w-16 opacity-20" />
                  <p>{t('selectCardHint')}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container relative z-10 mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('marketplace')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('marketplaceSubtitle')}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card/80 backdrop-blur-sm rounded-lg border items-center shadow-xl border-primary/20">
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchCardPlaceholder')}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            <Select value={sortOrder} onValueChange={setSortOrder} modal={false}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder={t('sortLabel')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">{t('sortPriceAsc')}</SelectItem>
                <SelectItem value="price-desc">{t('sortPriceDesc')}</SelectItem>
                <SelectItem value="name-asc">{t('sortNameAsc')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} modal={false}>
              <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder={t('type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                <SelectItem value="Unit">{tCardType('Unit')}</SelectItem>
                <SelectItem value="Spell">{tCardType('Spell')}</SelectItem>
                <SelectItem value="Trap">{tCardType('Trap')}</SelectItem>
                <SelectItem value="Aether">{tCardType('Aether')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rarityFilter} onValueChange={(v) => setRarityFilter(v as any)} modal={false}>
              <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder={t('rarity')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRarities')}</SelectItem>
                <SelectItem value="Common">{tRarity('Common')}</SelectItem>
                <SelectItem value="Rare">{tRarity('Rare')}</SelectItem>
                <SelectItem value="Epic">{tRarity('Epic')}</SelectItem>
                <SelectItem value="Legendary">{tRarity('Legendary')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={elementFilter} onValueChange={(v) => setElementFilter(v as any)} modal={false}>
              <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder={t('element')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allElements')}</SelectItem>
                {availableElements.map(e => <SelectItem key={e} value={e}>{tElement(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="lg" className="w-full md:w-auto mt-4 md:mt-0" onClick={() => setShowSellDialog(true)}>
            <Plus className="mr-2 h-5 w-5"/>
            {t('sellAction')}
          </Button>
        </div>

        {listingsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse">{t('marketplaceLoading')}</p>
          </div>
        ) : filteredAndSortedListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedListings.map((listing: any) => (
              <div key={listing.listingId} className="group border-2 border-border/50 rounded-xl p-4 bg-card/80 backdrop-blur-sm flex flex-col transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
                <div onClick={() => setInspectedCard({ ...listing, instanceId: `market-${listing.listingId}` })} className="cursor-pointer mx-auto transform transition-transform group-hover:scale-105">
                  <Card card={listing as any} />
                </div>
                <div className="flex-grow flex flex-col mt-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-2">
                    <Link href={`/profile?userId=${listing.sellerId}`} target="_blank" className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                        <UserIcon className="h-3 w-3"/> {listing.sellerName}
                    </Link>
                    <span>{new Date(listing.listedAt).toLocaleDateString(numberLocale)}</span>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 bg-black/40 rounded-lg py-3 border border-border/50">
                      <span className="text-2xl font-black text-yellow-500 tracking-tighter">{listing.price?.toLocaleString(numberLocale)}</span>
                      <Image src="/coin.png" alt="Gold" width={24} height={24} />
                    </div>

                    {listing.sellerId === user?.uid ? (
                      <Button variant="destructive" className="w-full h-12 gap-2" onClick={() => handleCancelListing(listing)}>
                        <Trash2 className="h-4 w-4" /> {t('cancelListing')}
                      </Button>
                    ) : (
                      <Button className="w-full h-12 text-lg font-bold" variant="default" onClick={() => handleBuyClick(listing)}>
                        {t('buyNow')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
            <Search className="h-20 w-20 mx-auto opacity-10 mb-4" />
            <p className="text-2xl font-bold text-muted-foreground">{t('noListingsFound')}</p>
            <p className="text-muted-foreground mt-2">{t('noListingsHint')}</p>
          </div>
        )}

        <div className="text-center mt-16">
          <Link href="/game">
            <Button variant="tcg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToMainMenu')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
