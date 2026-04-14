/**
 * Dope Wars - Game Configuration
 * All game constants, item definitions, locations, and event templates.
 */
const CONFIG = {
    MAX_DAYS: 30,
    STARTING_CASH: 5500,
    STARTING_DEBT: 5500,
    STARTING_SPACE: 100,
    STARTING_HEALTH: 100,
    LOAN_INTEREST_RATE: 0.10,
    MAX_BORROW: 15000,
    HOSPITAL_COST_PER_HP: 200,

    LOCATIONS: [
        { id: 'bronx', name: 'The Bronx', danger: 0.15 },
        { id: 'ghetto', name: 'The Ghetto', danger: 0.20 },
        { id: 'central_park', name: 'Central Park', danger: 0.10 },
        { id: 'manhattan', name: 'Manhattan', danger: 0.05 },
        { id: 'coney_island', name: 'Coney Island', danger: 0.12 },
        { id: 'brooklyn', name: 'Brooklyn', danger: 0.18 },
    ],

    ITEMS: [
        { id: 'acid',      name: 'Acid',      minPrice: 1000,  maxPrice: 4500,   space: 1, minStock: 3,  maxStock: 12 },
        { id: 'cocaine',    name: 'Cocaine',   minPrice: 15000, maxPrice: 30000,  space: 1, minStock: 1,  maxStock: 5  },
        { id: 'hashish',    name: 'Hashish',   minPrice: 480,   maxPrice: 1400,   space: 1, minStock: 5,  maxStock: 20 },
        { id: 'heroin',     name: 'Heroin',    minPrice: 5500,  maxPrice: 14000,  space: 1, minStock: 2,  maxStock: 8  },
        { id: 'ludes',      name: 'Ludes',     minPrice: 11,    maxPrice: 60,     space: 1, minStock: 15, maxStock: 60 },
        { id: 'mda',        name: 'MDA',       minPrice: 1500,  maxPrice: 4400,   space: 1, minStock: 3,  maxStock: 10 },
        { id: 'opium',      name: 'Opium',     minPrice: 540,   maxPrice: 1250,   space: 1, minStock: 4,  maxStock: 15 },
        { id: 'pcp',        name: 'PCP',       minPrice: 1000,  maxPrice: 2500,   space: 1, minStock: 3,  maxStock: 12 },
        { id: 'peyote',     name: 'Peyote',    minPrice: 200,   maxPrice: 700,    space: 1, minStock: 5,  maxStock: 18 },
        { id: 'shrooms',    name: 'Shrooms',   minPrice: 630,   maxPrice: 1300,   space: 1, minStock: 4,  maxStock: 15 },
        { id: 'speed',      name: 'Speed',     minPrice: 90,    maxPrice: 250,    space: 1, minStock: 10, maxStock: 40 },
        { id: 'weed',       name: 'Weed',      minPrice: 315,   maxPrice: 890,    space: 1, minStock: 6,  maxStock: 25 },
    ],

    // Price events - these cause dramatic price changes
    PRICE_EVENTS: [
        {
            message: 'Cops made a big bust! {item} prices have skyrocketed!',
            type: 'spike',
            items: ['cocaine', 'heroin'],
            multiplier: [3, 5],
        },
        {
            message: 'Addicts are selling {item} real cheap!',
            type: 'crash',
            items: ['heroin', 'opium', 'speed'],
            divisor: [4, 8],
        },
        {
            message: 'A shipment of {item} was intercepted! Prices are through the roof!',
            type: 'spike',
            items: ['cocaine', 'mda', 'acid'],
            multiplier: [2, 4],
        },
        {
            message: 'The market is flooded with cheap {item}!',
            type: 'crash',
            items: ['ludes', 'speed', 'weed', 'peyote'],
            divisor: [3, 6],
        },
        {
            message: 'Rival dealers are dumping {item} below cost!',
            type: 'crash',
            items: ['hashish', 'weed', 'shrooms'],
            divisor: [3, 5],
        },
        {
            message: 'A celebrity was caught with {item}! Everyone wants some now!',
            type: 'spike',
            items: ['cocaine', 'acid', 'mda'],
            multiplier: [2, 4],
        },
        {
            message: 'The feds are cracking down on {item}! Supply is tight!',
            type: 'spike',
            items: ['heroin', 'pcp', 'opium'],
            multiplier: [2, 3],
        },
        {
            message: 'Someone found a stash of {item} in a warehouse!',
            type: 'crash',
            items: ['acid', 'pcp', 'mda'],
            divisor: [3, 6],
        },
    ],

    // Random encounter events
    ENCOUNTERS: {
        MUGGING: {
            chance: 0.08,
            minLoss: 0.05,
            maxLoss: 0.25,
        },
        POLICE: {
            chance: 0.10,
            fineRate: 0.15,
            confiscateChance: 0.30,
        },
        FIND_DRUGS: {
            chance: 0.07,
            items: ['acid', 'hashish', 'ludes', 'weed', 'shrooms', 'peyote', 'speed'],
            minQty: 2,
            maxQty: 8,
        },
        COAT_UPGRADE: {
            chance: 0.04,
            extraSpace: 10,
            cost: [150, 300],
        },
        GUN_SHOP: {
            chance: 0.05,
            cost: [350, 600],
        },
    },

    // Ranks based on final net worth
    RANKS: [
        { min: 1000000, title: 'Drug Lord', color: '#ff66ff' },
        { min: 500000, title: 'Kingpin', color: '#ffcc00' },
        { min: 200000, title: 'Big-Time Dealer', color: '#00ff41' },
        { min: 100000, title: 'Successful Pusher', color: '#00ccff' },
        { min: 50000, title: 'Street Dealer', color: '#e0e0e0' },
        { min: 10000, title: 'Corner Boy', color: '#888' },
        { min: 0, title: 'Small-Time Hustler', color: '#888' },
        { min: -Infinity, title: 'Dead Broke Junkie', color: '#ff4444' },
    ],
};
