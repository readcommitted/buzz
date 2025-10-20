// (optional) register the service worker AFTER your app loads
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=dev3')
            .then(reg => console.log('SW registered', reg.scope))
            .catch(err => console.warn('SW registration failed', err));
    });
}



const phraseEl = document.getElementById('phrase');
const newBtn = document.getElementById('new');
const shareBtn = document.getElementById('share');
const favBtn = document.getElementById('fav');
const packsEl = document.getElementById('packs');
const cardEl = document.getElementById('card');

let DATA = { packs: {}, order: [] };
let activePack = null;
let favorites = JSON.parse(localStorage.getItem('buzzword_favs') || '[]');

function renderPacks() {
    packsEl.innerHTML = '';
    DATA.order.forEach(name => {
        const el = document.createElement('div');
        el.className = 'pill' + (name === activePack ? ' active' : '');
        el.textContent = name;
        el.onclick = () => { activePack = name; renderPacks(); pick(); };
        packsEl.appendChild(el);
    });
}

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildFromTemplate(t) {
    return t.parts.map(sample).join(' ');
}

function getPool() {
    const pack = DATA.packs[activePack];
    if (!pack) return ["We need to standardize on the canonical model."];
    let pool = [];
    if (pack.phrases) pool = pool.concat(pack.phrases);
    if (pack.templates) {
        const n = 5;
        for (let i = 0; i < n; i++) pool.push(buildFromTemplate(sample(pack.templates)));
    }
    return pool.length ? pool : ["Let’s circle back after we land the narrative."];
}

function pick() {
    const pool = getPool();
    const p = sample(pool);
    phraseEl.textContent = p;
    return p;
}

// Tap/click anywhere on the card (except buttons) to get a new phrase
cardEl.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (e.target.closest('.tooltip')) return;  // ignore tooltip clicks/hover taps
    pick();
    if (navigator.vibrate) navigator.vibrate(30);
});

newBtn.addEventListener('click', () => pick());

favBtn.addEventListener('click', () => {
    const p = phraseEl.textContent;
    if (!favorites.includes(p)) {
        favorites.push(p);
        localStorage.setItem('buzzword_favs', JSON.stringify(favorites));
    }
    favBtn.textContent = '★ Saved';
    setTimeout(() => favBtn.textContent = '★ Save', 700);
});

shareBtn.addEventListener('click', async () => {
    const p = phraseEl.textContent;
    if (navigator.share) {
        try { await navigator.share({ text: p, title: 'Buzzword Ball' }); } catch { }
    } else {
        await navigator.clipboard.writeText(p);
        shareBtn.textContent = 'Copied!';
        setTimeout(() => shareBtn.textContent = 'Share', 700);
    }
});

// Load phrases as before
fetch('phrases.json')
    .then(r => r.json())
    .then(json => {
        DATA = json;
        activePack = DATA.order[0];
        renderPacks();
        pick();
    })
    .catch(() => {
        DATA = { packs: { Default: { phrases: ["We need to standardize on the canonical model."] } }, order: ["Default"] };
        activePack = "Default";
        renderPacks();
        pick();
    });