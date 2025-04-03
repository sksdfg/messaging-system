const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(cors());

// MySQL Connection Pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'messageing_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
app.use('/uploads', express.static('uploads'));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Signup Route
app.post('/signup', async (req, res) => {
    const { username, email, password, image } = req.body;
    if (!username || !email || !password || !image) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        await db.execute(`INSERT INTO users (username, email, password, image) VALUES (?, ?, ?, ?)`,
            [username, email, password, image]);
        res.json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const [results] = await db.execute(
            `SELECT user_id, image FROM users WHERE username = ? AND email = ? AND password = ?`,
            [username, email, password]
        );
        if (results.length === 1) {
            req.session.user_id = results[0].user_id;
            req.session.username = username;
            res.json({ 
                message: `Welcome ${username}`, 
                image: results[0].image, 
                user_id: results[0].user_id 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get User Info
app.get('/user-info', async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }
    const user_id = req.session.user_id;
    try {
        const [users] = await db.execute(
            `SELECT username, image FROM users WHERE user_id = ?`, 
            [user_id]
        );
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ user: users[0] });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ message: 'Logged out successfully' });
    });
});

// Upload Attachment Route
app.post('/upload-attachment', upload.single('attachment'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
        filePath: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname
    });
});

// Send Message Route with Attachments
app.post('/send-message', upload.single('attachment'), async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
    }
    
    const sender_id = req.session.user_id;
    const { receiver_username, message } = req.body;
    const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;
    const attachmentName = req.file ? req.file.originalname : null;

    try {
        const [receiver] = await db.execute(
            `SELECT user_id FROM users WHERE username = ?`, 
            [receiver_username]
        );
        
        if (receiver.length === 0) {
            return res.status(404).json({ error: 'Receiver not found' });
        }
        
        const receiver_id = receiver[0].user_id;
        await db.execute(
            `INSERT INTO messages (sender_id, receiver_id, message, sent_at, is_read, attachments, attachment_name) 
             VALUES (?, ?, ?, NOW(), 0, ?, ?)`,
            [sender_id, receiver_id, message, attachmentPath, attachmentName]
        );
        
        res.json({ 
            message: 'Message sent successfully',
            attachment: attachmentPath 
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Message sending failed' });
    }
});

// Get Messages Route
app.get('/get-messages', async (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const [messages] = await db.execute(`
            SELECT m.*, u.username as sender_name, u.image as sender_image 
            FROM messages m
            JOIN users u ON m.sender_id = u.user_id
            WHERE m.receiver_id = ?
            ORDER BY m.sent_at DESC
            LIMIT 50
        `, [req.session.user_id]);
        
        res.json({ messages });
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
    
    if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        const [users] = await db.execute(
            `SELECT user_id FROM users WHERE email = ?`,
            [email]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        
        const [result] = await db.execute(
            `UPDATE users SET password = ? WHERE email = ?`,
            [confirmPassword, email]
        );
        
        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to update password' });
        }
        
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ 
            error: 'Failed to reset password',
            details: err.message 
        });
    }
});
// Feedback submission route
app.post('/submit-feedback', async (req, res) => {
    const { feedback } = req.body;
    
    if (!feedback || !feedback.trim()) {
        return res.status(400).json({ error: 'Feedback cannot be empty' });
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO feedback (feedback) VALUES (?)`,
            [feedback.trim()]
        );
        
        if (result.affectedRows === 1) {
            res.json({ message: 'Thank you for your feedback!' });
        } else {
            res.status(500).json({ error: 'Failed to submit feedback' });
        }
    } catch (err) {
        console.error('Feedback submission error:', err);
        res.status(500).json({ 
            error: 'Failed to submit feedback',
            details: err.message 
        });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0' ,  () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});