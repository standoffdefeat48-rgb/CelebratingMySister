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

// Чтение пожеланий из файла
function getWishes() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Сохранение пожеланий
function saveWish(wish) {
    const wishes = getWishes();
    wishes.unshift(wish);
    fs.writeFileSync(DATA_FILE, JSON.stringify(wishes, null, 2));
    return wishes;
}

// API эндпоинты
app.get('/api/wishes', (req, res) => {
    res.json({ success: true, data: getWishes() });
});

app.post('/api/wishes', (req, res) => {
    const { author, message } = req.body;
    if (!author || !message) {
        return res.status(400).json({ success: false, error: 'Заполните все поля' });
    }
    const newWish = { id: Date.now(), author, message, created_at: new Date() };
    saveWish(newWish);
    
    io.emit('new_wish', newWish);
    res.json({ success: true, data: newWish });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
});
