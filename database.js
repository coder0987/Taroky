const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
     //Host: localhost, port: 3306,
     user:'TarokyAdmin',
     database: 'machtarok',
     password: process.env.PASSWORD,
     connectionLimit: 15
});

class Database {
    static async getUsers() {
        let conn,
            infoFromDatabase;
        try {
            conn = await pool.getConnection();
            infoFromDatabase = await conn.query("SELECT * FROM users");
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
        return infoFromDatabase;//array of objects [{username, elo, admin, settings}, {username...}...]
    }

    static async getUser(username) {
        username = username.toLowerCase();
        let conn,
            infoFromDatabase;
        try {
            conn = await pool.getConnection();
            infoFromDatabase = await conn.query("SELECT * FROM users WHERE username = ?", username);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
        return infoFromDatabase[0];//one object {username,elo,admin,settings}
    }

    static async createUser(username, elo, admin, settings) {
        username = username.toLowerCase();
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

    static async createOrRetrieveUser(username) {
        username = username.toLowerCase();
        let conn,
            info;
        try {
            conn = await pool.getConnection();
            let usernameCheck = await conn.query("SELECT * FROM users WHERE username = ?", username);

            if (usernameCheck.length > 0) {
                info = await Database.getUser(username);
            } else {
                await conn.query("INSERT INTO users (username) VALUES (?)", [username]);
                info = {username: username, elo: 300, admin: false, settings: null};
            }
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
        return info;
    }

    static promiseCreateOrRetrieveUser(username) {
        return Promise.resolve(Database.createOrRetrieveUser(username));
    }

    static async updateUser(username, column, data) {
        username = username.toLowerCase();
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query("UPDATE users SET ? = ? WHERE username=?", [column, data, username]);
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
    }
}

module.exports = Database;