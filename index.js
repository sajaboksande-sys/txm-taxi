import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- الحل الجذري: الاتصال عبر رابط الـ URI مباشرة ---
// تأكد من إضافة DATABASE_URL في متغيرات البيئة بـ Render
// القيمة ستكون: mysql://avnadmin:كلمة-المرور@mysql-28d492e5-sajaboksande-bbbb.a.aivencloud.com:21439/defaultdb?ssl-mode=REQUIRED

const dbConfig = process.env.DATABASE_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

const pool = mysql.createPool(dbConfig);

// دالة تنفيذ الاستعلامات
async function executeQuery(sql, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (err) {
        console.error("Database Error:", err);
        throw err;
    } finally {
        if (connection) connection.release();
    }
}

// --- المسارات (Routes) ---

app.get('/', (req, res) => {
    res.send('🚀 السيرفر يعمل بنجاح!');
});

app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
        res.json(results || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// (بقية المسارات كما هي في كودك السابق...)

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
