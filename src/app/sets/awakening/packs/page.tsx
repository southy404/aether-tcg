"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  ArrowLeft,
  Flame,
  Waves,
  Leaf,
  Zap,
  Coins,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Element } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

const GOLD_COST = 100;
const MERIT_COST = 1000;
const PACK_SIZE = 5;
const SET_NAME = "AWAKENING";

const elementPacks: { element: Element; img: string; hint: string }[] = [
  {
    element: "Feuer",
    img: "/set/awakening/booster-awakening-fire.png",
    hint: "fire booster pack",
  },
  {
    element: "Wasser",
    img: "/set/awakening/booster-awakening-water.png",
    hint: "water booster pack",
  },
  {
    element: "Aether",
    img: "/set/awakening/aether-booster-new.png",
    hint: "aether booster pack",
  },
  {
    element: "Erde",
    img: "/set/awakening/booster-awakening-earth.png",
    hint: "nature booster pack",
  },
  {
    element: "Luft",
    img: "/set/awakening/booster-awakening-air.png",
    hint: "air booster pack",
  },
];

const PackDisplay = ({
  pack,
  onClick,
}: {
  pack: (typeof elementPacks)[0];
  onClick: () => void;
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const { element } = useI18n();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const rX =
      ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -6;
    const rY =
      ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 6;

    setStyle({
      transform: `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale(1.05)`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
    });
  };

  return (
    <div
      className="w-full aspect-[9/12] cursor-pointer group/wrap"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-full h-full relative transition-transform duration-100 ease-out"
        style={style}
      >
        <Image
          src={pack.img}
          alt={`${SET_NAME} ${element(pack.element)} Pack`}
          fill
          className="object-contain drop-shadow-2xl"
          data-ai-hint={pack.hint}
        />
      </div>
    </div>
  );
};

export default function PacksPage() {
  const { gold, gems, spendGold, spendMerits } = useAppContext();
  const { toast } = useToast();
  const { t, element } = useI18n();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [packToBuy, setPackToBuy] = useState<Element | null>(null);
  const router = useRouter();

  const handleBuyClick = (element: Element) => {
    setPackToBuy(element);
    setShowBuyDialog(true);
  };

  const purchaseWithGold = () => {
    if (gold < GOLD_COST) {
      toast({
        title: t("notEnoughGoldTitle"),
        description: t("needGold", { amount: GOLD_COST }),
        variant: "destructive",
      });
      return;
    }
    // spendGold updates both local state and Firestore. Without persisting, the Firestore
    // snapshot listener would resync the old (un-deducted) balance on the next tick.
    if (!spendGold(GOLD_COST)) {
      toast({
        title: t("notEnoughGoldTitle"),
        description: t("needGold", { amount: GOLD_COST }),
        variant: "destructive",
      });
      return;
    }
    finalizePurchase();
  };

  const purchaseWithMerits = () => {
    if (gems < MERIT_COST) {
      toast({
        title: t("notEnoughMeritsTitle"),
        description: t("needMerits", { amount: MERIT_COST }),
        variant: "destructive",
      });
      return;
    }
    if (!spendMerits(MERIT_COST)) {
      toast({
        title: t("notEnoughMeritsTitle"),
        description: t("needMerits", { amount: MERIT_COST }),
        variant: "destructive",
      });
      return;
    }
    finalizePurchase();
  };

  const finalizePurchase = () => {
    if (packToBuy) {
      router.push(`/sets/awakening/open-pack?element=${packToBuy}`);
    }
    setShowBuyDialog(false);
    setPackToBuy(null);
  };

  return (
    <>
      <AlertDialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <AlertDialogContent className="bg-background/95 border-primary max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-center">
              {t("packBuy")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t("choosePayment", {
                pack: packToBuy ? element(packToBuy) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            <Button
              variant="outline"
              className="flex flex-col h-24 gap-2 border-yellow-500/50 hover:bg-yellow-500/10"
              onClick={purchaseWithGold}
            >
              <div className="flex items-center gap-2 text-yellow-500">
                <Coins className="h-5 w-5" />
                <span className="font-bold text-lg">{GOLD_COST}</span>
              </div>
              <span className="text-xs uppercase opacity-70">
                {t("withGold")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-24 gap-2 border-cyan-500/50 hover:bg-cyan-500/10"
              onClick={purchaseWithMerits}
            >
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="h-5 w-5" />
                <span className="font-bold text-lg">{MERIT_COST}</span>
              </div>
              <span className="text-xs uppercase opacity-70">
                {t("withMerits")}
              </span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="w-full"
              onClick={() => setPackToBuy(null)}
            >
              {t("cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto flex flex-col items-center justify-center p-4 py-12 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-wider title-gradient uppercase">
          {t("cardPacks")}
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          {t("acquireCards")}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-4 max-w-7xl w-full">
          {elementPacks.map((pack) => (
            <div
              key={pack.element}
              className="flex flex-col items-center gap-2"
            >
              <PackDisplay
                pack={pack}
                onClick={() => handleBuyClick(pack.element)}
              />
              <p className="text-xs text-white/70 mt-1">
                {t("containsCards", { count: PACK_SIZE })}
              </p>
              <div className="flex flex-col items-center gap-1 mt-2">
                <div className="flex items-center gap-2 text-sm font-bold text-yellow-500">
                  <Coins className="h-4 w-4" />
                  <span>{GOLD_COST} Gold</span>
                </div>
                <div className="text-xs text-muted-foreground">{t("or")}</div>
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                  <span>{MERIT_COST} Merits</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="text-white/70 hover:text-primary p-0 h-auto text-[10px] mt-2"
                    >
                      {t("contentsOdds")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("packContentsOdds")}</DialogTitle>
                      <DialogDescription>
                        {t("awakeningPackStructure")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm space-y-4">
                      <div>
                        <h3 className="font-bold mb-2">{t("packStructure")}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>
                            <span className="font-semibold text-foreground">
                              {t("aetherCard")}
                            </span>{" "}
                            {t("aetherCardDescription")}
                          </li>
                          <li>
                            <span className="font-semibold text-foreground">
                              {t("commonUncommonCards")}
                            </span>{" "}
                            {t("commonUncommonCardsDescription")}
                          </li>
                          <li>
                            <span className="font-semibold text-foreground">
                              {t("rarePlusCard")}
                            </span>{" "}
                            {t("rarePlusCardDescription")}
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-bold mb-2">{t("elementFocus")}</h3>
                        <p className="text-muted-foreground">
                          {t("elementFocusDescription")}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-bold mb-2">{t("rarityOdds")}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>
                            <span className="font-semibold text-green-400">
                              {t("uncommonOdds")}
                            </span>
                          </li>
                          <li>
                            <span className="font-semibold text-purple-400">
                              {t("epicOdds")}
                            </span>
                          </li>
                          <li>
                            <span className="font-semibold text-yellow-400">
                              {t("legendaryOdds")}
                            </span>
                          </li>
                          <li>
                            <span className="font-semibold text-red-500">
                              {t("godOdds")}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>

        <Alert className="max-w-4xl mt-12 bg-background/50 border-primary/20">
          <AlertTitle className="text-center font-bold text-primary">
            {t("starterSupport")}
          </AlertTitle>
          <AlertDescription className="text-center">
            {t("starterSupportDescription")}
          </AlertDescription>
        </Alert>

        <Link href="/sets" passHref className="inline-block mt-16">
          <Button variant="tcg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToSetSelection")}
          </Button>
        </Link>
      </div>
    </>
  );
}
