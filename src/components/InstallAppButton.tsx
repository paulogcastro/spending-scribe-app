import { useEffect, useState } from 'react';
import { Download, PlusSquare, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const checkStandalone = () => setInstalled(isStandaloneMode());
    checkStandalone();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    media.addEventListener('change', checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      media.removeEventListener('change', checkStandalone);
    };
  }, []);

  if (installed) return null;

  const ios = isIosDevice();
  if (!deferredPrompt && !ios) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    if (ios) {
      setIosGuideOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleClick()}
        title="Baixar aplicativo no seu dispositivo"
        aria-label="Baixar aplicativo"
        className="h-9 gap-1.5 rounded-full border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15 hover:text-primary"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span className="sm:hidden">Baixar</span>
        <span className="hidden sm:inline">Baixar app</span>
      </Button>

      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Baixar no iPhone / iPad
            </DialogTitle>
            <DialogDescription>
              No Safari, siga estes 2 passos rápidos para instalar o DinDin Flow como aplicativo:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>
                Toque no ícone <strong>Compartilhar</strong>{' '}
                <span className="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 align-middle">
                  <Share className="h-3.5 w-3.5 text-primary" />
                </span>{' '}
                na barra do Safari.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>
                Role para baixo e toque em{' '}
                <strong className="inline-flex items-center gap-1">
                  <PlusSquare className="h-3.5 w-3.5 text-primary" />
                  Adicionar à Tela de Início
                </strong>
                .
              </span>
            </li>
          </ol>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={() => setIosGuideOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
