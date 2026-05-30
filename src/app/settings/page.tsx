
'use client';

import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Volume, Volume1, Volume2 } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function SettingsPage() {
    const { masterVolume, setMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume } = useAppContext();
    const { t } = useI18n();

    const getVolumeIcon = (volume: number) => {
        if (volume === 0) return <Volume className="h-5 w-5 text-muted-foreground" />;
        if (volume < 0.5) return <Volume1 className="h-5 w-5 text-muted-foreground" />;
        return <Volume2 className="h-5 w-5 text-muted-foreground" />;
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold tracking-wider title-gradient uppercase">{t('settings')}</h1>
              <p className="text-muted-foreground mt-2 text-lg">{t('settingsDescription')}</p>
            </div>

            <Card className="max-w-2xl mx-auto bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>{t('audioSettings')}</CardTitle>
                    <CardDescription>
                        {t('audioSettingsDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="master-volume" className="text-lg">{t('masterVolume')}</Label>
                        <div className="flex items-center gap-4">
                             {getVolumeIcon(masterVolume)}
                            <Slider
                                id="master-volume"
                                min={0}
                                max={1}
                                step={0.01}
                                value={[masterVolume]}
                                onValueChange={(value) => setMasterVolume(value[0])}
                            />
                            <span className="text-sm font-mono w-12 text-right">{(masterVolume * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="music-volume" className="text-lg">{t('musicVolume')}</Label>
                         <div className="flex items-center gap-4">
                             {getVolumeIcon(musicVolume)}
                            <Slider
                                id="music-volume"
                                min={0}
                                max={1}
                                step={0.01}
                                value={[musicVolume]}
                                onValueChange={(value) => setMusicVolume(value[0])}
                            />
                             <span className="text-sm font-mono w-12 text-right">{(musicVolume * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sfx-volume" className="text-lg">{t('sfxVolume')}</Label>
                         <div className="flex items-center gap-4">
                             {getVolumeIcon(sfxVolume)}
                            <Slider
                                id="sfx-volume"
                                min={0}
                                max={1}
                                step={0.01}
                                value={[sfxVolume]}
                                onValueChange={(value) => setSfxVolume(value[0])}
                            />
                             <span className="text-sm font-mono w-12 text-right">{(sfxVolume * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
