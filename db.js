
import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database.');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                telegram_id BIGINT PRIMARY KEY,
                username VARCHAR(255),
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('`users` table is ready.');
        
        // ... (código de la tabla payment_methods) ...
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_telegram_id BIGINT NOT NULL,
                method_type VARCHAR(50) NOT NULL,
                details VARCHAR(255) NOT NULL,
                nickname VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
            )
        `);
        console.log('`payment_methods` table is ready.');

        connection.release();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

export async function addUser(userData) {
    const { telegram_id, username, first_name, last_name, email, phone } = userData;
    const query = `
        INSERT INTO users (telegram_id, username, first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        username = VALUES(username), first_name = VALUES(first_name), last_name = VALUES(last_name), email = VALUES(email), phone = VALUES(phone);
    `;
    try {
        await pool.query(query, [telegram_id, username, first_name, last_name, email, phone]);
    } catch (error) {
        console.error('Error adding/updating user:', error);
    }
}

// --- NUEVA FUNCIÓN ---
// Verifica si un usuario existe en la base de datos
export async function findUserById(userId) {
    const query = 'SELECT telegram_id FROM users WHERE telegram_id = ? LIMIT 1;';
    try {
        const [rows] = await pool.query(query, [userId]);
        return rows.length > 0; // Devuelve true si el usuario existe, false si no
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return false; // Asumimos que no existe si hay un error
    }
}


// ... (resto de funciones como getPaymentMethodsForUser, etc.) ...
export async function getPaymentMethodsForUser(userId) {
    const query = 'SELECT id, method_type, details, nickname FROM payment_methods WHERE user_telegram_id = ?;';
    try {
        const [rows] = await pool.query(query, [userId]);
        return rows;
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return [];
    }
}

export async function addPaymentMethod(userId, methodType, details, nickname) {
    const query = 'INSERT INTO payment_methods (user_telegram_id, method_type, details, nickname) VALUES (?, ?, ?, ?);';
    try {
        await pool.query(query, [userId, methodType, details, nickname]);
        console.log(`New payment method added for user ${userId}`);
    } catch (error) {
        console.error('Error adding payment method:', error);
    }
}

export async function getAllUserIds() {
    const query = 'SELECT telegram_id FROM users;';
    try {
        const [rows] = await pool.query(query);
        return rows.map(row => row.telegram_id);
    } catch (error) {
        console.error('Error fetching user IDs:', error);
        return [];
    }
}
