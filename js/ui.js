/**
 * Dope Wars - UI Layer
 * Handles all DOM updates, rendering, and user interaction.
 */
class DopeWarsUI {
    constructor(game) {
        this.game = game;
        this.currentBuyItem = null;
        this.currentSellItem = null;
        this.eventQueue = [];
        this.processingEvent = false;
        this.cacheElements();
    }

    cacheElements() {
        // Screens
        this.screens = {
            title: document.getElementById('screen-title'),
            help: document.getElementById('screen-help'),
            scores: document.getElementById('screen-scores'),
            game: document.getElementById('screen-game'),
            gameover: document.getElementById('screen-gameover'),
        };

        // Stats
        this.stats = {
            day: document.getElementById('stat-day'),
            location: document.getElementById('stat-location'),
            cash: document.getElementById('stat-cash'),
            bank: document.getElementById('stat-bank'),
            debt: document.getElementById('stat-debt'),
            space: document.getElementById('stat-space'),
            maxSpace: document.getElementById('stat-max-space'),
            health: document.getElementById('stat-health'),
            healthFill: document.getElementById('stat-health-fill'),
            weapon: document.getElementById('stat-weapon'),
            netWorth: document.getElementById('stat-net-worth'),
        };

        // Panels
        this.marketBody = document.getElementById('market-body');
        this.inventoryBody = document.getElementById('inventory-body');
        this.inventoryPanel = document.getElementById('panel-inventory');
        this.messagesEl = document.getElementById('messages');
        this.messageLog = document.getElementById('message-log');

        // Modals
        this.modals = {
            travel: document.getElementById('modal-travel'),
            buy: document.getElementById('modal-buy'),
            sell: document.getElementById('modal-sell'),
            bank: document.getElementById('modal-bank'),
            loan: document.getElementById('modal-loan'),
            hospital: document.getElementById('modal-hospital'),
            event: document.getElementById('modal-event'),
        };
    }

    // ===== Screen Management =====
    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }

    // ===== Modal Management =====
    openModal(modalName) {
        this.modals[modalName].classList.add('active');
    }

    closeModal(modalName) {
        this.modals[modalName].classList.remove('active');
    }

    closeAllModals() {
        Object.values(this.modals).forEach(m => m.classList.remove('active'));
    }

    // ===== Status Bar =====
    updateStats() {
        const g = this.game;
        this.stats.day.textContent = g.day;
        this.stats.location.textContent = g.location.name;
        this.stats.cash.textContent = g.cash.toLocaleString();
        this.stats.bank.textContent = g.bank.toLocaleString();
        this.stats.debt.textContent = g.debt.toLocaleString();
        this.stats.space.textContent = g.freeSpace;
        this.stats.maxSpace.textContent = g.maxSpace;
        this.stats.health.textContent = g.health;
        this.stats.weapon.textContent = g.weaponName;

        const nw = g.netWorth;
        this.stats.netWorth.textContent = (nw < 0 ? '-$' + Math.abs(nw).toLocaleString() : nw.toLocaleString());
        this.stats.netWorth.classList.toggle('negative', nw < 0);

        // Health bar
        const hp = Math.max(0, g.health);
        this.stats.healthFill.style.width = hp + '%';
        this.stats.healthFill.classList.remove('warning', 'danger');
        if (hp <= 25) this.stats.healthFill.classList.add('danger');
        else if (hp <= 50) this.stats.healthFill.classList.add('warning');

        // Debt styling
        this.stats.debt.classList.toggle('paid-off', g.debt === 0);
    }

    // ===== Market Table =====
    renderMarket() {
        this.marketBody.innerHTML = '';

        for (const item of CONFIG.ITEMS) {
            const row = document.createElement('tr');
            const price = this.game.prices[item.id];
            const inv = this.game.inventory[item.id];
            const qty = inv ? inv.qty : 0;
            const available = this.game.availableItems.includes(item.id);

            if (!available && qty === 0) continue;

            // Determine price class based on profit/loss vs avg cost
            let priceClass = 'item-price';
            let plCell = '-';
            if (available && qty > 0 && inv) {
                const avgCost = inv.totalCost / inv.qty;
                const pctChange = ((price - avgCost) / avgCost) * 100;
                if (pctChange > 0) {
                    priceClass = 'item-price profit';
                    plCell = `<span class="pl-profit">+${pctChange.toFixed(0)}%</span>`;
                } else if (pctChange < 0) {
                    priceClass = 'item-price loss';
                    plCell = `<span class="pl-loss">${pctChange.toFixed(0)}%</span>`;
                } else {
                    plCell = `<span class="pl-even">0%</span>`;
                }
            } else if (available) {
                // No inventory - show price relative to typical range
                if (price > item.maxPrice * 1.5) priceClass += ' high';
                else if (price < item.minPrice * 0.5) priceClass += ' low';
            }

            const dealerStock = available ? (this.game.stock[item.id] || 0) : 0;
            const soldOut = available && dealerStock <= 0;

            row.innerHTML = `
                <td class="item-name">${item.name}</td>
                <td class="${available ? priceClass : 'no-stock'}">${available ? '$' + price.toLocaleString() : 'N/A'}</td>
                <td class="${soldOut ? 'stock-empty' : 'stock-qty'}">${available ? (dealerStock > 0 ? dealerStock : 'Sold out') : '-'}</td>
                <td class="item-qty">${qty > 0 ? qty : '-'}</td>
                <td class="item-pl">${plCell}</td>
                <td class="item-actions">
                    <button class="btn btn-buy" ${!available || soldOut ? 'disabled' : ''} data-item="${item.id}">Buy</button>
                    <button class="btn btn-sell" ${qty <= 0 ? 'disabled' : ''} data-item="${item.id}">Sell</button>
                </td>
            `;
            this.marketBody.appendChild(row);
        }
    }

    // ===== Inventory Table =====
    renderInventory() {
        this.inventoryBody.innerHTML = '';
        let hasItems = false;

        for (const itemId in this.game.inventory) {
            const inv = this.game.inventory[itemId];
            if (inv.qty <= 0) continue;
            hasItems = true;

            const item = CONFIG.ITEMS.find(i => i.id === itemId);
            const avgCost = Math.round(inv.totalCost / inv.qty);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="item-name">${item.name}</td>
                <td class="item-qty">${inv.qty}</td>
                <td class="item-avg-cost">$${avgCost.toLocaleString()}</td>
            `;
            this.inventoryBody.appendChild(row);
        }

        if (!hasItems) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="no-stock">Your stash is empty.</td>';
            this.inventoryBody.appendChild(row);
        }
    }

    // ===== Buy Modal =====
    openBuyModal(itemId) {
        const item = CONFIG.ITEMS.find(i => i.id === itemId);
        const price = this.game.prices[itemId];
        if (!price) return;

        this.currentBuyItem = itemId;
        const maxAfford = Math.floor(this.game.cash / price);
        const maxSpace = this.game.freeSpace;
        const dealerStock = this.game.stock[itemId] || 0;
        const maxQty = Math.min(maxAfford, maxSpace, dealerStock);

        document.getElementById('buy-item-name').textContent = item.name;
        document.getElementById('buy-item-price').textContent = price.toLocaleString();
        document.getElementById('buy-max-afford').textContent = maxAfford;
        document.getElementById('buy-max-space').textContent = maxSpace;
        document.getElementById('buy-max-stock').textContent = dealerStock;
        document.getElementById('buy-quantity').value = 0;
        document.getElementById('buy-quantity').max = maxQty;
        document.getElementById('buy-total').textContent = '0';

        this.openModal('buy');
        document.getElementById('buy-quantity').focus();
    }

    updateBuyTotal() {
        const qty = parseInt(document.getElementById('buy-quantity').value) || 0;
        const price = this.game.prices[this.currentBuyItem] || 0;
        document.getElementById('buy-total').textContent = (qty * price).toLocaleString();
    }

    // ===== Sell Modal =====
    openSellModal(itemId) {
        const item = CONFIG.ITEMS.find(i => i.id === itemId);
        const inv = this.game.inventory[itemId];
        if (!inv || inv.qty <= 0) return;

        this.currentSellItem = itemId;
        const price = this.game.prices[itemId];
        const avgCost = Math.round(inv.totalCost / inv.qty);

        document.getElementById('sell-item-name').textContent = item.name;
        document.getElementById('sell-item-price').textContent = price ? price.toLocaleString() : 'N/A';
        document.getElementById('sell-avg-cost').textContent = avgCost.toLocaleString();
        document.getElementById('sell-max-qty').textContent = inv.qty;
        document.getElementById('sell-quantity').value = 0;
        document.getElementById('sell-quantity').max = inv.qty;
        document.getElementById('sell-total').textContent = '0';
        document.getElementById('sell-profit-line').textContent = '';

        this.openModal('sell');
        document.getElementById('sell-quantity').focus();
    }

    updateSellTotal() {
        const qty = parseInt(document.getElementById('sell-quantity').value) || 0;
        const price = this.game.prices[this.currentSellItem] || 0;
        const revenue = qty * price;
        document.getElementById('sell-total').textContent = revenue.toLocaleString();

        const profitLine = document.getElementById('sell-profit-line');
        const inv = this.game.inventory[this.currentSellItem];
        if (qty > 0 && inv && inv.qty > 0) {
            const avgCost = inv.totalCost / inv.qty;
            const costBasis = Math.round(avgCost * qty);
            const profit = revenue - costBasis;
            const pct = costBasis > 0 ? ((profit / costBasis) * 100).toFixed(0) : (profit > 0 ? 100 : 0);
            if (profit > 0) {
                profitLine.textContent = `Profit: +$${profit.toLocaleString()} (+${pct}%)`;
                profitLine.className = 'modal-profit profit';
            } else if (profit < 0) {
                profitLine.textContent = `Loss: -$${Math.abs(profit).toLocaleString()} (${pct}%)`;
                profitLine.className = 'modal-profit loss';
            } else {
                profitLine.textContent = 'Break even';
                profitLine.className = 'modal-profit even';
            }
        } else {
            profitLine.textContent = '';
        }
    }

    // ===== Bank Modal =====
    openBankModal() {
        document.getElementById('bank-cash').textContent = this.game.cash.toLocaleString();
        document.getElementById('bank-balance').textContent = this.game.bank.toLocaleString();
        document.getElementById('bank-deposit-amount').value = 0;
        document.getElementById('bank-withdraw-amount').value = 0;
        this.openModal('bank');
    }

    // ===== Loan Shark Modal =====
    openLoanModal() {
        document.getElementById('loan-debt').textContent = this.game.debt.toLocaleString();
        document.getElementById('loan-cash').textContent = this.game.cash.toLocaleString();
        document.getElementById('loan-repay-amount').value = 0;
        document.getElementById('loan-borrow-amount').value = 0;
        this.openModal('loan');
    }

    // ===== Hospital Modal =====
    openHospitalModal() {
        const missing = CONFIG.STARTING_HEALTH - this.game.health;
        document.getElementById('hospital-cost-per-hp').textContent = CONFIG.HOSPITAL_COST_PER_HP.toLocaleString();
        document.getElementById('hospital-current-hp').textContent = this.game.health;
        document.getElementById('hospital-cash').textContent = this.game.cash.toLocaleString();
        document.getElementById('hospital-hp-amount').value = 0;
        document.getElementById('hospital-hp-amount').max = missing;
        document.getElementById('hospital-total').textContent = '0';
        this.openModal('hospital');
    }

    updateHospitalTotal() {
        const hp = parseInt(document.getElementById('hospital-hp-amount').value) || 0;
        document.getElementById('hospital-total').textContent = (hp * CONFIG.HOSPITAL_COST_PER_HP).toLocaleString();
    }

    // ===== Travel Modal =====
    openTravelModal() {
        const container = document.getElementById('travel-locations');
        container.innerHTML = '';

        for (let i = 0; i < CONFIG.LOCATIONS.length; i++) {
            const loc = CONFIG.LOCATIONS[i];
            const btn = document.createElement('button');
            btn.className = 'location-btn' + (i === this.game.locationIndex ? ' current' : '');
            btn.textContent = loc.name;
            btn.dataset.index = i;
            if (i !== this.game.locationIndex) {
                btn.addEventListener('click', () => this.handleTravel(i));
            }
            container.appendChild(btn);
        }

        this.openModal('travel');
    }

    // ===== Event System =====
    showEventModal(event) {
        const title = document.getElementById('event-title');
        const message = document.getElementById('event-message');
        const actions = document.getElementById('event-actions');
        actions.innerHTML = '';

        switch (event.type) {
            case 'price':
                title.textContent = 'Market News!';
                title.style.color = event.subtype === 'spike' ? '#ff4444' : '#00ccff';
                message.textContent = event.message;
                const okBtn = this.createEventButton('OK', () => this.resolveCurrentEvent());
                actions.appendChild(okBtn);
                break;

            case 'mugging':
                title.textContent = 'Mugging!';
                title.style.color = '#ff4444';
                message.textContent = event.message +
                    (this.game.hasWeapon ? ` You have: ${this.game.weaponName}.` : ' You have no weapons!');
                const fightBtn = this.createEventButton(
                    this.game.hasWeapon ? `Fight (${this.game.weaponName})` : 'Fight (fists!)',
                    () => this.resolveCurrentEvent('fight')
                );
                const runBtn = this.createEventButton('Run!', () => this.resolveCurrentEvent('run'));
                actions.appendChild(fightBtn);
                actions.appendChild(runBtn);
                break;

            case 'police':
                title.textContent = 'Police!';
                title.style.color = '#ff4444';
                message.textContent = event.message;
                const runCopBtn = this.createEventButton('Run!', () => this.resolveCurrentEvent('run'));
                const fightCopBtn = this.createEventButton(
                    this.game.hasWeapon ? `Fight (${this.game.weaponName})` : 'Fight (risky!)',
                    () => this.resolveCurrentEvent('fight')
                );
                actions.appendChild(runCopBtn);
                actions.appendChild(fightCopBtn);
                break;

            case 'find':
                title.textContent = 'Lucky Find!';
                title.style.color = '#00ff41';
                message.textContent = event.message;
                const takeBtn = this.createEventButton('Take it!', () => this.resolveCurrentEvent('take'));
                const leaveBtn = this.createEventButton('Leave it', () => this.resolveCurrentEvent('leave'));
                actions.appendChild(takeBtn);
                actions.appendChild(leaveBtn);
                break;

            case 'coat':
                title.textContent = 'Upgrade Available!';
                title.style.color = '#ffcc00';
                message.textContent = event.message;
                const buyCoatBtn = this.createEventButton('Buy it!', () => this.resolveCurrentEvent('buy'));
                const passCoatBtn = this.createEventButton('Pass', () => this.resolveCurrentEvent('pass'));
                actions.appendChild(buyCoatBtn);
                actions.appendChild(passCoatBtn);
                break;

            case 'gun':
                title.textContent = 'Gun Shop!';
                title.style.color = '#ff8800';
                message.textContent = event.message;
                const buyGunBtn = this.createEventButton('Buy it!', () => this.resolveCurrentEvent('buy'));
                const passGunBtn = this.createEventButton('Pass', () => this.resolveCurrentEvent('pass'));
                actions.appendChild(buyGunBtn);
                actions.appendChild(passGunBtn);
                break;
        }

        this.openModal('event');
    }

    createEventButton(text, handler) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = text;
        btn.addEventListener('click', handler);
        return btn;
    }

    resolveCurrentEvent(action) {
        if (this.eventQueue.length === 0) {
            this.closeModal('event');
            this.processingEvent = false;
            this.refresh();
            this.checkGameOver();
            return;
        }

        const event = this.eventQueue[0];
        let result = null;

        if (!event.interactive || action) {
            // Resolve the event
            switch (event.type) {
                case 'price':
                    // Already applied, just log it
                    this.addMessage(event.message, event.subtype === 'spike' ? 'msg-danger' : 'msg-event');
                    break;
                case 'mugging':
                    result = this.game.resolveMugging(event, action);
                    this.addMessage(result.message, result.success ? 'msg-event' : 'msg-danger');
                    break;
                case 'police':
                    result = this.game.resolvePoliceEncounter(action);
                    this.addMessage(result.message, result.success ? 'msg-event' : 'msg-danger');
                    break;
                case 'find':
                    result = this.game.resolveFindDrugs(event, action);
                    this.addMessage(result.message, result.success ? 'msg-buy' : 'msg-info');
                    break;
                case 'coat':
                    result = this.game.resolveCoatUpgrade(event, action);
                    this.addMessage(result.message, result.success ? 'msg-buy' : 'msg-info');
                    break;
                case 'gun':
                    result = this.game.resolveGunPurchase(event, action);
                    this.addMessage(result.message, result.success ? 'msg-buy' : 'msg-info');
                    break;
            }

            this.eventQueue.shift();
            this.updateStats();
        }

        // Check if more events to process
        if (this.eventQueue.length > 0) {
            this.showEventModal(this.eventQueue[0]);
        } else {
            this.closeModal('event');
            this.processingEvent = false;
            this.refresh();
            this.autoSave();
            this.checkGameOver();
        }
    }

    processEventQueue(events) {
        this.eventQueue = [...events];
        if (this.eventQueue.length === 0) {
            this.refresh();
            this.checkGameOver();
            return;
        }

        this.processingEvent = true;
        // Handle non-interactive price events silently first
        const nonInteractive = [];
        const interactive = [];
        for (const evt of this.eventQueue) {
            if (!evt.interactive) nonInteractive.push(evt);
            else interactive.push(evt);
        }

        // Log price events immediately
        for (const evt of nonInteractive) {
            if (evt.type === 'price') {
                this.addMessage(evt.message, evt.subtype === 'spike' ? 'msg-danger' : 'msg-event');
            }
        }

        // Process interactive events
        this.eventQueue = interactive;
        if (this.eventQueue.length > 0) {
            this.showEventModal(this.eventQueue[0]);
        } else {
            this.processingEvent = false;
            this.refresh();
            this.checkGameOver();
        }
    }

    // ===== Travel Handler =====
    handleTravel(locationIndex) {
        this.closeModal('travel');
        const result = this.game.travel(locationIndex);
        if (!result.success) return;

        this.addMessage(`--- Day ${this.game.day} - ${this.game.location.name} ---`, 'msg-info');

        if (this.game.debt > 0) {
            this.addMessage(`Loan shark interest applied. Debt: $${this.game.debt.toLocaleString()}`, 'msg-danger');
        }

        this.updateStats();
        this.autoSave();
        this.processEventQueue(result.events);
    }

    // ===== Messages =====
    addMessage(text, className = 'msg-info') {
        const msg = document.createElement('div');
        msg.className = 'msg ' + className;
        msg.textContent = text;
        this.messagesEl.appendChild(msg);
        this.messageLog.scrollTop = this.messageLog.scrollHeight;

        // Keep max 50 messages
        while (this.messagesEl.children.length > 50) {
            this.messagesEl.removeChild(this.messagesEl.firstChild);
        }
    }

    // ===== Refresh All =====
    refresh() {
        this.updateStats();
        this.renderMarket();
        this.renderInventory();
    }

    // ===== Game Over =====
    checkGameOver() {
        if (!this.game.gameOver) return;

        if (this.game.health <= 0) {
            this.addMessage('You died! Game over.', 'msg-danger');
        }

        setTimeout(() => this.showGameOver(), 500);
    }

    showGameOver() {
        this.game.clearSaveCookie();
        const stats = this.game.getFinalStats();
        this.finalStats = stats;
        this.finalRank = this.game.getRank(stats.netWorth);

        document.getElementById('final-net-worth').textContent =
            (stats.netWorth < 0 ? '-$' + Math.abs(stats.netWorth).toLocaleString() : '$' + stats.netWorth.toLocaleString());
        document.getElementById('final-net-worth').classList.toggle('negative', stats.netWorth < 0);

        document.getElementById('final-cash').textContent = '$' + stats.cash.toLocaleString();
        document.getElementById('final-bank').textContent = '$' + stats.bank.toLocaleString();
        document.getElementById('final-inventory').textContent = '$' + stats.inventoryValue.toLocaleString();
        document.getElementById('final-debt').textContent = '-$' + stats.debt.toLocaleString();
        document.getElementById('final-days').textContent = stats.days;
        document.getElementById('final-trades').textContent = stats.trades;

        const rankEl = document.getElementById('gameover-rank');
        rankEl.textContent = `Rank: ${this.finalRank.title}`;
        rankEl.style.color = this.finalRank.color;
        rankEl.style.borderColor = this.finalRank.color;

        // Reset score submit form
        document.getElementById('player-name').value = '';
        document.getElementById('score-submit-status').textContent = '';
        document.getElementById('score-submit').style.display = '';
        document.getElementById('btn-submit-score').disabled = false;

        this.showScreen('gameover');
        document.getElementById('player-name').focus();
    }

    async submitScore() {
        const nameInput = document.getElementById('player-name');
        const statusEl = document.getElementById('score-submit-status');
        const name = nameInput.value.trim();

        if (!name) {
            statusEl.textContent = 'Please enter your name.';
            statusEl.className = 'score-status error';
            return;
        }

        document.getElementById('btn-submit-score').disabled = true;
        statusEl.textContent = 'Submitting...';
        statusEl.className = 'score-status';

        const result = await this.game.submitHighScore(
            name, this.finalStats.netWorth, this.finalRank.title
        );

        if (result && result.success) {
            statusEl.textContent = `Score submitted! You ranked #${result.position} of ${result.total}.`;
            statusEl.className = 'score-status success';
            document.getElementById('score-submit').style.display = 'none';
        } else {
            statusEl.textContent = 'Failed to submit score. Server may be offline.';
            statusEl.className = 'score-status error';
            document.getElementById('btn-submit-score').disabled = false;
        }
    }

    // ===== High Scores =====
    async renderHighScores() {
        const list = document.getElementById('high-scores-list');
        list.innerHTML = '<p class="empty-scores">Loading scores...</p>';

        const scores = await this.game.fetchHighScores();

        if (scores.length === 0) {
            list.innerHTML = '<p class="empty-scores">No high scores yet. Start playing!</p>';
            return;
        }

        list.innerHTML = '';
        scores.forEach((score, i) => {
            const entry = document.createElement('div');
            entry.className = 'score-entry';
            const nw = score.netWorth;
            entry.innerHTML = `
                <span class="score-rank">#${i + 1}</span>
                <span class="score-name">${score.name || 'Player'}${score.rank ? ' <span style="color:#888;font-size:11px">(' + score.rank + ')</span>' : ''}</span>
                <span class="score-value">${nw < 0 ? '-$' + Math.abs(nw).toLocaleString() : '$' + nw.toLocaleString()}</span>
            `;
            list.appendChild(entry);
        });
    }

    // ===== Auto-save =====
    autoSave() {
        if (!this.game.gameOver) {
            this.game.saveToCookie();
        }
    }

    // ===== Initialize Game Screen =====
    startGame() {
        this.game.reset();
        this.game.clearSaveCookie();
        this.messagesEl.innerHTML = '';
        this.addMessage('Welcome to Dope Wars!', 'msg-event');
        this.addMessage(`You start in ${this.game.location.name} with $${this.game.cash.toLocaleString()} cash.`, 'msg-info');
        this.addMessage(`You owe the Loan Shark $${this.game.debt.toLocaleString()}. Interest: 10%/day!`, 'msg-danger');
        this.addMessage('Buy low, sell high. You have 30 days. Good luck!', 'msg-info');
        this.autoSave();
        this.refresh();
        this.showScreen('game');
    }

    continueGame() {
        if (!this.game.loadFromCookie()) return false;
        this.messagesEl.innerHTML = '';
        this.addMessage('Welcome back!', 'msg-event');
        this.addMessage(`Day ${this.game.day} - ${this.game.location.name}`, 'msg-info');
        this.addMessage(`Cash: $${this.game.cash.toLocaleString()} | Debt: $${this.game.debt.toLocaleString()}`, 'msg-info');
        this.refresh();
        this.showScreen('game');
        return true;
    }
}
