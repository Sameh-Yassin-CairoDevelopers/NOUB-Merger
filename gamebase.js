/**
 * Noub Merger - Logic & Data Engine
 */
const CONFIG = {
    ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
    titles: ['NOBLE','BARON','COUNT','MARQUIS','DUKE','PRINCE','KING','EMPEROR','LORD'],
    suits: [{id:'S',i:'♠️',c:'#222'},{id:'H',i:'♥️',c:'#d32f2f'},{id:'D',i:'♦️',c:'#d32f2f'},{id:'C',i:'♣️',c:'#222'}],
    refillTime: 120000 // 2 mins
};

let state = {
    gold: 600, energy: 60, merges: 0,
    board: Array(20).fill(null),
    vault: Array(12).fill(null),
    jokers: 3, bombs: 2, fastCharges: 10,
    diamond: Array(13).fill(false),
    lastRefill: Date.now(), isAuto: false,
    selIdx: null, selVaultIdx: null, aceQueue: 0, history: []
};

const Game = {
    spawn: () => {
        const e = state.board.findIndex(x => x === null);
        if(e === -1) return tg.showAlert("الشبكة ممتلئة!");
        if(state.energy <= 0) return;
        
        const luck = Math.random();
        if(luck < 0.07) {
            state.board[e] = { rank: '🃏', suit: {c:'#8e44ad', i:''} };
            UI.render();
            setTimeout(() => UI.animateJokerFly(e), 1200);
        } else {
            let r = CONFIG.ranks[Math.floor(Math.random()*4)];
            if(luck < 0.15) r = luck < 0.05 ? 'Q' : (luck < 0.10 ? 'J' : '10');
            state.board[e] = { rank: r, suit: CONFIG.suits[Math.floor(Math.random()*4)], id: Math.random() };
        }
        state.energy--; UI.render();
    },

    useBomb: () => {
        if(state.bombs <= 0) return;
        UI.animateBlast();
        let newAces = 0;
        state.board = state.board.map(c => {
            if(!c || c.rank === 'A' || c.rank === '🃏') return c;
            const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c.rank) + 1];
            if(nxt === 'A') { newAces++; return null; }
            return { ...c, rank: nxt, isNew: true };
        });
        state.bombs--; state.aceQueue += newAces;
        UI.render(); if(state.aceQueue > 0) Game.handleAce();
    },

    useJoker: () => {
        if(state.jokers <= 0 || state.selIdx === null) return;
        const c = state.board[state.selIdx];
        if(c.rank === 'A' || c.rank === '🃏') return;
        const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c.rank)+1];
        if(nxt === 'A') { state.board[state.selIdx] = null; state.aceQueue++; Game.handleAce(); }
        else state.board[state.selIdx] = { rank: nxt, suit: c.suit, isNew: true };
        state.jokers--; state.selIdx = null; UI.render();
    },

    handleAce: () => {
        if(state.aceQueue <= 0) return;
        state.pendingAce = Math.floor(Math.random() * 13);
        document.getElementById('ace-msg').innerText = `حصلت على القطعة رقم ${state.pendingAce + 1}`;
        UI.toggleModal('ace-modal', true);
    },

    aceChoice: (choice) => {
        const res = (choice === 'sell') ? "تم بيعها 💰" : "أضيفت للماسة 💎";
        if(choice === 'sell') state.gold += 200;
        else if(!state.diamond[state.pendingAce]) { state.diamond[state.pendingAce] = true; UI.drawDiamond(); }
        state.history.unshift(`قطعة ${state.pendingAce+1}: ${res}`);
        UI.toggleModal('ace-modal', false); state.aceQueue--;
        if(state.aceQueue > 0) setTimeout(Game.handleAce, 500); else UI.render();
    },

    trash: () => { if(state.selIdx !== null) { state.board[state.selIdx] = null; state.selIdx = null; UI.render(); } },
    buy: (i, p) => { if(state.gold >= p) { state.gold -= p; if(i === 'bomb') state.bombs++; else state.energy = 60; UI.render(); } },
    fastCharge: () => { if(state.fastCharges > 0) { state.energy = 60; state.fastCharges--; UI.render(); } },
    
    returnFromVault: () => {
        const e = state.board.findIndex(x => x === null);
        if(e === -1) return tg.showAlert("الشبكة ممتلئة!");
        state.board[e] = state.vault[state.selVaultIdx];
        state.vault[state.selVaultIdx] = null; state.selVaultIdx = null; UI.render();
    }
};