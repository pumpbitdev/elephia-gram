
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

        // ... (código de tablas users y payment_methods) ...
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

        // --- TABLA DE TRANSACCIONES ACTUALIZADA ---
        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_telegram_id BIGINT NOT NULL,
                transaction_type ENUM('Comprar', 'Vender') NOT NULL,
                amount_usd DECIMAL(10, 2) NOT NULL,
                commission_usd DECIMAL(10, 2) NOT NULL,
                total_usd DECIMAL(10, 2) NOT NULL,
                rate_bs DECIMAL(10, 2) NOT NULL,
                total_bs DECIMAL(10, 2) NOT NULL,
                payment_reference VARCHAR(255), -- Columna para la referencia
                status ENUM('Pendiente', 'Completada', 'Fallida') DEFAULT 'Pendiente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
            )
        `);
        console.log('`transactions` table is ready.');
        
        connection.release();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// ... (resto de funciones) ...
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

export async function findUserById(userId) {
    const query = 'SELECT telegram_id FROM users WHERE telegram_id = ? LIMIT 1;';
    try {
        const [rows] = await pool.query(query, [userId]);
        return rows.length > 0;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return false;
    }
}

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

// --- FUNCIÓN DE TRANSACCIÓN ACTUALIZADA ---
export async function createTransaction(transactionData) {
    const {
        user_telegram_id,
        transaction_type,
        amount_usd,
        commission_usd,
        total_usd,
        rate_bs,
        total_bs,
        payment_reference // Nuevo campo
    } = transactionData;

    const query = `
        INSERT INTO transactions 
        (user_telegram_id, transaction_type, amount_usd, commission_usd, total_usd, rate_bs, total_bs, payment_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    try {
        await pool.query(query, [user_telegram_id, transaction_type, amount_usd, commission_usd, total_usd, rate_bs, total_bs, payment_reference]);
        console.log(`New transaction recorded for user ${user_telegram_id} with reference ${payment_reference}`);
    } catch (error)
 {
        console.error('Error creating transaction:', error);
    }
}
