import { useEffect } from 'react';
import Lenis from 'lenis';

export default function SmoothScrollProvider({ children }) {
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return undefined;

        const lenis = new Lenis({
            duration: 1.15,
            smoothWheel: true,
            wheelMultiplier: 0.95,
            touchMultiplier: 1.1,
            easing: (value) => 1 - Math.pow(1 - value, 4),
            anchors: true,
            // Let modal/dialog areas use native scrolling (do not hijack with Lenis).
            prevent: (node) => {
                if (!node || typeof node.closest !== 'function') return false;
                return Boolean(
                    node.closest(
                        '.details-modal, .close-confirm-modal, .technical-details-modal, [data-native-scroll="true"]'
                    )
                );
            },
        });

        let frameId = 0;
        const raf = (time) => {
            lenis.raf(time);
            frameId = window.requestAnimationFrame(raf);
        };

        frameId = window.requestAnimationFrame(raf);

        return () => {
            if (frameId) window.cancelAnimationFrame(frameId);
            lenis.destroy();
        };
    }, []);

    return children;
}
