/**
 * Game Logic & Data Engine
 */
const CONFIG = {
    ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
    titles: ['NOBLE','BARON','COUNT','MARQUIS','DUKE','PRINCE','KING','EMPEROR','LORD'],
    suits: [{id:'S',i:'♠️',c:'#222'},{id:'H',i:'♥️',c:'#d32f2f'},{id:'D',i:'♦️',c:'#d32f2f'},{id:'C',i:'♣️',c:'#222'}],
    triangles: ["50,5 95,35 50,35", "50,5 50,35 5,35", "5,35 50,35 25,65", "50,35 75,65 25,65", "50,35 95,35 75,65", "25,65 50,95 5,35", "25,65 75,65 50,95", "75,65 95,35 50,95", "50,35 50,65 25,65", "50,35 75,65 50,65", "5,35 25,65 25,35", "95,35 75,65 75,35", "50,5 25,35 75,35"],
    refillTime: 120000 // 2 mins
};

let state = {
    gold: 600, energy: 60, merges: 0,
    board: Array(20).fill(null),
    vault: Array(12).fill(null),
    jokers: 3, bombs: 2, fastCharges: 10,
    diamond: Array(13).fill(false),
    lastRefill: Date.now(),
    isAuto: false, selIdx: null, selVIdx: null,
    pendingAce: null, aceQueue: 0
};

const Engine = {
    spawn: () => {
        const e = state.board.findIndex(x => x === null);
        if(e === -1) return UI.toggleModal('full-modal', true);
        if(state.energy <= 0) return;
        
        const luck = Math.random();
        if(luck < 0.07) {
            state.board[e] = { rank: '🃏', suit: {c: '#8e44ad', i: ''} };
            UI.render(); setTimeout(() => UI.animateJokerFly(e), 1200);
        } else {
            let r = CONFIG.ranks[Math.floor(Math.random()*4)];
            if(luck < 0.15) r = luck < 0.05 ? 'Q' : (luck < 0.10 ? 'J' : '10');
            state.board[e] = { rank: r, suit: CONFIG.suits[Math.floor(Math.random()*4)], suitId: CONFIG.suits[Math.floor(Math.random()*4)].id, isNew: true };
        }
        state.energy--; UI.render();
    },

    useBomb: () => {
        if(state.bombs <= 0) return;
        UI.animateBlast();
        let newAces = 0;
        state.board = state.board.map(c => {
            if(!c || c.rank==='A' || c.rank==='🃏') return c;
            const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c.rank)+1];
            if(nxt==='A'){ newAces++; return null; }
            return {rank:nxt, suit:c.suit, isNew:true};
        });
        state.bombs--; state.aceQueue += newAces;
        UI.render(); if(state.aceQueue > 0) Engine.handleAce();
    },

    useJoker: () => {
        if(state.jokers <= 0 || state.selIdx === null) return;
        const c = state.board[state.selIdx];
        const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c.rank)+1];
        if(nxt==='A'){ state.board[state.selIdx]=null; state.aceQueue++; Engine.handleAce(); }
        else state.board[state.selIdx]={rank:nxt, suit:c.suit, isNew:true};
        state.jokers--; state.selIdx=null; UI.render();
    },

    handleAce: () => {
        if(state.aceQueue <= 0) return;
        state.pendingAce = Math.floor(Math.random()*13);
        document.getElementById('ace-msg').innerText = `حصلت على القطعة رقم ${state.pendingAce+1}`;
        UI.toggleModal('ace-modal', true);
    },

    aceChoice: (choice) => {
        if(choice==='sell') state.gold += 200;
        else if(!state.diamond[state.pendingAce]) { state.diamond[state.pendingAce]=true; UI.drawDiamond(); }
        UI.toggleModal('ace-modal', false); state.aceQueue--;
        if(state.aceQueue > 0) setTimeout(Engine.handleAce, 500); else UI.render();
    },

    returnFromVault: () => {
        const e = state.board.findIndex(x=>x===null);
        if(e===-1) return tg.showAlert("الشبكة ممتلئة!");
        state.board[e] = state.vault[state.selVIdx];
        state.vault[state.selVIdx] = null; state.selVIdx = null; UI.render();
    },

    trash: () => { if(state.selIdx !== null){ state.board[state.selIdx]=null; state.selIdx=null; UI.render(); } },
    buy: (i, p) => { if(state.gold>=p){ state.gold-=p; if(i==='bomb')state.bombs++; else state.energy=60; UI.render(); } },
    fastCharge: () => { if(state.fastCharges > 0){ state.energy = 60; state.fastCharges--; UI.render(); } }
};
