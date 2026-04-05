import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();

// إعدادات الـ CORS للسماح لـ GitHub Pages بالاتصال
app.use(cors());
app.use(express.json());

// الاتصال باستخدام DATABASE_URL (الرابط الكامل من Aiven)
// هذا الرابط يحل مشكلة الـ offset والتشفير تلقائياً
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ خطأ: DATABASE_URL غير معرف في إعدادات Render!");
}

const pool = mysql.createPool(databaseUrl);

// دالة تنفيذ الاستعلامات مع معالجة الأخطاء
async function executeQuery(sql, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (err) {
        console.error("🔴 خطأ في قاعدة البيانات:", err.message);
        throw err;
    } finally {
        if (connection) connection.release(); // إغلاق الاتصال بعد التنفيذ
    }
}

// --- المسارات (Routes) ---

// 1. اختبار السيرفر
app.get('/', (req, res) => {
    res.send('🚀 السيرفر متصل وقاعدة البيانات جاهزة للعمل!');
});

// 2. جلب الوجهات
app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
        res.json(results || []);
    } catch (err) {
        res.status(500).json({ error: "فشل جلب الوجهات: " + err.message });
    }
});

// 3. إضافة وجهة جديدة
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        const sql = "INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)";
        await executeQuery(sql, [name, type, price]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "فشل إضافة الوجهة: " + err.message });
    }
});

// 4. إضافة سائق جديد
app.post('/api/drivers', async (req, res) => {
    try {
        const { name, phone, car, plate, pass } = req.body;
        const sql = "INSERT INTO drivers (driver_name, phone, car_type, plate_number, password) VALUES (?, ?, ?, ?, ?)";
        await executeQuery(sql, [name, phone, car, plate, pass]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "فشل تسجيل السائق: " + err.message });
    }
});

// 5. جلب السائقين (لاختيارهم في صفحة الطلب)
app.get('/api/drivers', async (req, res) => {
    try {
        const results = await executeQuery("SELECT driver_name, car_type FROM drivers");
        res.json(results || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تشغيل السيرفر على البورت المناسب لـ Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل الآن على البورت ${PORT}`);
});
