
import mysql from 'mysql2/promise';
import 'dotenv/config';

// Creamos un "pool" de conexiones. Es más eficiente que crear una conexión por cada consulta.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función para inicializar la base de datos y crear la tabla si no existe
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
        connection.release();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Función para añadir o actualizar un usuario
export async function addUser(userData) {
    const { telegram_id, username, first_name, last_name, email, phone } = userData;
    const query = `
        INSERT INTO users (telegram_id, username, first_name, last_name, email, phone)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        phone = VALUES(phone);
    `;
    try {
        await pool.query(query, [telegram_id, username, first_name, last_name, email, phone]);
        console.log(`User with telegram_id ${telegram_id} has been added or updated.`);
    } catch (error) {
        console.error('Error adding or updating user:', error);
    }
}

// Función para obtener todos los IDs de los usuarios
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
