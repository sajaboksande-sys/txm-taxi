import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ خطأ: DATABASE_URL غير معرف في إعدادات Render!");
}

const pool = mysql.createPool(databaseUrl);

// --- إنشاء الجداول تلقائياً لضمان عدم ضياع البيانات ---
async function initDatabase() {
    try {
        // 1. جدول الوجهات
        await pool.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_name VARCHAR(100),
                location_type VARCHAR(50),
                price DECIMAL(10,2)
            )`);
        
        // 2. جدول السائقين
        await pool.query(`
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                driver_name VARCHAR(100),
                phone VARCHAR(20) UNIQUE,
                car_type VARCHAR(50),
                plate_number VARCHAR(20),
                password VARCHAR(50)
            )`);

        // 3. جدول الرحلات
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                passenger_name VARCHAR(100),
                phone VARCHAR(20),
                pickup_point VARCHAR(100),
                driver_name VARCHAR(100),
                status ENUM('pending', 'accepted', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        
        console.log("✅ جميع جداول قاعدة البيانات جاهزة!");
    } catch (err) {
        console.error("❌ فشل تهيئة قاعدة البيانات:", err.message);
    }
}
initDatabase();

// --- المسارات (Routes) ---

app.get('/', (req, res) => res.send('🚀 السيرفر يعمل وقاعدة البيانات متصلة!'));

// 1. جلب الوجهات
app.get('/api/locations', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM locations");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. إضافة وجهة جديدة
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        await pool.query("INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)", [name, type, price]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. جلب السائقين
app.get('/api/drivers', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM drivers");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. تسجيل سائق جديد
app.post('/api/drivers', async (req, res) => {
    try {
        const { name, phone, car, plate, pass } = req.body;
        await pool.query("INSERT INTO drivers (driver_name, phone, car_type, plate_number, password) VALUES (?, ?, ?, ?, ?)", 
        [name, phone, car, plate, pass]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. إرسال طلب رحلة (مهم جداً للراكب)
app.post('/api/trips', async (req, res) => {
    try {
        const { name, phone, loc, driver } = req.body;
        await pool.query("INSERT INTO trips (passenger_name, phone, pickup_point, driver_name) VALUES (?, ?, ?, ?)", 
        [name, phone, loc, driver]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. جلب الرحلات (مهم جداً للسائق)
app.get('/api/trips', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM trips ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server on port ${PORT}`));
