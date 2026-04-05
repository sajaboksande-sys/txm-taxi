import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// إعدادات الاتصال بقاعدة البيانات
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { 
        rejectUnauthorized: false 
    },
    // الحل السحري: إجبار المكتبة على استخدام التشفير التقليدي المتوافق مع Node.js
    authPlugins: {
        mysql_native_password: () => () => Buffer.from(process.env.DB_PASSWORD)
    }
};

// استخدام Pool بدلاً من Connection مفرد لزيادة الاستقرار
const pool = mysql.createPool(dbConfig);

// دالة تنفيذ الاستعلامات
async function executeQuery(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (err) {
        console.error("Database Error:", err);
        throw err;
    }
}

// --- المسارات (Routes) ---

// 1. الصفحة الرئيسية لاختبار السيرفر
app.get('/', (req, res) => {
    res.send('🚀 السيرفر يعمل بنجاح! جرب الوصول إلى /api/locations');
});

// 2. جلب الوجهات
app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
        res.json(results || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. إضافة وجهة جديدة
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        // ملاحظة: تأكد أن أسماء الأعمدة في الجدول تطابق ما هنا (location_name, location_type, price)
        const sql = "INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)";
        await executeQuery(sql, [name, type, price]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
