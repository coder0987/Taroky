const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
     //Host: localhost, port: 3306,
     user:'TarokyAdmin',
     database: 'machtarok',
     password: process.env.password,
     connectionLimit: 15
});

class Database {
    static async getUsers() {
        let conn;
        try {
            conn = await pool.getConnection();
            infoFromDatabase = await conn.query("SELECT ALL FROM users");
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
        return infoFromDatabase;//array of objects [{username, elo, admin, settings}, {username...}...]
    }

    static async getUser(username) {
        let conn;
        try {
            conn = await pool.getConnection();
            infoFromDatabase = await conn.query("SELECT ALL FROM users WHERE username = ?", username);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
        return infoFromDatabase[0];//one object {username,elo,admin,settings}
    }

    static async createUser(username, elo, admin, settings) {
        let conn;
        try {
            conn = await pool.getConnection();
            let usernameCheck = await conn.query("SELECT id FROM users WHERE username = ?", username);
            if (usernameCheck.length > 0) {
                throw "User already exists";
            }
            await conn.query("INSERT INTO users (username, elo, admin, settings) VALUES (?, ?, ?, ?)", [username, elo, admin, settings]);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
    }

    static async updateUser(username, column, data) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query("UPDATE users SET ? = ? WHERE id=?", [column, data, username]);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
    }
}

module.exports = Database;