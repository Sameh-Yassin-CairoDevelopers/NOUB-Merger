/**
 * Noub Merger V7.0 - UI & Interaction Controller
 */
const tg = window.Telegram.WebApp; tg.expand();

const UI = {
    proxy: document.getElementById('proxy'),
    drag: { active: false, from: null, src: null },

    init: () => {
        UI.updateDiamond();
        UI.render();
        setInterval(UI.tick, 1000);
    },

    render: () => {
        // Render Grid
        const g = document.getElementById('grid'); g.innerHTML = '';
        state.board.forEach((c, i) => {
            const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.idx = i;
            if(c) {
                const cardEl = UI.createCardEl(c);
                cell.appendChild(cardEl);
                cell.onpointerdown = (e) => UI.startDrag(e, i, 'grid');
            }
            g.appendChild(cell);
        });

        // Render Vault
        const vg = document.getElementById('vault-grid'); vg.innerHTML = '';
        state.vault.forEach((c, i) => {
            const cell = document.createElement('div'); cell.className = 'vault-cell';
            if(state.selectedVaultIdx === i) cell.classList.add('selected');
            if(c) {
                cell.appendChild(UI.createCardEl(c));
                cell.onclick = () => { state.selectedVaultIdx = i; UI.render(); document.getElementById('return-btn').style.display='block'; };
            }
            vg.appendChild(cell);
        });

        // Update Stats
        document.getElementById('gold-txt').innerText = state.gold;
        document.getElementById('energy-val').innerText = state.energy + '/60 ⚡';
        document.getElementById('energy-fill').style.width = (state.energy/60)*100 + '%';
        document.getElementById('j-badge').innerText = state.jokers;
        document.getElementById('b-badge').innerText = state.bombs;
        document.getElementById('fc-badge').innerText = state.fastCharges;
        document.getElementById('v-badge').innerText = state.vault.filter(x=>x).length;
        document.getElementById('lvl-badge').innerText = Math.floor(state.merges/CONFIG.mergesPerLvl)+1;
        document.getElementById('rank-name').innerText = CONFIG.titles[Math.min(8, Math.floor(state.merges/CONFIG.mergesPerLvl))];
        document.getElementById('lvl-fill').style.width = (state.merges%CONFIG.mergesPerLvl)*2.5 + '%';
    },

    createCardEl: (c) => {
        const el = document.createElement('div'); el.className = `card ${c.isNew?'anim-pop':''}`;
        el.style.color = c.suit.c;
        el.innerHTML = `<div class="rank">${c.rank}</div><div class="suit">${c.suit.i}</div>`;
        c.isNew = false; return el;
    },

    startDrag: (e, idx, src) => {
        if(src==='joker' && state.jokers <= 0) return;
        UI.drag = { active: true, from: idx, src: src };
        const card = (src==='grid') ? state.board[idx] : {rank:'🃏', suit:{c:'#8e44ad', i:''}};
        
        UI.proxy.style.display = 'flex'; UI.proxy.style.color = card.suit.c;
        UI.proxy.innerHTML = src==='joker' ? '🃏' : `<div style="position:absolute;top:2px;left:4px;font-size:20px;font-weight:900">${card.rank}</div><div style="font-size:38px">${card.suit.i}</div>`;
        
        if(src !== 'joker') e.currentTarget.querySelector('.card').classList.add('dragging-hidden');

        const move = (ev) => {
            UI.proxy.style.left = (ev.clientX - 30) + 'px'; UI.proxy.style.top = (ev.clientY - 40) + 'px';
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            document.querySelectorAll('.cell, #trash-bin, #v-btn').forEach(c => c.classList.remove('over'));
            el?.closest('.cell, #trash-bin, #v-btn')?.classList.add('over');
        };

        const up = (ev) => {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const cell = el?.closest('.cell');
            const trash = el?.closest('#trash-bin');
            const vBtn = el?.closest('#v-btn');

            if (trash && src === 'grid') state.board[UI.drag.from] = null;
            else if (vBtn && src === 'grid') UI.toVault(UI.drag.from);
            else if (cell) UI.resolveMerge(UI.drag.from, parseInt(cell.dataset.idx), src);

            UI.drag.active = false; UI.proxy.style.display = 'none';
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
            UI.render();
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    },

    resolveMerge: (f, t, src) => {
        const c1 = (src==='joker') ? {rank:'JOKER'} : state.board[f];
        const c2 = state.board[t];
        if(!c2) { if(src==='grid'){ state.board[t]=c1; state.board[f]=null; } return; }

        if(src==='joker' || (c1.rank === c2.rank && c1.suit.id === c2.suit.id)){
            const base = src==='joker' ? c2 : c1; if(base.rank==='A') return;
            const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(base.rank)+1];
            if(nxt==='A'){ state.board[t]=null; Engine.handleAce(); }
            else state.board[t]={rank:nxt, suit:base.suit, isNew:true};
            if(src==='joker') state.jokers--; else state.board[f]=null;
            state.merges++; tg.HapticFeedback.impactOccurred('medium');
        } else if(src==='grid') { state.board[f]=c2; state.board[t]=c1; }
    },

    toVault: (idx) => {
        const c = state.board[idx];
        if(!['J','Q','K'].includes(c.rank)) return tg.showAlert("الخزنة تقبل فقط J, Q, K!");
        const vIdx = state.vault.findIndex(x => x === null);
        if(vIdx === -1) return tg.showAlert("الخزنة ممتلئة!");
        state.vault[vIdx] = c; state.board[idx] = null;
        tg.HapticFeedback.impactOccurred('medium');
    },

    toggleAuto: () => {
        state.isAuto = !state.isAuto;
        document.getElementById('auto-btn').classList.toggle('active', state.isAuto);
        if(state.isAuto) UI.runAuto();
    },

    runAuto: () => {
        if(!state.isAuto) return;
        let m = false;
        for(let i=0; i<20; i++){
            for(let j=i+1; j<20; j++){
                const c1=state.board[i], c2=state.board[j];
                if(c1 && c2 && c1.rank===c2.rank && c1.suit.id===c2.suit.id){ UI.resolveMerge(i,j,'grid'); m=true; break; }
            }
            if(m) break;
        }
        if(!m && state.energy > 0 && state.board.includes(null)){ Engine.spawnCard(); m=true; }
        if(m){ UI.render(); setTimeout(UI.runAuto, 400); }
        else { state.isAuto = false; document.getElementById('auto-btn').classList.remove('active'); }
    },

    animateBlast: () => {
        const b = document.getElementById('blast-layer'); b.classList.add('anim-blast');
        setTimeout(() => b.classList.remove('anim-blast'), 500);
    },

    animateJoker: (idx) => {
        // Logic for flying joker...
        state.jokers++; UI.render();
    },

    updateDiamond: () => {
        const svg = document.getElementById('diamond-svg');
        const p = ["50,5 95,35 50,35", "50,5 50,35 5,35", "5,35 50,35 25,65", "50,35 75,65 25,65", "50,35 95,35 75,65", "25,65 50,95 5,35", "25,65 75,65 50,95", "75,65 95,35 50,95", "50,35 50,65 25,65", "50,35 75,65 50,65", "5,35 25,65 25,35", "95,35 75,65 75,35", "50,5 25,35 75,35"];
        svg.innerHTML = p.map((d, i) => `<polygon points="${d}" class="tri-p ${state.diamond[i]?'active':''}" id="tri-${i}"/>`).join('');
    },

    tick: () => {
        if(state.energy < 60) {
            const d = Date.now() - state.lastRefill;
            if(d >= CONFIG.refillTime){ state.energy++; state.lastRefill = Date.now(); UI.render(); }
            const r = Math.ceil((CONFIG.refillTime-d)/1000);
            document.getElementById('timer-txt').innerText = `شحن: ${Math.floor(r/60)}:${(r%60).toString().padStart(2,'0')}`;
        } else document.getElementById('timer-txt').innerText = "شحن كامل ✅";
    },

    toggle: (id, s) => { document.getElementById(id).style.display = s ? 'flex' : 'none'; }
};

UI.init();