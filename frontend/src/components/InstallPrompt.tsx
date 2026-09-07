import { useState, useEffect } from 'react';

// Extend the WindowEventMap for the PWA install event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show your custom install UI banner/button
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen if the app was successfully installed
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('PWA was installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt variable, it can only be used once
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="w-full max-w-2xl bg-[#1C1C1A] text-[#F7F5F0] rounded-xl p-4 mb-6 shadow-md flex items-center justify-between gap-4 border border-[#E5E2DC]/10 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl">📱</span>
        <div>
          <p className="text-sm font-medium">Install Words App</p>
          <p className="text-xs text-[#787570]">Add to your home screen for quick daily access & offline capability.</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="bg-[#D97757] hover:opacity-90 text-white text-xs px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition cursor-pointer"
      >
        Install App
      </button>
    </div>
  );
}