const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Инициализация базы данных SQLite для бэкенда
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('📦 Успешное подключение к базе данных бэкенда.');
    }
});

// Создаем таблицу для пожеланий
db.run(`CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Получить все поздравления
app.get('/api/wishes', (req, res) => {
    db.all(`SELECT * FROM wishes ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// API: Добавить новое поздравление
app.post('/api/wishes', (req, res) => {
    const { author, message } = req.body;
    if (!author || !message) {
        return res.status(400).json({ error: 'Поля author и message обязательны!' });
    }

    const query = `INSERT INTO wishes (author, message) VALUES (?, ?)`;
    db.run(query, [author, message], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const newWish = { id: this.lastID, author, message, created_at: new Date().toISOString() };
        
        // Рассылаем через WebSocket всем подключенным
        io.emit('new_wish', newWish);

        res.status(201).json({ success: true, data: newWish });
    });
});

// WebSocket подключение
io.on('connection', (socket) => {
    console.log(`🔌 Пользователь подключился по WebSocket: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`🔌 Пользователь отключился: ${socket.id}`);
    });
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`🚀 Backend-сервер запущен на http://localhost:${PORT}`);
});