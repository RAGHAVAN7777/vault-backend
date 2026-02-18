document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-get-into-vault');
    const introLayer = document.getElementById('intro-layer');

    if (!btn) return;

    btn.addEventListener('click', () => {
        executeMarvelousShatter();
    });

    async function executeMarvelousShatter() {
        // 1. Initial Rumble & Dimensional Blur
        introLayer.classList.add('distorting');
        const rays = document.querySelector('.blue-ray-container');
        if (rays) {
            rays.style.transition = 'opacity 0.6s ease';
            rays.style.opacity = '0';
        }

        const elements = document.querySelectorAll('.floating-text');
        elements.forEach(el => {
            el.style.filter = 'blur(10px) brightness(2)';
            el.style.transition = 'filter 0.5s ease';
            if (el !== btn) el.style.pointerEvents = 'none';
        });

        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';

        await sleep(500);

        // 2. Dimensional Shatter (Break elements into shards)
        const shards = [];
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const count = Math.floor((rect.width * rect.height) / 800) + 10;

            for (let i = 0; i < count; i++) {
                const shard = document.createElement('div');
                shard.className = 'pixel-shard';

                const w = Math.random() * 30 + 10;
                const h = Math.random() * 30 + 10;
                const x = rect.left + Math.random() * rect.width;
                const y = rect.top + Math.random() * rect.height;

                shard.style.width = `${w}px`;
                shard.style.height = `${h}px`;
                shard.style.left = `${x}px`;
                shard.style.top = `${y}px`;

                const rand = Math.random();
                if (rand > 0.7) {
                    shard.style.background = 'var(--cyan)';
                    shard.style.boxShadow = '0 0 15px var(--cyan)';
                } else if (rand > 0.3) {
                    shard.style.background = 'var(--blue-primary)';
                    shard.style.boxShadow = '0 0 10px var(--blue-glow)';
                } else {
                    shard.style.background = '#001219';
                    shard.style.border = '0.5px solid rgba(0, 119, 255, 0.4)';
                }

                introLayer.appendChild(shard);
                shards.push({
                    el: shard,
                    vx: (Math.random() - 0.5) * 50,
                    vy: (Math.random() - 0.5) * 50,
                    vr: (Math.random() - 0.5) * 30
                });
            }
            el.style.display = 'none'; // Hide original floating text
        });

        // 3. Shard Burst
        let frames = 0;
        const burstInterval = setInterval(() => {
            shards.forEach(s => {
                const l = parseFloat(s.el.style.left);
                const t = parseFloat(s.el.style.top);
                s.el.style.left = `${l + s.vx}px`;
                s.el.style.top = `${t + s.vy}px`;
                s.el.style.transform = `rotate(${frames * s.vr}deg) scale(${Math.max(0, 1 - frames / 100)})`;
            });
            frames++;
            if (frames > 100) clearInterval(burstInterval);
        }, 16);

        await sleep(300);

        // 4. THE VERTICAL CRACK
        const crack = document.createElement('div');
        crack.className = 'crack-line-vertical';
        introLayer.appendChild(crack);

        setTimeout(() => {
            crack.style.height = '100vh';
            crack.style.transition = 'height 0.6s cubic-bezier(1, 0, 0, 1)';
        }, 50);

        await sleep(700);

        // 5. DIMENSIONAL SPLIT
        const leftHalf = document.createElement('div');
        leftHalf.className = 'page-half page-half-left';
        const rightHalf = document.createElement('div');
        rightHalf.className = 'page-half page-half-right';

        // Take background from intro-layer for halves
        leftHalf.style.background = getComputedStyle(introLayer).backgroundColor;
        rightHalf.style.background = getComputedStyle(introLayer).backgroundColor;

        document.body.appendChild(leftHalf);
        document.body.appendChild(rightHalf);

        introLayer.style.background = 'transparent';
        document.getElementById('intro-canvas-bg').style.display = 'none';

        // Animate halves falling away
        leftHalf.style.transition = 'all 1.5s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        rightHalf.style.transition = 'all 1.5s cubic-bezier(0.6, -0.28, 0.735, 0.045)';

        await sleep(50);

        // Vertical crack split effect
        leftHalf.style.transform = 'rotate(-20deg) translateX(-120vw) translateY(50vh)';
        rightHalf.style.transform = 'rotate(20deg) translateX(120vw) translateY(50vh)';
        crack.style.opacity = '0';
        crack.style.transition = 'opacity 0.5s ease';

        await sleep(1500);

        // Cleanup
        introLayer.remove();
        leftHalf.remove();
        rightHalf.remove();
        crack.remove();
        document.body.style.overflow = 'auto';
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
