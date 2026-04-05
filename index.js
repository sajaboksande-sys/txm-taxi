import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال باستخدام الرابط المباشر DATABASE_URL
const pool = mysql.createPool(process.env.DATABASE_URL);

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

app.get('/', (req, res) => res.send('🚀 السيرفر متصل بنجاح عبر URI!'));

app.get('/api/locations', async (req, res) => {
    try {
        const results = await executeQuery("SELECT * FROM locations");
        res.json(results || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// أضف بقية المسارات (POST /api/locations و POST /api/drivers) هنا بنفس الطريقة

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
