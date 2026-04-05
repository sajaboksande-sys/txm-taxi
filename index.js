import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

// --- الإعدادات الأساسية ---
app.use(cors());
app.use(express.json()); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- إعدادات الاتصال بـ Aiven Cloud ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { 
        rejectUnauthorized: false 
    },
    // أضف هذا السطر لحل مشكلة الـ offset والـ SHA256
    authPlugins: {
        mysql_native_password: () => () => Buffer.from(process.env.DB_PASSWORD)
    },
    connectTimeout: 10000
};
// دالة تنفيذ الاستعلامات
async function executeQuery(sql, params = []) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } finally {
        await connection.end();
    }
}

// --- دالة إنشاء الجداول تلقائياً (مهمة جداً للتشغيل الأول) ---
async function initDB() {
    try {
        console.log("🔄 محاولة الاتصال بـ Aiven لتهيئة الجداول...");
        const connection = await mysql.createConnection(dbConfig);
        
        // جدول السائقين
        await connection.query(`
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                driver_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                car_type VARCHAR(100),
                plate_number VARCHAR(50),
                password VARCHAR(100) NOT NULL,
                status ENUM('نشط', 'غير نشط') DEFAULT 'نشط',
                avg_stars DECIMAL(2,1) DEFAULT 5.0
            )
        `);

        // جدول الوجهات
        await connection.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location_name VARCHAR(100) NOT NULL,
                location_type VARCHAR(50),
                price DECIMAL(10,2)
            )
        `);

        // جدول الرحلات
        await connection.query(`
            CREATE TABLE IF NOT EXISTS trips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                passenger_name VARCHAR(100),
                passenger_phone VARCHAR(20),
                destination VARCHAR(100),
                driver_name VARCHAR(100),
                price DECIMAL(10,2),
                status ENUM('Pending', 'Accepted', 'Completed') DEFAULT 'Pending',
                arrival_time VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✅ الجداول جاهزة والاتصال سليم!");
        await connection.end();
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة الجداول:", err.message);
    }
}

initDB();

// --- 1. مسار إضافة سائق جديد ---
app.post('/api/drivers', async (req, res) => {
    try {
        const { name, phone, car, plate, pass } = req.body;
        if (!name || !phone || !pass) {
            return res.status(400).json({ error: "البيانات غير مكتملة" });
        }
        const sql = "INSERT INTO drivers (driver_name, phone, car_type, plate_number, password) VALUES (?, ?, ?, ?, ?)";
        await executeQuery(sql, [name, phone, car, plate, pass]);
        res.json({ success: true, message: "تم حفظ السائق بنجاح" });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "فشل الحفظ: " + err.message });
    }
});

// --- 2. مسار جلب السائقين النشطين ---
app.get('/api/drivers/active', async (req, res) => {
    try {
        const results = await executeQuery("SELECT driver_name, car_type FROM drivers WHERE status = 'نشط'");
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 3. مسار تسجيل دخول السائق ---
app.post('/api/driver/login', async (req, res) => {
    try {
        const { phone, pass } = req.body;
        const results = await executeQuery("SELECT * FROM drivers WHERE phone = ? AND password = ?", [phone, pass]);
        if (results.length > 0) {
            res.json({ success: true, driver: results[0] });
        } else {
            res.status(401).json({ error: "بيانات الدخول خاطئة" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. مسار الوجهات ---
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        await executeQuery("INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)", [name, type, price]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. مسارات الرحلات (لإكمال عمل الموقع) ---
app.post('/api/trips', async (req, res) => {
    try {
        const { passenger_name, passenger_phone, destination, driver_name, price } = req.body;
        const result = await executeQuery(
            "INSERT INTO trips (passenger_name, passenger_phone, destination, driver_name, price) VALUES (?, ?, ?, ?, ?)",
            [passenger_name, passenger_phone, destination, driver_name, price]
        );
        res.json({ success: true, tripId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trips', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM trips ORDER BY created_at DESC");
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- تشغيل السيرفر ---
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('🚀 السيرفر يعمل بنجاح! الرابط المخصص للبيانات هو /api');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
