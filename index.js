import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

// --- الإعدادات الأساسية (مهمة جداً لاستقبال البيانات) ---
app.use(cors());
app.use(express.json()); // هذا السطر هو المسؤول عن قراءة البيانات القادمة من المتصفح

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- إعدادات الاتصال بـ Aiven Cloud ---
const dbConfig = {
    host: 'mysql-28d492e5-sajaboksande-bbbb.a.aivencloud.com', // تأكد من الرابط الصحيح
    user: 'avnadmin', 
    password: 'YOUR_PASSWORD_HERE', // ضع كلمتك السرية هنا
    database: 'defaultdb',
    port: 24734,
    ssl: { rejectUnauthorized: false }
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

// --- 1. مسار إضافة سائق جديد (من لوحة المدير) ---
app.post('/api/drivers', async (req, res) => {
    try {
        const { name, phone, car, plate, pass } = req.body;
        
        // التحقق من وصول البيانات
        if (!name || !phone || !pass) {
            return res.status(400).json({ error: "البيانات غير مكتملة" });
        }

        const sql = `INSERT INTO drivers (driver_name, phone, car_type, plate_number, password, status) 
                     VALUES (?, ?, ?, ?, ?, 'نشط')`;
        
        await executeQuery(sql, [name, phone, car, plate, pass]);
        res.json({ success: true, message: "تم حفظ السائق بنجاح" });
    } catch (err) {
        console.error("خطأ في حفظ السائق:", err);
        res.status(500).json({ error: "فشل في حفظ البيانات في القاعدة" });
    }
});

// --- 2. مسار جلب السائقين النشطين (للمتصفح) ---
app.get('/api/drivers/active', async (req, res) => {
    try {
        const results = await executeQuery("SELECT id, driver_name, car_type FROM drivers WHERE status = 'نشط'");
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

// --- 4. مسار إضافة وجهة جديدة (المدير) ---
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        const sql = "INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)";
        await executeQuery(sql, [name, type, price]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جلب الوجهات
app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
