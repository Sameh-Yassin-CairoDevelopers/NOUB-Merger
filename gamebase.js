/**
 * Noub Merger V7.0 - Core Engine & State
 */
const CONFIG = {
    ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
    titles: ['NOBLE','BARON','COUNT','MARQUIS','DUKE','PRINCE','KING','EMPEROR','LORD'],
    suits: [
        {id:'S',i:'♠️',c:'#222'},{id:'H',i:'♥️',c:'#d32f2f'},
        {id:'D',i:'♦️',c:'#d32f2f'},{id:'C',i:'♣️',c:'#222'}
    ],
    refillTime: 120000, // 2 mins
    mergesPerLvl: 40
};

let state = {
    gold: 600, stars: 0, energy: 60, merges: 0,
    board: Array(20).fill(null),
    vault: Array(12).fill(null),
    jokers: 3, bombs: 2, fastCharges: 10,
    diamond: Array(13).fill(false),
    lastRefill: Date.now(), isAuto: false,
    selectedVaultIdx: null
};

const Engine = {
    spawnCard: () => {
        const e = state.board.findIndex(b => b === null);
        if(e === -1) { UI.toggle('full-modal', true); return; }
        if(state.energy <= 0) return;
        
        const luck = Math.random();
        if(luck < 0.07) { UI.animateJoker(e); } 
        else {
            let r = CONFIG.ranks[Math.floor(Math.random()*4)]; // 2-5
            if(luck < 0.02) r = '10';
            else if(luck < 0.05) r = 'J';
            else if(luck < 0.08) r = 'Q';
            state.board[e] = { rank: r, suit: CONFIG.suits[Math.floor(Math.random()*4)], isNew: true };
        }
        state.energy--; UI.render();
    },

    useBomb: () => {
        if(state.bombs <= 0) return;
        UI.animateBlast();
        state.board = state.board.map(c => {
            if(!c || c.rank === 'A') return c;
            const nxt = CONFIG.ranks[CONFIG.ranks.indexOf(c.rank)+1];
            if(nxt === 'A') { Engine.handleAce(); return null; }
            return { rank: nxt, suit: c.suit, isNew: true };
        });
        state.bombs--; UI.render();
    },

    handleAce: () => {
        const p = Math.floor(Math.random()*13);
        state.pendingAce = p;
        document.getElementById('ace-msg').innerText = `حصلت على القطعة رقم ${p+1} ${state.diamond[p]?'(مكررة)':''}`;
        UI.toggle('ace-modal', true);
    },

    aceChoice: (c) => {
        if(c === 'sell') state.gold += 200;
        else if(!state.diamond[state.pendingAce]) { state.diamond[state.pendingAce] = true; UI.updateDiamond(); }
        UI.toggle('ace-modal', false); UI.render();
    },

    returnFromVault: () => {
        const empty = state.board.findIndex(b => b === null);
        if(empty === -1) return tg.showAlert("الشبكة ممتلئة!");
        state.board[empty] = state.vault[state.selectedVaultIdx];
        state.vault[state.selectedVaultIdx] = null;
        state.selectedVaultIdx = null;
        UI.render();
    },

    buy: (item, price) => {
        if(state.gold >= price) {
            state.gold -= price;
            if(item === 'bomb') state.bombs++; else state.energy = 60;
            UI.render();
        } else tg.showAlert("ذهب غير كافٍ!");
    },

    fastCharge: () => {
        if(state.fastCharges > 0) { state.energy = 60; state.fastCharges--; UI.render(); }
    }
};