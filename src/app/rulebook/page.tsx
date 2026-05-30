
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Swords, Heart, Star, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Card from "@/components/Card";
import { MASTER_DB } from "@/lib/cards";
import { useI18n, type TranslationKey } from "@/i18n";

const faqItems: Array<{ question: TranslationKey; answer: TranslationKey }> = [
    { question: 'faqWinQuestion', answer: 'faqWinAnswer' },
    { question: 'faqAetherQuestion', answer: 'faqAetherAnswer' },
    { question: 'faqOverchargeQuestion', answer: 'faqOverchargeAnswer' },
    { question: 'faqUnitsQuestion', answer: 'faqUnitsAnswer' },
    { question: 'faqStatsQuestion', answer: 'faqStatsAnswer' },
    { question: 'faqSpellsQuestion', answer: 'faqSpellsAnswer' },
    { question: 'faqDeckRulesQuestion', answer: 'faqDeckRulesAnswer' },
];

const exampleCard = MASTER_DB.find(c => c.id === 5); // Cinder Pyromancer

export default function RulebookPage() {
  const { t, cardType } = useI18n();
  return (
    <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('rulebook')}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t('rulebookSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FAQ Section */}
            <div className="lg:col-span-2">
                <h2 className="text-3xl font-semibold mb-6 text-center lg:text-left">{t('faqTitle')}</h2>
                <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                         <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger className="text-lg">{t(item.question)}</AccordionTrigger>
                            <AccordionContent className="text-base text-muted-foreground">
                                {t(item.answer)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {/* Legend Section */}
            <div>
                 <h2 className="text-3xl font-semibold mb-6 text-center lg:text-left">{t('quickLegend')}</h2>
                 <div className="space-y-6">
                    <UICard>
                        <CardHeader><CardTitle>{t('turnPhases')}</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div><Badge variant="secondary">Start</Badge>: {t('phaseStartDescription')}</div>
                            <div><Badge variant="secondary">Draw</Badge>: {t('phaseDrawDescription')}</div>
                            <div><Badge variant="secondary">Main</Badge>: {t('phaseMainDescription')}</div>
                            <div><Badge variant="secondary">Combat</Badge>: {t('phaseCombatDescription')}</div>
                            <div><Badge variant="secondary">End</Badge>: {t('phaseEndDescription')}</div>
                        </CardContent>
                    </UICard>
                     <UICard>
                        <CardHeader><CardTitle>{t('cardAttributes')}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                           <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md">1</div>
                               <span>{t('costDescription')}</span>
                           </div>
                           <div className="flex items-center gap-2"><Swords className="h-5 w-5 text-red-500" /> <span>{t('attackDescription')}</span></div>
                           <div className="flex items-center gap-2"><Heart className="h-5 w-5 text-green-400" /> <span>{t('healthDescription')}</span></div>
                           <div className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" /> <span>{t('focusDescription')}</span></div>
                           
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-center mb-2">{t('costColorsByType')}</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-600"></div> {cardType('Unit')}</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-600"></div> {cardType('Spell')}</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-purple-600"></div> {cardType('Trap')}</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-teal-500"></div> {cardType('Aether')}</div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-700"></div> {cardType('Relic')}</div>
                                </div>
                            </div>

                           {exampleCard && (
                                <div className="mt-4 pt-4 border-t">
                                     <h4 className="font-semibold text-center mb-2">{t('exampleCard')}</h4>
                                     <div className="mx-auto w-[200px]">
                                        <Card card={exampleCard} />
                                     </div>
                                </div>
                           )}
                        </CardContent>
                    </UICard>
                 </div>
            </div>
        </div>
         <div className="text-center mt-16">
            <Link href="/game" passHref className="inline-block">
                <Button variant="tcg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToMainMenu')}
                </Button>
            </Link>
        </div>
    </div>
  );
}
