import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;
const pool = mysql.createPool(databaseUrl);

// دالة التأكد من الجداول
async function checkTables() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS locations (id INT AUTO_INCREMENT PRIMARY KEY, location_name VARCHAR(100), location_type VARCHAR(50), price DECIMAL(10,2))`);
        await pool.query(`CREATE TABLE IF NOT EXISTS drivers (id INT AUTO_INCREMENT PRIMARY KEY, driver_name VARCHAR(100), phone VARCHAR(20) UNIQUE, car_type VARCHAR(50), plate_number VARCHAR(20), password VARCHAR(50))`);
        await pool.query(`CREATE TABLE IF NOT EXISTS trips (id INT AUTO_INCREMENT PRIMARY KEY, passenger_name VARCHAR(100), phone VARCHAR(20), pickup_point VARCHAR(100), driver_name VARCHAR(100), status ENUM('pending', 'accepted', 'completed') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    } catch (err) { console.error("DB Init Error:", err.message); }
}

app.get('/', (req, res) => res.send('🚕 سيرفر تاكسي مسلاتة جاهز!'));

// جلب الوجهات
app.get('/api/locations', async (req, res) => {
    try {
        await checkTables();
        const [rows] = await pool.query("SELECT * FROM locations");
        res.json(Array.isArray(rows) ? rows : []);
    } catch (err) { res.status(500).json([]); }
});

// إضافة وجهة
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        await pool.query("INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)", [name, type, price]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// جلب السائقين
app.get('/api/drivers', async (req, res) => {
    try {
        await checkTables();
        const [rows] = await pool.query("SELECT * FROM drivers");
        res.json(Array.isArray(rows) ? rows : []);
    } catch (err) { res.status(500).json([]); }
});

// تسجيل سائق
app.post('/api/drivers', async (req, res) => {
    try {
        const { name, phone, car, plate, pass } = req.body;
        await pool.query("INSERT INTO drivers (driver_name, phone, car_type, plate_number, password) VALUES (?, ?, ?, ?, ?)", [name, phone, car, plate, pass]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// جلب الرحلات (تم إصلاحها لتعيد مصفوفة دائماً)
app.get('/api/trips', async (req, res) => {
    try {
        await checkTables();
        const [rows] = await pool.query("SELECT * FROM trips ORDER BY created_at DESC LIMIT 20");
        res.json(Array.isArray(rows) ? rows : []);
    } catch (err) { res.status(500).json([]); }
});

// إرسال رحلة
app.post('/api/trips', async (req, res) => {
    try {
        const { name, phone, loc, driver } = req.body;
        await pool.query("INSERT INTO trips (passenger_name, phone, pickup_point, driver_name) VALUES (?, ?, ?, ?)", [name, phone, loc, driver]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 يعمل على منفذ ${PORT}`));
