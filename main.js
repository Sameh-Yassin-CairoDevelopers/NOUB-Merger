/**
 * UI & Interaction Controller
 */
const tg = window.Telegram.WebApp; tg.expand();

const UI = {
    init: () => { UI.drawDiamond(); UI.render(); setInterval(UI.tick, 1000); },

    render: () => {
        const g = document.getElementById('grid'); g.innerHTML = '';
        state.board.forEach((c, i) => {
            const cell = document.createElement('div');
            cell.className = `cell ${state.selIdx === i ? 'selected' : ''}`;
            if(c){
                const card = document.createElement('div');
                card.className = `card ${c.isNew?'anim-pop':''}`; card.style.color = c.suit.c;
                card.innerHTML = `<div class="rank">${c.rank}</div><div class="suit">${c.suit.i}</div>`;
                cell.appendChild(card); c.isNew = false;
            }
            cell.onclick = () => UI.handleClick(i); g.appendChild(cell);
        });
        UI.renderVault(); UI.updateHUD();
    },

    handleClick: (idx) => {
        if(state.selIdx === null) { if(state.board[idx] && state.board[idx].rank!=='🃏') state.selIdx = idx; }
        else {
            const from = state.selIdx, to = idx, c1 = state.board[from], c2 = state.board[to];
            if(from === to) state.selIdx = null;
            else if(!c2) { state.board[to]=c1; state.board[from]=null; state.selIdx=null; }
            else if(c1.rank === c2.rank && c1.suit.id === c2.suit.id){
                const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c1.rank)+1];
                if(nxt==='A'){ state.board[to]=null; state.aceQueue++; Engine.handleAce(); }
                else state.board[to]={rank:nxt, suit:c1.suit, isNew:true};
                state.board[from]=null; state.merges++; state.selIdx=null;
                tg.HapticFeedback.impactOccurred('medium');
            } else state.selIdx = state.board[idx] ? idx : null;
        }
        UI.render();
    },

    renderVault: () => {
        const v = document.getElementById('v-grid'); v.innerHTML = '';
        state.vault.forEach((c, i) => {
            const cell = document.createElement('div');
            cell.className = `v-cell ${state.selVIdx===i?'selected':''}`;
            if(c){
                const card = document.createElement('div'); card.className='card'; card.style.color=c.suit.c;
                card.innerHTML = `<div class="rank">${c.rank}</div><div class="suit">${c.suit.i}</div>`;
                cell.appendChild(card);
                cell.onclick = () => { state.selVIdx=i; UI.render(); document.getElementById('return-btn').style.display='block'; };
            } else {
                cell.onclick = () => { if(state.selIdx !== null){ const card=state.board[state.selIdx]; if(['J','Q','K'].includes(card.rank)){ state.vault[i]=card; state.board[state.selIdx]=null; state.selIdx=null; UI.render(); } } };
            }
            v.appendChild(cell);
        });
    },

    updateHUD: () => {
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
        document.getElementById('d-count-ui').innerText = `${state.diamond.filter(x=>x).length}/13`;
        document.getElementById('j-inv').classList.toggle('has-stock', state.jokers > 0);
        document.getElementById('bomb-btn').classList.toggle('has-stock', state.bombs > 0);
    },

    drawDiamond: () => {
        const svg = document.getElementById('diamond-svg');
        svg.innerHTML = CONFIG.triangles.map((d, i) => `<polygon points="${d}" class="tri-p ${state.diamond[i]?'active':''}" id="tri-${i}"/>`).join('');
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
        setTimeout(()=>{ flyer.remove(); state.jokers++; UI.render(); }, 2500);
    },

    animateBlast: () => { const l = document.getElementById('blast-layer'); l.classList.add('anim-blast'); setTimeout(()=>l.classList.remove('anim-blast'), 500); },
    toggleModal: (id, s) => { 
        document.getElementById(id).style.display = s ? 'flex' : 'none';
        if(id==='diamond-scr' && s) UI.drawDiamond();
    },

    toggleAuto: () => { state.isAuto = !state.isAuto; document.getElementById('auto-btn').classList.toggle('active', state.isAuto); if(state.isAuto) UI.runAuto(); },
    runAuto: () => {
        if(!state.isAuto) return;
        let m = false;
        for(let i=0; i<20; i++){
            for(let j=i+1; j<20; j++){
                const c1=state.board[i], c2=state.board[j];
                if(c1 && c2 && c1.rank===c2.rank && c1.suit.id===c2.suit.id && c1.rank!=='🃏'){ state.selIdx=i; UI.handleClick(j); m=true; break; }
            }
            if(m) break;
        }
        if(!m && state.energy > 0 && state.board.includes(null)){ Engine.spawn(); m=true; }
        if(m) setTimeout(UI.runAuto, 350); else { state.isAuto=false; document.getElementById('auto-btn').classList.remove('active'); }
    },

    tick: () => {
        if(state.energy < 60) {
            const d = Date.now() - state.lastRefill;
            if(d >= CONFIG.refillTime){ state.energy++; state.lastRefill = Date.now(); UI.render(); }
            const r = Math.ceil((CONFIG.refillTime-d)/1000);
            document.getElementById('timer-txt').innerText = `شحن: ${Math.floor(r/60)}:${(r%60).toString().padStart(2,'0')}`;
        } else document.getElementById('timer-txt').innerText = "شحن كامل ✅";
        if(Math.random() < 0.01) { document.getElementById('tip-box').style.opacity = 1; setTimeout(()=>document.getElementById('tip-box').style.opacity=0, 5000); }
    }
};

UI.init();
