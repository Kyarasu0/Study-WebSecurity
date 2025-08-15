import express from 'express';
import path from 'path';
import sqlite3 from 'sqlite3';
const sqlite = sqlite3.verbose();
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path'

// cookieをリセットしたい場合はこちら
// document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
// document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

// pathを定義
const __filename = fileURLToPath(import.meta.url);
console.log(__filename);

const __dirname = dirname(__filename)
console.log(__dirname);

// Databaseを定義
const db = new sqlite.Database('./UserInformation.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
});

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 新規登録（フォームから送信）
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Missing username or password');
    }

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) {
            return res.status(500).send('Registration failed');
        }
        res.send('Registered successfully');
    });
});

// ログイン（CookieにユーザーIDを保存）
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).send('Login failed');
        if (row) {
            res.cookie('user_id', row.id);
            res.cookie('username', row.username); // ユーザー名もCookieに保存
            res.redirect('/profile'); // 成功したら/profileにリダイレクト
        } else {
            res.status(401).send('Invalid');
        }
    });
});

// プロフィール表示
app.get('/profile', (req, res) => {
    const userId = req.cookies.user_id;
    if (!userId){
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }else{
        db.get('SELECT id, username FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) return res.status(500).send('Error retrieving profile');
            if (!row) return res.status(404).send('User not found');

            res.cookie('username', row.username); // ユーザー名もCookieに保存
            res.sendFile(path.join(__dirname, 'public', 'success.html'));
        });
    }
});

// サーバー起動
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});