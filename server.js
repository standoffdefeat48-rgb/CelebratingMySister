const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'wishes.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getWishes() {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

app.get('/api/wishes', (req, res) => {
    res.json({ success: true, data: getWishes() });
});

app.post('/api/wishes', (req, res) => {
    const { author, message } = req.body;
    if (!author || !message) {
        return res.status(400).json({ success: false });
    }
    const wishes = getWishes();
    const newWish = { id: Date.now(), author, message };
    wishes.unshift(newWish);
    fs.writeFileSync(DATA_FILE, JSON.stringify(wishes, null, 2));
    
    io.emit('new_wish', newWish);
    res.json({ success: true, data: newWish });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
