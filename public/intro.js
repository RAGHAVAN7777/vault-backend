document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-get-into-vault');
    const introLayer = document.getElementById('intro-layer');
    const lightCore = document.getElementById('light-core');
    const rayContainer = document.getElementById('ray-container');
    const shockwave = document.getElementById('shockwave');
    const warpField = document.getElementById('warp-field');

    if (!btn || !introLayer || !lightCore) return;

    btn.addEventListener('click', async () => {
        // 1. PHASE 1: IMPLOSION
        const uiElements = document.querySelectorAll('.brand-title, .brand-tagline, #btn-get-into-vault');
        uiElements.forEach(el => {
            el.style.transition = 'all 0.4s ease';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
        });

        // Rays contract and spin faster
        rayContainer.style.transition = 'all 0.6s cubic-bezier(0.6, 0.04, 0.98, 0.33)';
        rayContainer.style.transform = 'translate(-50%, -50%) scale(0.1) rotate(720deg)';
        rayContainer.style.opacity = '0.5';

        // Core Implosion
        lightCore.classList.add('imploding');

        await sleep(500);

        // 2. PHASE 2: SHOCKWAVE & WARP
        shockwave.classList.add('shockwave-fire');
        warpField.style.opacity = '1';
        createWarpStreaks();

        await sleep(200);

        // 3. PHASE 3: RING SPLASH REVEAL
        lightCore.classList.remove('imploding');
        lightCore.style.opacity = '0';
        lightCore.style.transition = 'opacity 0.3s ease';

        triggerRingSplash();

        // Reveal Dashboard
        await sleep(600);
        introLayer.classList.add('fade-out');

        await sleep(800);
        introLayer.remove();
        document.body.style.overflow = 'auto';
    });

    function triggerRingSplash() {
        const container = document.getElementById('ring-splash-container');
        if (!container) return;

        const colors = [varText('--cyan'), '#fff', varText('--blue-primary')];

        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'ring-splash ring-fire';
                ring.style.borderColor = colors[i % colors.length];
                ring.style.width = '100px';
                ring.style.height = '100px';
                container.appendChild(ring);

                setTimeout(() => ring.remove(), 1000);
            }, i * 100);
        }
    }

    function varText(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function createWarpStreaks() {
        const streakCount = 40;
        const fragment = document.createDocumentFragment();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < streakCount; i++) {
            const streak = document.createElement('div');
            streak.className = 'warp-streak';

            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 200 + 100;
            const startDist = Math.random() * 50;

            streak.style.width = `${length}px`;
            streak.style.left = `${centerX}px`;
            streak.style.top = `${centerY}px`;
            streak.style.transformOrigin = '0 50%';
            streak.style.transform = `rotate(${angle * 180 / Math.PI}deg) translateX(${startDist}px) scaleX(0)`;

            fragment.appendChild(streak);

            requestAnimationFrame(() => {
                streak.style.transition = 'all 0.8s cubic-bezier(0.15, 0, 0.15, 1)';
                streak.style.transform = `rotate(${angle * 180 / Math.PI}deg) translateX(${startDist + 1000}px) scaleX(2)`;
                streak.style.opacity = '0';
            });
        }
        warpField.appendChild(fragment);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
