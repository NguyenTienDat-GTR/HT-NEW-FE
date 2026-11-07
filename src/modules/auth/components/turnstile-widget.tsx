"use client";

import {useEffect, useRef} from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
    render: (container: HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    scriptPromise ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error("Không tải được Cloudflare Turnstile"));
        };
        document.head.appendChild(script);
    });
    return scriptPromise;
}

type Props = {
    siteKey: string;
    /** Gọi với token khi xác minh xong, và với null khi token hết hạn/lỗi. */
    onToken: (token: string | null) => void;
    /** Đổi giá trị này để bắt widget xác minh lại (token chỉ dùng được một lần). */
    resetSignal?: number;
};

export function TurnstileWidget({siteKey, onToken, resetSignal = 0}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | undefined>(undefined);
    const onTokenRef = useRef(onToken);

    useEffect(() => {
        onTokenRef.current = onToken;
    }, [onToken]);

    useEffect(() => {
        let cancelled = false;
        loadScript()
            .then(() => {
                if (cancelled || !containerRef.current || !window.turnstile) return;
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    language: "vi",
                    callback: (token: string) => onTokenRef.current(token),
                    "expired-callback": () => onTokenRef.current(null),
                    "error-callback": () => onTokenRef.current(null),
                });
            })
            .catch(() => onTokenRef.current(null));
        return () => {
            cancelled = true;
            if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = undefined;
        };
    }, [siteKey]);

    useEffect(() => {
        if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
            onTokenRef.current(null);
            window.turnstile.reset(widgetIdRef.current);
        }
    }, [resetSignal]);

    return <div ref={containerRef} className="flex min-h-[65px] justify-center"/>;
}
