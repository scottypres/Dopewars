/**
 * Dope Wars - Game Engine
 * Core game state, price generation, event processing, and all game logic.
 */
class DopeWarsGame {
    constructor() {
        this.reset();
    }

    reset() {
        this.day = 1;
        this.cash = CONFIG.STARTING_CASH;
        this.bank = 0;
        this.debt = CONFIG.STARTING_DEBT;
        this.health = CONFIG.STARTING_HEALTH;
        this.maxSpace = CONFIG.STARTING_SPACE;
        this.guns = 0;
        this.locationIndex = 0;
        this.trades = 0;
        this.gameOver = false;

        // Inventory: { itemId: { qty, totalCost } }
        this.inventory = {};

        // Current market prices: { itemId: price }
        this.prices = {};

        // Track which items are available at current location (not all items every day)
        this.availableItems = [];

        // High scores from localStorage
        this.highScores = this.loadHighScores();

        // Generate initial prices
        this.generatePrices();
    }

    // ===== Location =====
    get location() {
        return CONFIG.LOCATIONS[this.locationIndex];
    }

    get usedSpace() {
        let total = 0;
        for (const itemId in this.inventory) {
            total += this.inventory[itemId].qty;
        }
        return total;
    }

    get freeSpace() {
        return this.maxSpace - this.usedSpace;
    }

    get netWorth() {
        let inventoryValue = 0;
        for (const itemId in this.inventory) {
            const item = CONFIG.ITEMS.find(i => i.id === itemId);
            if (item && this.inventory[itemId].qty > 0) {
                // Value inventory at average of min/max price
                const avgPrice = Math.floor((item.minPrice + item.maxPrice) / 2);
                inventoryValue += this.inventory[itemId].qty * avgPrice;
            }
        }
        return this.cash + this.bank + inventoryValue - this.debt;
    }

    get inventoryValue() {
        let value = 0;
        for (const itemId in this.inventory) {
            if (this.inventory[itemId].qty > 0 && this.prices[itemId]) {
                value += this.inventory[itemId].qty * this.prices[itemId];
            }
        }
        return value;
    }

    // ===== Price Generation =====
    generatePrices() {
        this.prices = {};
        this.availableItems = [];

        for (const item of CONFIG.ITEMS) {
            // Each item has a ~80% chance of being available at any location
            if (Math.random() < 0.80) {
                const price = this.randomPrice(item);
                this.prices[item.id] = price;
                this.availableItems.push(item.id);
            }
        }

        // Ensure at least 6 items are available
        while (this.availableItems.length < 6) {
            const item = CONFIG.ITEMS[Math.floor(Math.random() * CONFIG.ITEMS.length)];
            if (!this.availableItems.includes(item.id)) {
                this.prices[item.id] = this.randomPrice(item);
                this.availableItems.push(item.id);
            }
        }
    }

    randomPrice(item) {
        // Generate price with some variance - tends toward the middle
        const range = item.maxPrice - item.minPrice;
        const base = item.minPrice + Math.random() * range;
        // Add some noise
        const noise = (Math.random() - 0.5) * range * 0.2;
        return Math.max(item.minPrice, Math.min(item.maxPrice, Math.round(base + noise)));
    }

    // ===== Trading =====
    buy(itemId, qty) {
        if (qty <= 0) return { success: false, message: 'Invalid quantity.' };

        const price = this.prices[itemId];
        if (!price) return { success: false, message: 'Item not available here.' };

        const totalCost = price * qty;
        if (totalCost > this.cash) return { success: false, message: "You can't afford that!" };
        if (qty > this.freeSpace) return { success: false, message: 'Not enough space in your coat!' };

        this.cash -= totalCost;

        if (!this.inventory[itemId]) {
            this.inventory[itemId] = { qty: 0, totalCost: 0 };
        }
        this.inventory[itemId].qty += qty;
        this.inventory[itemId].totalCost += totalCost;
        this.trades++;

        const item = CONFIG.ITEMS.find(i => i.id === itemId);
        return {
            success: true,
            message: `Bought ${qty} ${item.name} for $${totalCost.toLocaleString()}.`,
        };
    }

    sell(itemId, qty) {
        if (qty <= 0) return { success: false, message: 'Invalid quantity.' };

        if (!this.inventory[itemId] || this.inventory[itemId].qty < qty) {
            return { success: false, message: "You don't have that many!" };
        }

        const price = this.prices[itemId];
        if (!price) return { success: false, message: 'No buyer here for that.' };

        const totalRevenue = price * qty;
        const avgCost = this.inventory[itemId].totalCost / this.inventory[itemId].qty;
        const costBasis = Math.round(avgCost * qty);
        const profit = totalRevenue - costBasis;

        this.cash += totalRevenue;

        // Reduce inventory
        this.inventory[itemId].totalCost -= costBasis;
        this.inventory[itemId].qty -= qty;

        if (this.inventory[itemId].qty <= 0) {
            delete this.inventory[itemId];
        }

        this.trades++;
        const item = CONFIG.ITEMS.find(i => i.id === itemId);

        return {
            success: true,
            message: `Sold ${qty} ${item.name} for $${totalRevenue.toLocaleString()}.`,
            profit: profit,
        };
    }

    // ===== Banking =====
    deposit(amount) {
        amount = Math.floor(amount);
        if (amount <= 0) return { success: false, message: 'Invalid amount.' };
        if (amount > this.cash) return { success: false, message: "You don't have that much cash!" };

        this.cash -= amount;
        this.bank += amount;
        return { success: true, message: `Deposited $${amount.toLocaleString()} in the bank.` };
    }

    withdraw(amount) {
        amount = Math.floor(amount);
        if (amount <= 0) return { success: false, message: 'Invalid amount.' };
        if (amount > this.bank) return { success: false, message: "You don't have that much in the bank!" };

        this.bank -= amount;
        this.cash += amount;
        return { success: true, message: `Withdrew $${amount.toLocaleString()} from the bank.` };
    }

    // ===== Loan Shark =====
    repayDebt(amount) {
        amount = Math.floor(amount);
        if (amount <= 0) return { success: false, message: 'Invalid amount.' };
        if (amount > this.cash) return { success: false, message: "You don't have that much cash!" };
        if (amount > this.debt) amount = this.debt;

        this.cash -= amount;
        this.debt -= amount;

        if (this.debt === 0) {
            return { success: true, message: `Paid off $${amount.toLocaleString()}. Your debt is cleared!` };
        }
        return { success: true, message: `Repaid $${amount.toLocaleString()}. Remaining debt: $${this.debt.toLocaleString()}.` };
    }

    borrow(amount) {
        amount = Math.floor(amount);
        if (amount <= 0) return { success: false, message: 'Invalid amount.' };

        const maxBorrow = CONFIG.MAX_BORROW - this.debt;
        if (amount > maxBorrow) {
            return { success: false, message: `The shark won't lend you more than $${maxBorrow.toLocaleString()}.` };
        }

        this.cash += amount;
        this.debt += amount;
        return { success: true, message: `Borrowed $${amount.toLocaleString()}. Total debt: $${this.debt.toLocaleString()}.` };
    }

    // ===== Travel & Day Progression =====
    travel(locationIndex) {
        if (locationIndex === this.locationIndex) {
            return { success: false, message: "You're already here!" };
        }

        this.locationIndex = locationIndex;
        this.day++;

        // Apply loan interest
        if (this.debt > 0) {
            const interest = Math.round(this.debt * CONFIG.LOAN_INTEREST_RATE);
            this.debt += interest;
        }

        // Generate new prices
        this.generatePrices();

        // Check for random events
        const events = this.generateEvents();

        // Check game over
        if (this.day > CONFIG.MAX_DAYS) {
            this.gameOver = true;
        }

        if (this.health <= 0) {
            this.health = 0;
            this.gameOver = true;
        }

        return {
            success: true,
            message: `You traveled to ${this.location.name}.`,
            events: events,
        };
    }

    // ===== Random Events =====
    generateEvents() {
        const events = [];

        // Price events (check first, these modify prices)
        if (Math.random() < 0.35) {
            const priceEvent = this.generatePriceEvent();
            if (priceEvent) events.push(priceEvent);
        }

        // Second price event (less likely)
        if (Math.random() < 0.15) {
            const priceEvent = this.generatePriceEvent();
            if (priceEvent) events.push(priceEvent);
        }

        // Mugging
        if (Math.random() < CONFIG.ENCOUNTERS.MUGGING.chance * (1 + this.location.danger)) {
            events.push(this.generateMugging());
        }

        // Police encounter
        if (this.usedSpace > 0 && Math.random() < CONFIG.ENCOUNTERS.POLICE.chance * (1 + this.location.danger)) {
            events.push(this.generatePoliceEncounter());
        }

        // Find drugs
        if (Math.random() < CONFIG.ENCOUNTERS.FIND_DRUGS.chance) {
            events.push(this.generateFindDrugs());
        }

        // Coat upgrade opportunity
        if (Math.random() < CONFIG.ENCOUNTERS.COAT_UPGRADE.chance) {
            events.push(this.generateCoatUpgrade());
        }

        // Gun shop
        if (Math.random() < CONFIG.ENCOUNTERS.GUN_SHOP.chance) {
            events.push(this.generateGunShop());
        }

        return events;
    }

    generatePriceEvent() {
        const event = CONFIG.PRICE_EVENTS[Math.floor(Math.random() * CONFIG.PRICE_EVENTS.length)];
        const itemId = event.items[Math.floor(Math.random() * event.items.length)];
        const item = CONFIG.ITEMS.find(i => i.id === itemId);

        // Make item available if it isn't
        if (!this.availableItems.includes(itemId)) {
            this.availableItems.push(itemId);
        }

        let newPrice;
        if (event.type === 'spike') {
            const mult = event.multiplier[0] + Math.random() * (event.multiplier[1] - event.multiplier[0]);
            newPrice = Math.round(item.maxPrice * mult);
        } else {
            const div = event.divisor[0] + Math.random() * (event.divisor[1] - event.divisor[0]);
            newPrice = Math.round(item.minPrice / div);
            newPrice = Math.max(1, newPrice);
        }

        this.prices[itemId] = newPrice;

        return {
            type: 'price',
            subtype: event.type,
            message: event.message.replace('{item}', item.name),
            itemId: itemId,
            newPrice: newPrice,
            interactive: false,
        };
    }

    generateMugging() {
        const lossRate = CONFIG.ENCOUNTERS.MUGGING.minLoss +
            Math.random() * (CONFIG.ENCOUNTERS.MUGGING.maxLoss - CONFIG.ENCOUNTERS.MUGGING.minLoss);

        // Guns provide a chance to fight off muggers
        const fightChance = Math.min(0.8, this.guns * 0.25);

        return {
            type: 'mugging',
            message: 'A gang of thugs approaches you!',
            lossRate: lossRate,
            fightChance: fightChance,
            interactive: true,
        };
    }

    resolveMugging(event, action) {
        if (action === 'fight') {
            if (this.guns > 0 && Math.random() < event.fightChance) {
                // Won the fight
                const damage = Math.floor(Math.random() * 10) + 5;
                this.health -= damage;
                return {
                    message: `You pulled out your gun and fought them off! You took ${damage}% damage.`,
                    success: true,
                };
            } else if (this.guns > 0) {
                // Lost the fight even with guns
                const damage = Math.floor(Math.random() * 20) + 15;
                this.health -= damage;
                const loss = Math.floor(this.cash * event.lossRate);
                this.cash -= loss;
                return {
                    message: `You fought hard but they overpowered you! Lost $${loss.toLocaleString()} and took ${damage}% damage.`,
                    success: false,
                };
            } else {
                // No guns
                const damage = Math.floor(Math.random() * 25) + 15;
                this.health -= damage;
                const loss = Math.floor(this.cash * event.lossRate * 1.5);
                this.cash -= loss;
                return {
                    message: `You tried to fight bare-handed... bad idea. Lost $${loss.toLocaleString()} and took ${damage}% damage.`,
                    success: false,
                };
            }
        } else {
            // Run
            if (Math.random() < 0.5) {
                return {
                    message: 'You managed to escape!',
                    success: true,
                };
            } else {
                const loss = Math.floor(this.cash * event.lossRate);
                this.cash -= loss;
                const damage = Math.floor(Math.random() * 10) + 5;
                this.health -= damage;
                return {
                    message: `They caught you! Lost $${loss.toLocaleString()} and took ${damage}% damage.`,
                    success: false,
                };
            }
        }
    }

    generatePoliceEncounter() {
        return {
            type: 'police',
            message: 'Officer Hardass and the DEA are on your tail!',
            interactive: true,
        };
    }

    resolvePoliceEncounter(action) {
        if (action === 'run') {
            const runChance = 0.4 + (this.guns > 0 ? 0.1 : 0);
            if (Math.random() < runChance) {
                return {
                    message: 'You shook the cops! That was close.',
                    success: true,
                };
            } else {
                // Caught - pay fine, possibly lose drugs
                const fine = Math.floor(this.cash * CONFIG.ENCOUNTERS.POLICE.fineRate);
                this.cash = Math.max(0, this.cash - fine);
                let confiscated = '';

                if (Math.random() < CONFIG.ENCOUNTERS.POLICE.confiscateChance) {
                    // Confiscate random drug
                    const invItems = Object.keys(this.inventory).filter(id => this.inventory[id].qty > 0);
                    if (invItems.length > 0) {
                        const victimId = invItems[Math.floor(Math.random() * invItems.length)];
                        const victimItem = CONFIG.ITEMS.find(i => i.id === victimId);
                        const lostQty = Math.ceil(this.inventory[victimId].qty * (0.3 + Math.random() * 0.4));
                        this.inventory[victimId].qty -= lostQty;
                        this.inventory[victimId].totalCost -= Math.round(
                            (this.inventory[victimId].totalCost / (this.inventory[victimId].qty + lostQty)) * lostQty
                        );
                        if (this.inventory[victimId].qty <= 0) {
                            delete this.inventory[victimId];
                        }
                        confiscated = ` They confiscated ${lostQty} ${victimItem.name}!`;
                    }
                }

                return {
                    message: `Busted! You paid a $${fine.toLocaleString()} fine.${confiscated}`,
                    success: false,
                };
            }
        } else if (action === 'fight') {
            if (this.guns > 0) {
                const fightChance = Math.min(0.6, this.guns * 0.2);
                if (Math.random() < fightChance) {
                    const damage = Math.floor(Math.random() * 15) + 10;
                    this.health -= damage;
                    return {
                        message: `You shot your way out! Took ${damage}% damage in the firefight.`,
                        success: true,
                    };
                } else {
                    const damage = Math.floor(Math.random() * 30) + 20;
                    this.health -= damage;
                    const fine = Math.floor(this.cash * 0.3);
                    this.cash = Math.max(0, this.cash - fine);
                    return {
                        message: `The cops overwhelmed you! Lost $${fine.toLocaleString()} and took ${damage}% damage.`,
                        success: false,
                    };
                }
            } else {
                const damage = Math.floor(Math.random() * 20) + 15;
                this.health -= damage;
                const fine = Math.floor(this.cash * 0.25);
                this.cash = Math.max(0, this.cash - fine);
                return {
                    message: `Fighting cops without a gun? Bold move. Lost $${fine.toLocaleString()} and took ${damage}% damage.`,
                    success: false,
                };
            }
        }
    }

    generateFindDrugs() {
        const enc = CONFIG.ENCOUNTERS.FIND_DRUGS;
        const itemId = enc.items[Math.floor(Math.random() * enc.items.length)];
        const item = CONFIG.ITEMS.find(i => i.id === itemId);
        const qty = enc.minQty + Math.floor(Math.random() * (enc.maxQty - enc.minQty + 1));

        return {
            type: 'find',
            message: `You found ${qty} units of ${item.name} on a dead dude in the subway!`,
            itemId: itemId,
            qty: qty,
            interactive: true,
        };
    }

    resolveFindDrugs(event, action) {
        if (action === 'take') {
            const canTake = Math.min(event.qty, this.freeSpace);
            if (canTake <= 0) {
                return { message: 'No room in your coat! You left them behind.', success: false };
            }
            if (!this.inventory[event.itemId]) {
                this.inventory[event.itemId] = { qty: 0, totalCost: 0 };
            }
            this.inventory[event.itemId].qty += canTake;
            // Free drugs - cost basis is 0
            const item = CONFIG.ITEMS.find(i => i.id === event.itemId);
            return { message: `You grabbed ${canTake} ${item.name}. Free product!`, success: true };
        }
        return { message: 'You left them there. Probably for the best.', success: true };
    }

    generateCoatUpgrade() {
        const enc = CONFIG.ENCOUNTERS.COAT_UPGRADE;
        const cost = enc.cost[0] + Math.floor(Math.random() * (enc.cost[1] - enc.cost[0]));

        return {
            type: 'coat',
            message: `A shady dude offers you a bigger trench coat (+${enc.extraSpace} space) for $${cost.toLocaleString()}.`,
            cost: cost,
            extraSpace: enc.extraSpace,
            interactive: true,
        };
    }

    resolveCoatUpgrade(event, action) {
        if (action === 'buy') {
            if (this.cash < event.cost) {
                return { message: "You can't afford it!", success: false };
            }
            this.cash -= event.cost;
            this.maxSpace += event.extraSpace;
            return { message: `Trench coat upgraded! You now have ${this.maxSpace} total space.`, success: true };
        }
        return { message: "You passed on the coat upgrade.", success: true };
    }

    generateGunShop() {
        const enc = CONFIG.ENCOUNTERS.GUN_SHOP;
        const cost = enc.cost[0] + Math.floor(Math.random() * (enc.cost[1] - enc.cost[0]));

        return {
            type: 'gun',
            message: `A street vendor is selling guns for $${cost.toLocaleString()}. Want to buy one?`,
            cost: cost,
            interactive: true,
        };
    }

    resolveGunPurchase(event, action) {
        if (action === 'buy') {
            if (this.cash < event.cost) {
                return { message: "You can't afford it!", success: false };
            }
            this.cash -= event.cost;
            this.guns++;
            return { message: `Bought a gun! You now have ${this.guns} gun${this.guns > 1 ? 's' : ''}. This will help in fights.`, success: true };
        }
        return { message: "You decided to pass on the firearm.", success: true };
    }

    // ===== Game Over & Scoring =====
    getFinalStats() {
        return {
            netWorth: this.netWorth,
            cash: this.cash,
            bank: this.bank,
            inventoryValue: this.inventoryValue,
            debt: this.debt,
            days: this.day - 1,
            trades: this.trades,
        };
    }

    getRank(netWorth) {
        for (const rank of CONFIG.RANKS) {
            if (netWorth >= rank.min) return rank;
        }
        return CONFIG.RANKS[CONFIG.RANKS.length - 1];
    }

    // ===== High Scores =====
    loadHighScores() {
        try {
            const data = localStorage.getItem('dopewars_highscores');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    saveHighScore(name, netWorth) {
        this.highScores.push({ name, netWorth, date: new Date().toISOString() });
        this.highScores.sort((a, b) => b.netWorth - a.netWorth);
        this.highScores = this.highScores.slice(0, 10);
        try {
            localStorage.setItem('dopewars_highscores', JSON.stringify(this.highScores));
        } catch {
            // localStorage unavailable
        }
    }
}
