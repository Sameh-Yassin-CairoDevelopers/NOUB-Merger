/**
 * Noub Merger - UI Controller
 */
const tg = window.Telegram.WebApp; tg.expand();

const UI = {
    render: () => {
        const g = document.getElementById('grid'); g.innerHTML = '';
        state.board.forEach((c, i) => {
            const cell = document.createElement('div');
            cell.className = `cell ${state.selIdx === i ? 'selected' : ''}`;
            if(c) {
                const cardEl = document.createElement('div');
                cardEl.className = `card ${c.isNew?'anim-pop':''}`; cardEl.style.color = c.suit.c;
                cardEl.innerHTML = c.rank==='🃏' ? `🃏` : `<div class="rank">${c.rank}</div><div class="suit">${c.suit.i}</div>`;
                cell.appendChild(cardEl); c.isNew = false;
            }
            cell.onclick = () => UI.handleClick(i);
            g.appendChild(cell);
        });
        UI.renderVault(); UI.updateStats();
    },

    handleClick: (idx) => {
        if(state.selIdx === null) {
            if(state.board[idx] && state.board[idx].rank !== '🃏') state.selIdx = idx;
        } else {
            const from = state.selIdx, to = idx;
            const c1 = state.board[from], c2 = state.board[to];
            if(from === to) state.selIdx = null;
            else if(!c2) { state.board[to] = c1; state.board[from] = null; state.selIdx = null; }
            else if(c1.rank === c2.rank && c1.suit.i === c2.suit.i) {
                const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c1.rank) + 1];
                if(nxt === 'A') { state.board[to] = null; state.aceQueue++; Game.handleAce(); }
                else state.board[to] = { rank: nxt, suit: c1.suit, isNew: true };
                state.board[from] = null; state.merges++; state.selIdx = null;
            } else state.selIdx = state.board[idx] ? idx : null;
        }
        UI.render();
    },

    renderVault: () => {
        const v = document.getElementById('v-grid'); v.innerHTML = '';
        state.vault.forEach((c, i) => {
            const cell = document.createElement('div');
            cell.className = `v-cell ${state.selVaultIdx === i ? 'selected' : ''}`;
            if(c) {
                const cardEl = document.createElement('div');
                cardEl.className = 'card'; cardEl.style.color = c.suit.c;
                cardEl.innerHTML = `<div class="rank">${c.rank}</div><div class="suit">${c.suit.i}</div>`;
                cell.appendChild(cardEl);
                cell.onclick = () => { state.selVaultIdx = i; UI.render(); document.getElementById('return-btn').style.display='block'; };
            } else {
                cell.onclick = () => { if(state.selIdx !== null){ const card=state.board[state.selIdx]; if(['J','Q','K'].includes(card.rank)){ state.vault[i]=card; state.board[state.selIdx]=null; state.selIdx=null; UI.render(); } } };
            }
            v.appendChild(cell);
        });
    },

    updateStats: () => {
        document.getElementById('gold-txt').innerText = state.gold;
        document.getElementById('energy-val').innerText = state.energy + '/60';
        document.getElementById('energy-fill').style.width = (state.energy/60)*100 + '%';
        document.getElementById('j-badge').innerText = state.jokers;
        document.getElementById('b-badge').innerText = state.bombs;
        document.getElementById('fc-badge').innerText = state.fastCharges;
        document.getElementById('v-badge').innerText = state.vault.filter(x=>x).length;
        document.getElementById('lvl-badge').innerText = Math.floor(state.merges/40)+1;
        document.getElementById('rank-name').innerText = CONFIG.titles[Math.min(8, Math.floor(state.merges/40))];
        document.getElementById('lvl-fill').style.width = (state.merges%40)*2.5 + '%';
        document.getElementById('d-badge').innerText = `${state.diamond.filter(x=>x).length}/13`;
        document.getElementById('ledger-items').innerHTML = state.history.slice(0,5).map(h => `<div style="padding:4px;border-bottom:1px solid #222">${h}</div>`).join('');
    },

    animateJokerFly: (cellIdx) => {
        const rect = document.querySelectorAll('.cell')[cellIdx].getBoundingClientRect();
        const target = document.getElementById('j-inv').getBoundingClientRect();
        const flyer = document.createElement('div'); flyer.className = 'anim-fly';
        flyer.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;`;
        flyer.innerHTML = '🃏';
        flyer.style.setProperty('--tx', (target.left - rect.left)+'px');
        flyer.style.setProperty('--ty', (target.top - rect.top)+'px');
        document.body.appendChild(flyer); state.board[cellIdx] = null; UI.render();
        setTimeout(()=>{ flyer.remove(); state.jokers++; UI.render(); }, 3000);
    },

    animateBlast: () => { const l = document.getElementById('blast-layer'); l.classList.add('anim-blast'); setTimeout(()=>l.classList.remove('anim-blast'), 500); },
    toggleModal: (id, s) => { document.getElementById(id).style.display = s ? 'flex' : 'none'; },
    drawDiamond: () => {
        const svg = document.getElementById('diamond-svg');
        const p = ["50,5 95,35 50,35", "50,5 50,35 5,35", "5,35 50,35 25,65", "50,35 75,65 25,65", "50,35 95,35 75,65", "25,65 50,95 5,35", "25,65 75,65 50,95", "75,65 95,35 50,95", "50,35 50,65 25,65", "50,35 75,65 50,65", "5,35 25,65 25,35", "95,35 75,65 75,35", "50,5 25,35 75,35"];
        svg.innerHTML = p.map((d, i) => `<polygon points="${d}" class="tri-p ${state.diamond[i]?'active':''}" id="tri-${i}"/>`).join('');
    },
    toggleAuto: () => { state.isAuto = !state.isAuto; document.getElementById('auto-btn').classList.toggle('active-glow', state.isAuto); if(state.isAuto) UI.runAuto(); },
    runAuto: () => {
        if(!state.isAuto) return;
        let m = false;
        for(let i=0; i<20; i++){
            for(let j=i+1; j<20; j++){
                const c1=state.board[i], c2=state.board[j];
                if(c1 && c2 && c1.rank===c2.rank && c1.suit.i===c2.suit.i && c1.rank!=='🃏'){ state.selIdx=i; UI.handleClick(j); m=true; break; }
            }
            if(m) break;
        }
        if(!m && state.energy > 0 && state.board.includes(null)){ Game.spawn(); m=true; }
        if(m) setTimeout(UI.runAuto, 400); else { state.isAuto=false; document.getElementById('auto-btn').classList.remove('active-glow'); }
    }
};

setInterval(() => {
    if(state.energy < 60) {
        const d = Date.now() - state.lastRefill;
        if(d >= CONFIG.refillTime){ state.energy++; state.lastRefill = Date.now(); UI.render(); }
        const r = Math.ceil((CONFIG.refillTime-d)/1000);
        document.getElementById('timer-txt').innerText = `شحن: ${Math.floor(r/60)}:${(r%60).toString().padStart(2,'0')}`;
    } else document.getElementById('timer-txt').innerText = "شحن كامل ✅";
}, 1000);

UI.drawDiamond(); UI.render();