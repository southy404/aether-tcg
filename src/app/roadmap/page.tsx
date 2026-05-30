
'use client';

import { CheckCircle, CircleDashed, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const implementedFeatures = [
    "Komplettes Spiel-Grundgerüst (KI-Match)",
    "Deckbau-System mit Starter-Decks",
    "Karten-Sammlung mit Filter- & Sortierfunktionen",
    "Shop für Karten-Packs (Gold) und kosmetische Items (Gems)",
    "Pack-Öffnungs-Animationen mit Seltenheits-Logik",
    "Marktplatz zum Kaufen & Verkaufen von Karten",
    "Anpassungs-Menü für Avatare, Rahmen etc.",
    "Regelbuch-Seite",
    "Interaktives Spiel-Protokoll",
];

const plannedFeatures = [
    "Vollständiger Multiplayer-Modus (Ranked & Unranked)",
    "Kampagnen-Modus mit Story",
    "Freundeslisten und private Matches",
    "Streamer-Modus mit Facecam-Integration",
    "Tausch-System für den Marktplatz",
    "Erweiterte KI-Gegner mit verschiedenen Schwierigkeitsgraden",
    "Tägliche Quests und Belohnungen",
    "Weitere Karten-Sets und Erweiterungen",
];

export default function RoadmapPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">Roadmap</h1>
              <p className="text-muted-foreground mt-2 text-lg">Ein Blick auf das, was bereits geschafft wurde und was die Zukunft bringt.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-green-400">
                            <CheckCircle className="h-8 w-8" />
                            Bereits implementiert
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {implementedFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl text-yellow-400">
                            <CircleDashed className="h-8 w-8" />
                            In Planung
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {plannedFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                                    <CircleDashed className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
            <div className="text-center mt-16">
              <Link href="/game" passHref className="inline-block">
                <Button variant="tcg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück zum Hauptmenü
                </Button>
              </Link>
            </div>
        </div>
    );
}
