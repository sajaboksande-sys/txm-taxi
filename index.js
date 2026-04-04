import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- إعدادات الاتصال الآمنة ---
const dbConfig = {
    host: 'mysql-28d492e5-sajaboksande-bbbb.a.aivencloud.com',
    port: 21435,
    user: 'avnadmin',
    password: process.env.DB_PASSWORD, 
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
};

const executeQuery = async (sql, params) => {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [results] = await conn.execute(sql, params);
        return results;
    } catch (error) {
        console.error("خطأ تقني:", error);
        throw error;
    } finally {
        if (conn) await conn.end();
    }
};

// وظيفة إنشاء الجداول وتحديثها
const initDatabase = async () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS drivers (id INT AUTO_INCREMENT PRIMARY KEY, driver_name VARCHAR(100), phone VARCHAR(20), car_type VARCHAR(50), plate_number VARCHAR(20), password VARCHAR(50), status VARCHAR(20) DEFAULT 'غير نشط')`,
        `CREATE TABLE IF NOT EXISTS locations (id INT AUTO_INCREMENT PRIMARY KEY, location_name VARCHAR(100), location_type VARCHAR(50), price DECIMAL(10,2))`,
        `CREATE TABLE IF NOT EXISTS trips (id INT AUTO_INCREMENT PRIMARY KEY, passenger_name VARCHAR(100), passenger_phone VARCHAR(20), destination VARCHAR(100), driver_name VARCHAR(100), price DECIMAL(10,2), arrival_time INT, rating INT DEFAULT 0, status VARCHAR(20) DEFAULT 'Pending')`
    ];
    for (let sql of queries) { await executeQuery(sql); }
    console.log("✅ رادار مسلاتة جاهز للعمل!");
};

initDatabase().catch(err => console.error("فشل في تهيئة القاعدة:", err));

// --- مسارات الـ API للواجهة الأمامية ---

// 1. عرض الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// 2. تسجيل سائق جديد
app.post('/api/drivers', async (req, res) => {
    const { name, phone, car, plate, pass } = req.body;
    await executeQuery('INSERT INTO drivers (driver_name, phone, car_type, plate_number, password, status) VALUES (?,?,?,?,?,"غير نشط")', [name, phone, car, plate, pass]);
    res.json({ success: true });
});

// 3. إضافة وجهة جديدة (إدارة الأسعار)
app.post('/api/locations', async (req, res) => {
    const { name, type, price } = req.body;
    await executeQuery('INSERT INTO locations (location_name, location_type, price) VALUES (?,?,?)', [name, type, price]);
    res.json({ success: true });
});

// 4. تسجيل دخول السائق
app.post('/api/driver/login', async (req, res) => {
    const { phone, pass } = req.body;
    const rows = await executeQuery('SELECT * FROM drivers WHERE phone = ? AND password = ?', [phone, pass]);
    if (rows.length > 0) {
        await executeQuery('UPDATE drivers SET status = "نشط" WHERE id = ?', [rows[0].id]);
        res.json({ success: true, driver: rows[0] });
    } else res.status(401).json({ message: "خطأ في البيانات" });
});

// 5. جلب أفضل 5 سائقين للمدير
app.get('/api/admin/top-drivers', async (req, res) => {
    const sql = `
        SELECT d.driver_name, d.car_type, AVG(t.rating) as avg_stars 
        FROM trips t
        JOIN drivers d ON t.driver_name = d.driver_name
        WHERE t.rating > 0 
        GROUP BY d.driver_name, d.car_type
        ORDER BY avg_stars DESC 
        LIMIT 5`;
    const results = await executeQuery(sql);
    res.json(results);
});

// 6. جلب السائقين النشطين للركاب
app.get('/api/drivers/active', async (req, res) => {
    res.json(await executeQuery('SELECT driver_name, car_type, plate_number FROM drivers WHERE status = "نشط"'));
});

// 7. جلب المواقع
app.get('/api/locations', async (req, res) => res.json(await executeQuery('SELECT * FROM locations')));

// 8. إنشاء رحلة جديدة
app.post('/api/trips', async (req, res) => {
    const { passenger_name, passenger_phone, destination, driver_name, price } = req.body;
    const result = await executeQuery('INSERT INTO trips (passenger_name, passenger_phone, destination, driver_name, price, status) VALUES (?,?,?,?,?,"Pending")', [passenger_name, passenger_phone, destination, driver_name, price]);
    res.json({ success: true, tripId: result.insertId });
});

// 9. قبول الرحلة من السائق
app.patch('/api/trips/:id/accept', async (req, res) => {
    await executeQuery('UPDATE trips SET status = "Accepted", arrival_time = ? WHERE id = ?', [req.body.arrival_time, req.params.id]);
    res.json({ success: true });
});

// 10. تقييم الرحلة
app.patch('/api/trips/:id/rate', async (req, res) => {
    await executeQuery('UPDATE trips SET rating = ?, status = "Completed" WHERE id = ?', [req.body.rating, req.params.id]);
    res.json({ success: true });
});

// --- التشغيل النهائي ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 TX&M Server running on port ${PORT}`));
