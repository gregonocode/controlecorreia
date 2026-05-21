'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  DevicePhoneMobileIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

const IOS_TUTORIAL_URL = 'https://www.youtube.com/shorts/E4N-ql_FVT4';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function getPlatform() {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIos: false,
      isMobile: false,
      isSafari: false,
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const isSafari =
    /safari/.test(userAgent) &&
    !/chrome|crios|fxios|edgios|opr\//.test(userAgent);

  return {
    isAndroid,
    isIos,
    isMobile: isAndroid || isIos,
    isSafari,
  };
}

export default function PwaInstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState(() => getPlatform());

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const frame = window.requestAnimationFrame(() => {
      setPlatform(getPlatform());
      setIsStandalone(isStandaloneMode());
    });

    function handleDisplayModeChange() {
      setIsStandalone(isStandaloneMode());
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }

    media.addEventListener?.('change', handleDisplayModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  }

  if (isStandalone || isDismissed || !platform.isMobile) {
    return null;
  }

  const showAndroidInstall = platform.isAndroid && !!deferredPrompt;
  const showIosGuide = platform.isIos;

  if (!showAndroidInstall && !showIosGuide) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="bg-[#181818] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white text-[#181818] shadow-sm">
                <DevicePhoneMobileIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Acesso rápido
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  Instalar Cash Correia
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar aviso de instalação"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {showAndroidInstall && (
            <>
              <p className="text-sm font-medium leading-6 text-zinc-600">
                Instale o Cash Correia no celular para abrir mais rápido, usar
                em tela cheia e acessar o painel direto da tela inicial.
              </p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  {isInstalling ? 'Abrindo instalação...' : 'Instalar app'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-[#181818] transition hover:bg-zinc-50"
                >
                  Agora não
                </button>
              </div>
            </>
          )}

          {showIosGuide && (
            <>
              <p className="text-sm font-medium leading-6 text-zinc-600">
                No iPhone, abra o Cash Correia pelo Safari e adicione o app à
                tela inicial para usar em tela cheia.
              </p>

              <div className="mt-5 rounded-[28px] bg-[#F7F7F5] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-[16px] bg-white text-[#181818]">
                    <ShareIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#181818]">
                      1. Toque em Compartilhar
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Use o botão de compartilhamento do Safari.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-[16px] bg-white text-[#181818]">
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#181818]">
                      2. Toque em Adicionar à Tela de Início
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Depois confirme para instalar o Cash Correia.
                    </p>
                  </div>
                </div>
              </div>

              {!platform.isSafari && (
                <p className="mt-4 rounded-[18px] bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700">
                  Para instalar no iPhone, abra esta página no Safari.
                </p>
              )}

              <div className="mt-5 grid gap-3">
                <a
                  href={IOS_TUTORIAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  Ver tutorial
                </a>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-[#181818] transition hover:bg-zinc-50"
                >
                  Entendi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
