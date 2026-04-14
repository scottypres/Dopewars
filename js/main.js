/**
 * Dope Wars - Main Entry Point
 * Initializes the game and wires up all event handlers.
 */
(function () {
    'use strict';

    const game = new DopeWarsGame();
    const ui = new DopeWarsUI(game);

    // ===== Title Screen =====
    const btnContinue = document.getElementById('btn-continue');
    if (game.hasSavedGame()) {
        btnContinue.style.display = '';
    }

    btnContinue.addEventListener('click', () => {
        ui.continueGame();
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
        ui.startGame();
    });

    document.getElementById('btn-high-scores').addEventListener('click', () => {
        ui.renderHighScores();
        ui.showScreen('scores');
    });

    document.getElementById('btn-how-to-play').addEventListener('click', () => {
        ui.showScreen('help');
    });

    // ===== Help & Scores Back =====
    document.getElementById('btn-help-back').addEventListener('click', () => {
        ui.showScreen('title');
    });

    document.getElementById('btn-scores-back').addEventListener('click', () => {
        ui.showScreen('title');
    });

    // ===== Game Over Screen =====
    document.getElementById('btn-submit-score').addEventListener('click', () => {
        ui.submitScore();
    });

    document.getElementById('player-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') ui.submitScore();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
        ui.startGame();
    });

    document.getElementById('btn-gameover-scores').addEventListener('click', () => {
        ui.renderHighScores();
        ui.showScreen('scores');
    });

    document.getElementById('btn-gameover-title').addEventListener('click', () => {
        ui.showScreen('title');
    });

    // ===== Action Bar =====
    document.getElementById('btn-travel').addEventListener('click', () => {
        if (ui.processingEvent) return;
        ui.openTravelModal();
    });

    document.getElementById('btn-bank').addEventListener('click', () => {
        if (ui.processingEvent) return;
        ui.openBankModal();
    });

    document.getElementById('btn-loan-shark').addEventListener('click', () => {
        if (ui.processingEvent) return;
        ui.openLoanModal();
    });

    document.getElementById('btn-hospital').addEventListener('click', () => {
        if (ui.processingEvent) return;
        ui.openHospitalModal();
    });

    document.getElementById('btn-inventory').addEventListener('click', function () {
        const panel = ui.inventoryPanel;
        const isVisible = panel.classList.contains('visible');
        panel.classList.toggle('visible');
        this.dataset.active = !isVisible;
        if (!isVisible) ui.renderInventory();
    });

    // ===== Market Buy/Sell Buttons (delegated) =====
    document.getElementById('market-body').addEventListener('click', (e) => {
        if (ui.processingEvent) return;
        const btn = e.target.closest('button');
        if (!btn || btn.disabled) return;

        const itemId = btn.dataset.item;
        if (btn.classList.contains('btn-buy')) {
            ui.openBuyModal(itemId);
        } else if (btn.classList.contains('btn-sell')) {
            ui.openSellModal(itemId);
        }
    });

    // ===== Buy Modal =====
    document.getElementById('buy-quantity').addEventListener('input', () => {
        ui.updateBuyTotal();
    });

    document.getElementById('btn-buy-max').addEventListener('click', () => {
        const price = game.prices[ui.currentBuyItem] || 1;
        const maxAfford = Math.floor(game.cash / price);
        const maxSpace = game.freeSpace;
        const dealerStock = game.stock[ui.currentBuyItem] || 0;
        const max = Math.min(maxAfford, maxSpace, dealerStock);
        document.getElementById('buy-quantity').value = max;
        ui.updateBuyTotal();
    });

    document.getElementById('btn-buy-confirm').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('buy-quantity').value) || 0;
        if (qty <= 0) return;

        const result = game.buy(ui.currentBuyItem, qty);
        if (result.success) {
            ui.addMessage(result.message, 'msg-buy');
            ui.closeModal('buy');
            ui.refresh();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    // ===== Sell Modal =====
    document.getElementById('sell-quantity').addEventListener('input', () => {
        ui.updateSellTotal();
    });

    document.getElementById('btn-sell-max').addEventListener('click', () => {
        const inv = game.inventory[ui.currentSellItem];
        const max = inv ? inv.qty : 0;
        document.getElementById('sell-quantity').value = max;
        ui.updateSellTotal();
    });

    document.getElementById('btn-sell-confirm').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('sell-quantity').value) || 0;
        if (qty <= 0) return;

        const result = game.sell(ui.currentSellItem, qty);
        if (result.success) {
            ui.addMessage(result.message, 'msg-sell');
            if (result.profit > 0) {
                ui.addMessage(`Profit: +$${result.profit.toLocaleString()}`, 'msg-profit');
            } else if (result.profit < 0) {
                ui.addMessage(`Loss: -$${Math.abs(result.profit).toLocaleString()}`, 'msg-loss');
            }
            ui.closeModal('sell');
            ui.refresh();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    // ===== Bank Modal =====
    document.getElementById('btn-deposit-max').addEventListener('click', () => {
        document.getElementById('bank-deposit-amount').value = game.cash;
    });

    document.getElementById('btn-withdraw-max').addEventListener('click', () => {
        document.getElementById('bank-withdraw-amount').value = game.bank;
    });

    document.getElementById('btn-deposit').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('bank-deposit-amount').value) || 0;
        const result = game.deposit(amount);
        if (result.success) {
            ui.addMessage(result.message, 'msg-buy');
            document.getElementById('bank-cash').textContent = game.cash.toLocaleString();
            document.getElementById('bank-balance').textContent = game.bank.toLocaleString();
            document.getElementById('bank-deposit-amount').value = 0;
            ui.updateStats();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    document.getElementById('btn-withdraw').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('bank-withdraw-amount').value) || 0;
        const result = game.withdraw(amount);
        if (result.success) {
            ui.addMessage(result.message, 'msg-sell');
            document.getElementById('bank-cash').textContent = game.cash.toLocaleString();
            document.getElementById('bank-balance').textContent = game.bank.toLocaleString();
            document.getElementById('bank-withdraw-amount').value = 0;
            ui.updateStats();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    // ===== Loan Shark Modal =====
    document.getElementById('btn-repay-max').addEventListener('click', () => {
        document.getElementById('loan-repay-amount').value = Math.min(game.cash, game.debt);
    });

    document.getElementById('btn-borrow-max').addEventListener('click', () => {
        document.getElementById('loan-borrow-amount').value = Math.max(0, CONFIG.MAX_BORROW - game.debt);
    });

    document.getElementById('btn-repay').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('loan-repay-amount').value) || 0;
        const result = game.repayDebt(amount);
        if (result.success) {
            ui.addMessage(result.message, 'msg-buy');
            document.getElementById('loan-debt').textContent = game.debt.toLocaleString();
            document.getElementById('loan-cash').textContent = game.cash.toLocaleString();
            document.getElementById('loan-repay-amount').value = 0;
            ui.updateStats();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    document.getElementById('btn-borrow').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('loan-borrow-amount').value) || 0;
        const result = game.borrow(amount);
        if (result.success) {
            ui.addMessage(result.message, 'msg-danger');
            document.getElementById('loan-debt').textContent = game.debt.toLocaleString();
            document.getElementById('loan-cash').textContent = game.cash.toLocaleString();
            document.getElementById('loan-borrow-amount').value = 0;
            ui.updateStats();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    // ===== Hospital Modal =====
    document.getElementById('hospital-hp-amount').addEventListener('input', () => {
        ui.updateHospitalTotal();
    });

    document.getElementById('btn-heal-max').addEventListener('click', () => {
        const missing = CONFIG.STARTING_HEALTH - game.health;
        const canAfford = Math.floor(game.cash / CONFIG.HOSPITAL_COST_PER_HP);
        document.getElementById('hospital-hp-amount').value = Math.min(missing, canAfford);
        ui.updateHospitalTotal();
    });

    document.getElementById('btn-heal-confirm').addEventListener('click', () => {
        const hp = parseInt(document.getElementById('hospital-hp-amount').value) || 0;
        if (hp <= 0) return;

        const result = game.heal(hp);
        if (result.success) {
            ui.addMessage(result.message, 'msg-buy');
            document.getElementById('hospital-current-hp').textContent = game.health;
            document.getElementById('hospital-cash').textContent = game.cash.toLocaleString();
            document.getElementById('hospital-hp-amount').value = 0;
            document.getElementById('hospital-total').textContent = '0';
            ui.updateStats();
            ui.autoSave();
        } else {
            ui.addMessage(result.message, 'msg-danger');
        }
    });

    // ===== Modal Close Buttons =====
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            ui.closeAllModals();
        });
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'modal-event') {
                ui.closeAllModals();
            }
        });
    });

    // ===== Keyboard Shortcuts =====
    document.addEventListener('keydown', (e) => {
        // Don't handle if in an input
        if (e.target.tagName === 'INPUT') {
            // Enter key in quantity inputs
            if (e.key === 'Enter') {
                if (ui.modals.buy.classList.contains('active')) {
                    document.getElementById('btn-buy-confirm').click();
                } else if (ui.modals.sell.classList.contains('active')) {
                    document.getElementById('btn-sell-confirm').click();
                }
            }
            return;
        }

        // Only handle shortcuts on game screen
        if (!ui.screens.game.classList.contains('active')) {
            if (e.key === 'Enter' && ui.screens.title.classList.contains('active')) {
                ui.startGame();
            }
            return;
        }

        if (ui.processingEvent) return;

        switch (e.key.toLowerCase()) {
            case 't':
                if (!ui.modals.travel.classList.contains('active')) {
                    ui.openTravelModal();
                }
                break;
            case 'b':
                if (!ui.modals.bank.classList.contains('active')) {
                    ui.openBankModal();
                }
                break;
            case 'l':
                if (!ui.modals.loan.classList.contains('active')) {
                    ui.openLoanModal();
                }
                break;
            case 'h':
                if (!ui.modals.hospital.classList.contains('active')) {
                    ui.openHospitalModal();
                }
                break;
            case 'escape':
                ui.closeAllModals();
                break;
            case '1': case '2': case '3': case '4': case '5': case '6':
                if (ui.modals.travel.classList.contains('active')) {
                    const idx = parseInt(e.key) - 1;
                    if (idx !== game.locationIndex && idx < CONFIG.LOCATIONS.length) {
                        ui.handleTravel(idx);
                    }
                }
                break;
        }
    });

    // ===== Start on Title Screen =====
    ui.showScreen('title');
})();
