// -------- app.js (tap-anywhere + no double-tap zoom) --------
document.addEventListener('DOMContentLoaded', () => {
    const phraseEl = document.getElementById('phrase');
    const shareBtn = document.getElementById('share');
    const favBtn = document.getElementById('fav');
    const packsEl = document.getElementById('packs');
    const cardEl = document.getElementById('card');

    let DATA = { order: [], packs: {} };
    let currentPack = null;
    let lastText = '';

    // ---------- utils ----------
    const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Template generator: { parts: [ ["A","B"], ["X","Y"], ... ] }
    function makeFromTemplate(tpl) {
        const parts = Array.isArray(tpl?.parts) ? tpl.parts : [];
        if (!parts.length) return null;
        const words = parts.map(group => choice(group));
        let s = words.join(' ');
        if (!/[.!?]$/.test(s)) s += '.';
        return s;
    }

    const packPhrases = (name) =>
        Array.isArray(DATA?.packs?.[name]?.phrases) ? DATA.packs[name].phrases : [];

    const packTemplates = (name) =>
        Array.isArray(DATA?.packs?.[name]?.templates) ? DATA.packs[name].templates : [];

    // ---------- phrase picking (no immediate repeat) ----------
    function pick() {
        if (!currentPack) {
            phraseEl.textContent = 'No packs loaded.';
            return;
        }
        const phrases = packPhrases(currentPack);
        const templates = packTemplates(currentPack);

        const useTemplate = templates.length && Math.random() < 0.65;

        let attempt = 0;
        let text = '';
        while (attempt++ < 8) {
            if (useTemplate) {
                text = makeFromTemplate(choice(templates));
            } else if (phrases.length) {
                text = choice(phrases);
            } else if (templates.length) {
                text = makeFromTemplate(choice(templates));
            } else {
                text = 'No phrases in this pack.';
            }
            if (text && text !== lastText) break;
        }

        lastText = text;
        phraseEl.textContent = text;
        updateSaveUI();
    }
    window.pick = pick; // optional for debugging

    // ---------- packs UI ----------
    function renderPacks() {
        const names = (DATA.order?.length ? DATA.order : Object.keys(DATA.packs)) || [];
        if (!packsEl) return;

        packsEl.innerHTML = names.map((name) => `
      <button class="chip ${name === currentPack ? 'active' : ''}"
              data-pack="${encodeURIComponent(name)}"
              title="${name}">
        <span class="chip-name">${name}</span>
      </button>
    `).join('');

        packsEl.querySelectorAll('.chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = decodeURIComponent(e.currentTarget.getAttribute('data-pack'));
                if (!DATA.packs[name]) return;
                currentPack = name;
                packsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                lastText = '';
                pick();
            });
        });
    }

    // ---------- Share / Save ----------
    const SAVED_KEY = 'bb_saved_v1';
    const loadSaved = () => {
        try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); }
        catch { return new Set(); }
    };
    const saveSaved = (set) => localStorage.setItem(SAVED_KEY, JSON.stringify([...set]));
    let saved = loadSaved();

    function toggleSave() {
        const text = phraseEl?.textContent?.trim();
        if (!text) return;
        saved.has(text) ? saved.delete(text) : saved.add(text);
        saveSaved(saved);
        updateSaveUI();
    }
    function updateSaveUI() {
        if (!favBtn) return;
        const text = phraseEl?.textContent?.trim();
        const isSaved = text && saved.has(text);
        favBtn.textContent = isSaved ? '★ Saved' : '★ Save';
        favBtn.classList.toggle('btn-primary', isSaved);
    }

    async function shareCurrent() {
        const text = phraseEl?.textContent?.trim();
        if (!text) return;
        const payload = { title: 'Buzzword Ball', text, url: location.href };
        try {
            if (navigator.share) {
                await navigator.share(payload);
            } else if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(`${text} — ${location.href}`);
                console.log('Copied to clipboard');
            } else {
                prompt('Copy this phrase:', text);
            }
        } catch (_) { }
    }

    if (shareBtn) shareBtn.addEventListener('click', shareCurrent);
    if (favBtn) favBtn.addEventListener('click', toggleSave);

    // ---------- Tap anywhere on card (no zoom) ----------
    function isControlClick(target) {
        return !!(target.closest('.tooltip') || target.closest('.actions') || target.closest('.packs'));
    }

    const activate = (e) => {
        if (isControlClick(e.target)) return;
        pick();
        if (navigator.vibrate) navigator.vibrate(15);
    };

    // Click (desktop + general fallback)
    if (cardEl) {
        cardEl.addEventListener('click', activate);
    }

    // Touch: prevent double-tap zoom & synthetic click
    let lastTouchTime = 0;
    if (cardEl) {
        cardEl.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchTime < 350) {
                e.preventDefault();     // block double-tap zoom
                lastTouchTime = now;
                return;
            }
            lastTouchTime = now;
            e.preventDefault();       // block the follow-up mouse event
            if (!isControlClick(e.target)) activate(e);
        }, { passive: false });
    }

    // ---------- init: load phrases.json ----------
    fetch('phrases.json', { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(json => {
            // expects: { order: [...], packs: { Name: { phrases:[...], templates:[{parts:[...]}] } } }
            DATA = json || { order: [], packs: {} };
            currentPack = DATA.order?.[0] || Object.keys(DATA.packs)[0] || null;
            renderPacks();
            pick();
        })
        .catch(err => {
            console.error('Failed to load phrases.json:', err);
            phraseEl.textContent = 'Could not load phrases.';
        });
});
