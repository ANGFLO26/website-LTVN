import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

interface Props {
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function TurnstileWidget({ action, onVerify, onExpire, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let isMounted = true;
    let attachedScript: HTMLElement | null = null;

    function renderWidget() {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey!,
          action,
          callback: (token) => {
            if (isMounted) onVerifyRef.current(token);
          },
          'expired-callback': () => {
            if (isMounted) onExpireRef.current?.();
          },
          'error-callback': () => {
            if (isMounted) onErrorRef.current?.();
          },
          theme: 'auto',
        });
        widgetIdRef.current = id;
      } catch {
        // Ignored non-fatal render error
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.addEventListener('load', renderWidget);
        attachedScript = script;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', renderWidget);
        attachedScript = existingScript;
      }
    }

    return () => {
      isMounted = false;
      if (attachedScript) {
        attachedScript.removeEventListener('load', renderWidget);
      }
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, action]);

  if (!siteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="turnstile-container"
      style={{ margin: '12px 0', minHeight: '65px' }}
    />
  );
}
