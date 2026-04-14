const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'data', 'scores.json');
const MAX_SCORES = 50;

app.use(express.json());
app.use(express.static(__dirname));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

function readScores() {
    try {
        if (fs.existsSync(SCORES_FILE)) {
            return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
        }
    } catch {
        // Corrupted file, reset
    }
    return [];
}

function writeScores(scores) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

// GET /api/scores - Retrieve top scores
app.get('/api/scores', (req, res) => {
    const scores = readScores();
    res.json(scores);
});

// POST /api/scores - Submit a new score
app.post('/api/scores', (req, res) => {
    const { name, netWorth, rank } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required.' });
    }
    if (typeof netWorth !== 'number' || !isFinite(netWorth)) {
        return res.status(400).json({ error: 'Valid netWorth is required.' });
    }

    const sanitizedName = name.trim().slice(0, 20);
    const entry = {
        name: sanitizedName,
        netWorth: netWorth,
        rank: (rank || '').slice(0, 30),
        date: new Date().toISOString(),
    };

    const scores = readScores();
    scores.push(entry);
    scores.sort((a, b) => b.netWorth - a.netWorth);
    const trimmed = scores.slice(0, MAX_SCORES);
    writeScores(trimmed);

    const position = trimmed.findIndex(
        s => s.name === entry.name && s.date === entry.date
    );

    res.json({ success: true, position: position + 1, total: trimmed.length });
});

app.listen(PORT, () => {
    console.log(`Dope Wars server running at http://localhost:${PORT}`);
});
