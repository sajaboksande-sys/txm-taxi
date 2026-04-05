import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
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

// --- المسارات (Routes) ---

// 1. اختبار السيرفر
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

// 3. إضافة وجهة
app.post('/api/locations', async (req, res) => {
    try {
        const { name, type, price } = req.body;
        await executeQuery("INSERT INTO locations (location_name, location_type, price) VALUES (?, ?, ?)", [name, type, price]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. إضافة سائق
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
