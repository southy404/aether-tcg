'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { languageLabels, SUPPORTED_LANGUAGES, useI18n } from '@/i18n';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={cn('flex items-center rounded-full border border-border/50 bg-background/40 p-0.5', className)}
      aria-label={t('language')}
    >
      {SUPPORTED_LANGUAGES.map((option) => (
        <Button
          key={option}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 min-w-8 rounded-full px-2 text-[10px] font-bold tracking-wider text-muted-foreground hover:text-primary',
            language === option && 'bg-primary/15 text-primary'
          )}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {languageLabels[option]}
        </Button>
      ))}
    </div>
  );
}
