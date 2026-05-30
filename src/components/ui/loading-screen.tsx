'use client';
import React, { useEffect, useState } from 'react';
import { languageLabels, type Language, type TranslationKey, useI18n } from '@/i18n';

interface LoadingScreenProps {
  onFinished: () => void;
}

type LoadingScreenDefinition = {
  bgImage: string;
  quoteKey: TranslationKey;
  authorKey: TranslationKey;
};

const loadingScreens: LoadingScreenDefinition[] = [
  {
    bgImage: '/ui/background/loading.png',
    quoteKey: 'loadingQuoteOne',
    authorKey: 'loadingAuthorOne',
  },
  {
    bgImage: '/ui/background/loading-2.jpg',
    quoteKey: 'loadingQuoteTwo',
    authorKey: 'loadingAuthorTwo',
  },
  {
    bgImage: '/ui/background/loading-3.jpg',
    quoteKey: 'loadingQuoteThree',
    authorKey: 'loadingAuthorThree',
  },
  {
    bgImage: '/ui/background/loading-4.jpg',
    quoteKey: 'loadingQuoteFour',
    authorKey: 'loadingAuthorFour',
  },
];

const languageNames: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
};


export default function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const { language, t } = useI18n();
  const [screen, setScreen] = useState(loadingScreens[0]);

  // Randomly select a screen on client-side to avoid hydration mismatch
  useEffect(() => {
    setScreen(loadingScreens[Math.floor(Math.random() * loadingScreens.length)]);
  }, []);
  
  useEffect(() => {
    let progress = 0;
    const bar = document.getElementById("bar");
    const percentText = document.getElementById("percent-val");

    function updateLoading() {
      let speedFactor = progress > 80 ? 0.3 : 1.8;
      progress += Math.random() * speedFactor;

      if (progress > 100) progress = 100;
      if (bar) bar.style.width = progress + "%";
      if (percentText) percentText.innerText = Math.floor(progress) + "%";

      if (progress < 100) {
        setTimeout(updateLoading, 20 + Math.random() * 50);
      } else {
        if (percentText) {
          percentText.innerText = t('loadingComplete');
          percentText.style.color = "#60a5fa";
        }
        setTimeout(onFinished, 500); // Wait a bit after completion
      }
    }
    const timeoutId = setTimeout(updateLoading, 200);
    return () => clearTimeout(timeoutId);
  }, [onFinished, t]);

  return (
    <>
      <style jsx global>{`
        body,
        html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #000;
          font-family: "Inter", sans-serif;
          overflow: hidden;
        }

        .bg-splash {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(0.6);
          z-index: 0;
        }

        .readability-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, transparent 70%);
            z-index: 1;
        }

        .vignette-strong {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            transparent 10%,
            rgba(0, 0, 0, 0.5) 40%,
            rgba(0, 0, 0, 0.95) 100%
          );
          z-index: 2;
        }

        .bottom-shading {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.7) 15%,
            transparent 40%
          );
          z-index: 3;
        }

        .main-container {
          position: relative;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        .quote-container {
          opacity: 0;
          animation: smoothReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.3s;
        }

        @keyframes smoothReveal {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        .quote-text {
          color: #fff;
          font-size: 2.2rem;
          font-style: italic;
          font-weight: 300;
          margin-bottom: 12px;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
          max-width: 850px;
          line-height: 1.2;
        }

        .loading-area {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          max-width: 1100px;
          z-index: 20;
        }

        .language-badge {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 25;
          padding: 8px 12px;
          border: 1px solid rgba(96, 165, 250, 0.35);
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .progress-border {
          width: 100%;
          height: 14px;
          background: #000;
          border-radius: 2px;
          padding: 1px;
          position: relative;
          overflow: hidden;
        }

        .progress-border::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            #111 0%,
            #333 45%,
            #fff 50%,
            #333 55%,
            #111 100%
          );
          background-size: 200% 100%;
          animation: shine-rev 3s linear infinite;
        }

        @keyframes shine-rev {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -200% 0;
          }
        }

        .progress-track {
          position: relative;
          width: 100%;
          height: 100%;
          background: #050505;
          border-radius: 1px;
          overflow: hidden;
          z-index: 1;
        }

        .progress-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(
            90deg,
            #1e40af,
            #3b82f6,
            #93c5fd,
            #3b82f6,
            #1e40af
          );
          background-size: 200% 100%;
          animation: shine-fwd 2s linear infinite;
          transition: width 0.3s ease-out;
        }

        @keyframes shine-fwd {
          from {
            background-position: -200% 0;
          }
          to {
            background-position: 200% 0;
          }
        }

        .dots::after {
          content: "";
          animation: l-dots 1.5s infinite;
        }
        @keyframes l-dots {
          0% {
            content: "";
          }
          33% {
            content: ".";
          }
          66% {
            content: "..";
          }
          100% {
            content: "...";
          }
        }
      `}</style>
      <div className="fixed inset-0 w-screen h-screen z-[999]">
        <div className="bg-splash" style={{ backgroundImage: `url(${screen.bgImage})` }}></div>
        <div className="readability-overlay"></div>
        <div className="vignette-strong"></div>
        <div className="bottom-shading"></div>

        <div className="language-badge">
          {t('selectedLanguage')}: {languageLabels[language]} · {languageNames[language]}
        </div>

        <div className="main-container text-center">
          <div className="quote-container px-10">
            <p className="quote-text">
              &quot;{t(screen.quoteKey as TranslationKey)}&quot;
            </p>
            <p className="text-white/40 uppercase tracking-[12px] text-[10px] font-bold">
              {t(screen.authorKey as TranslationKey)}
            </p>
          </div>
        </div>

        <div className="loading-area">
          <div className="flex justify-between items-end mb-3 px-1">
            <span className="text-white/40 text-[10px] uppercase tracking-[6px] font-bold">
              {t('loadingSyncingAetherCore')}<span className="dots"></span>
            </span>
            <span
              className="text-white text-[14px] font-black tracking-widest"
              id="percent-val"
            >
              0%
            </span>
          </div>
          <div className="progress-border">
            <div className="progress-track">
              <div className="progress-fill" id="bar"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
