/* app.js — Buzzword Ball (templates weighted 75/25) */

(() => {
    // ---------- Config ----------
    const LS_KEYS = {
        activePack: 'buzz.activePack',
        favorites: 'buzz.favs',
        weightOverrides: 'buzz.templateWeightOverrides'
    };
    const TEMPLATE_WEIGHT_DEFAULT = 0.75; // 75/25 templates vs phrases

    // ---------- Utilities ----------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];
    const clamp01 = n => Math.max(0, Math.min(1, n));

    const store = {
        getJSON(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v ? JSON.parse(v) : fallback;
            } catch {
                return fallback;
            }
        },
        setJSON(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
        },
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v ?? fallback;
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch { }
        }
    };

    // ---------- Data Bootstrapping ----------
    // Prefer inline window.BUZZWORD_DATA (defined in index.html).
    // If it's missing, we can optionally try to fetch phrases.json.
    async function loadData() {
        if (window.BUZZWORD_DATA) return window.BUZZWORD_DATA;

        try {
            const res = await fetch('phrases.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch phrases.json');
            const json = await res.json();
            // Normalize to { order:[], packs:{} } shape
            if (json && json.order && json.packs) return json;
        } catch (e) {
            console.warn('BUZZWORD_DATA not found; using empty dataset.', e);
        }
        return { order: [], packs: {} };
    }

    // ---------- Phrase Generation ----------
    function getTemplateWeight(pack, overrides) {
        // Priority: per-pack override from JSON > persisted override map > default
        if (typeof pack.templateWeight === 'number') {
            return clamp01(pack.templateWeight);
        }
        if (overrides && typeof overrides[pack._name] === 'number') {
            return clamp01(overrides[pack._name]);
        }
        return TEMPLATE_WEIGHT_DEFAULT;
    }

    function buildFromTemplate(tpl) {
        // Each template has "parts": [ [a,b,c], [x,y,z], ...]
        const parts = (tpl?.parts || []).map(list => rand(list));
        // Join with single spaces; caller may post-process punctuation if desired
        return parts.join(' ');
    }

    function generateFromPack(pack, weightOverrides) {
        const phrases = Array.isArray(pack.phrases) ? pack.phrases : [];
        const templates = Array.isArray(pack.templates) ? pack.templates : [];

        const hasPhrases = phrases.length > 0;
        const hasTemplates = templates.length > 0;

        // Decide whether to use a template or a phrase
        let useTemplate = false;
        if (hasTemplates && hasPhrases) {
            const w = getTemplateWeight(pack, weightOverrides);
            useTemplate = Math.random() < w;
        } else if (hasTemplates) {
            useTemplate = true;
        } else if (!hasPhrases) {
            return '(no phrases/templates in this pack)';
        }

        if (useTemplate) return buildFromTemplate(rand(templates));
        return rand(phrases);
    }

    function generateAcrossSelection(selectedPacks, packsByName, weightOverrides) {
        // If multiple packs are selected (future-friendly), choose one uniformly
        const pickName = rand(selectedPacks);
        const pack = packsByName[pickName];
        return generateFromPack(pack, weightOverrides);
    }

    // ---------- UI Rendering ----------
    function renderPacks({ order, packs }, onSelect, activeName) {
        const container = $('#packs');
        if (!container) return;

        container.innerHTML = '';
        order.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.type = 'button';
            btn.textContent = name;
            btn.dataset.pack = name;
            if (name === activeName) btn.classList.add('chip--active');

            btn.addEventListener('click', () => onSelect(name));
            container.appendChild(btn);
        });
    }

    function setActiveChip(name) {
        $$('#packs .chip').forEach(ch => {
            ch.classList.toggle('chip--active', ch.dataset.pack === name);
        });
    }

    // ---------- Favorites ----------
    function loadFavorites() {
        return store.getJSON(LS_KEYS.favorites, []);
    }
    function saveFavorite(text) {
        if (!text || !text.trim()) return;
        const favs = loadFavorites();
        if (!favs.includes(text)) {
            favs.push(text);
            store.setJSON(LS_KEYS.favorites, favs);
        }
    }

    // ---------- Share ----------
    async function shareText(text) {
        if (!text || !text.trim()) return;
        // Prefer Web Share API
        if (navigator.share) {
            try {
                await navigator.share({ text, title: 'Buzzword Ball' });
                return;
            } catch (e) {
                // fall through to clipboard
            }
        }
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(text);
            toast('Copied to clipboard');
        } catch {
            alert(text);
        }
    }

    // ---------- Toast (tiny helper) ----------
    let toastTimer = null;
    function toast(msg, ms = 1400) {
        let el = $('#toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast';
            el.style.position = 'fixed';
            el.style.left = '50%';
            el.style.bottom = '28px';
            el.style.transform = 'translateX(-50%)';
            el.style.padding = '8px 12px';
            el.style.background = 'rgba(0,0,0,0.8)';
            el.style.color = '#fff';
            el.style.borderRadius = '8px';
            el.style.fontSize = '0.95rem';
            el.style.pointerEvents = 'none';
            el.style.zIndex = '9999';
            el.style.opacity = '0';
            el.style.transition = 'opacity 150ms ease';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
    }

    // ---------- Main App ----------
    document.addEventListener('DOMContentLoaded', async () => {
        const data = await loadData();
        const order = data.order || [];
        const packsByName = {};

        // Normalize packs and stamp _name for overrides
        for (const name of order) {
            const pack = { phrases: [], templates: [], ...(data.packs?.[name] || {}) };
            pack._name = name;
            packsByName[name] = pack;
        }

        if (!order.length) {
            console.warn('No packs available.');
        }

        // Active pack: from LS or first in order
        let activePack = store.get(LS_KEYS.activePack, order[0] || null);
        if (!packsByName[activePack]) activePack = order[0] || null;

        // Weight overrides (optional, future UI)
        const weightOverrides = store.getJSON(LS_KEYS.weightOverrides, {});

        // DOM refs
        const card = $('#card');
        const phraseEl = $('#phrase');
        const shareBtn = $('#share');
        const favBtn = $('#fav');

        // Render pack chips
        renderPacks(
            { order, packs: packsByName },
            (name) => {
                activePack = name;
                store.set(LS_KEYS.activePack, name);
                setActiveChip(name);
                // Generate immediately for snappy feel
                const text = generateAcrossSelection([activePack], packsByName, weightOverrides);
                phraseEl.textContent = text;
            },
            activePack
        );

        // Initial phrase
        if (activePack) {
            const text = generateAcrossSelection([activePack], packsByName, weightOverrides);
            phraseEl.textContent = text;
        } else {
            phraseEl.textContent = '(no packs defined)';
        }

        // Interactions
        const generate = () => {
            if (!activePack) return;
            const text = generateAcrossSelection([activePack], packsByName, weightOverrides);
            phraseEl.textContent = text;
        };

        // Tap anywhere on the card to generate
        if (card) {
            card.addEventListener('click', (e) => {
                // Avoid generating when clicking on buttons inside the card
                const tag = (e.target.tagName || '').toLowerCase();
                if (tag === 'button') return;
                generate();
            });
        }

        // Keyboard: Space = new phrase, Cmd/Ctrl+S = save favorite, Cmd/Ctrl+Enter = share
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                generate();
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const text = phraseEl.textContent.trim();
                saveFavorite(text);
                toast('Saved to favorites');
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                shareText(phraseEl.textContent.trim());
            }
        });

        // Share / Save buttons
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                shareText(phraseEl.textContent.trim());
            });
        }
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const text = phraseEl.textContent.trim();
                saveFavorite(text);
                toast('Saved to favorites');
            });
        }

        // Ensure active chip style is correct after initial render
        setActiveChip(activePack);
    });
})();
