# How To Set Up the Database

1. Create the database and user
```
mariadb -p -u root
CREATE DATABASE machtarok;
USE machtarok;
CREATE TABLE users (
id MEDIUMINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
username TEXT NOT NULL,
elo SMALLINT NOT NULL DEFAULT 300,
admin BOOLEAN NOT NULL DEFAULT 0,
settings TEXT,
avatar SMALLINT DEFAULT 0,
deck TEXT DEFAULT "mach-deck-thumb",
chat BOOLEAN NOT NULL DEFAULT 1);
CREATE USER 'TarokyAdmin'@'localhost' IDENTIFIED BY 'p@sSw0rD';
```
Note: REPLACE THE PASSWORD. Do not use p@sSw0rD.
2. Remove excess permissions
```
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'TarokyAdmin'@'localhost';
GRANT SELECT ON users TO 'TarokyAdmin'@'localhost';
GRANT INSERT ON users TO 'TarokyAdmin'@'localhost';
GRANT UPDATE ON users TO 'TarokyAdmin'@'localhost';
exit;
```

3. Finally, store the password in a .env file

Create a file named .env
In the file, write:
```
PASSWORD=p@sSw0rD
```
