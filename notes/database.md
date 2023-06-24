# How To Set Up the Database

```
mariadb -p -u root
CREATE DATABASE machtarok;
USE machtarok;
CREATE TABLE users (
id MEDIUMINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
username TEXT NOT NULL,
elo SMALLINT NOT NULL DEFAULT 300,
admin BOOLEAN NOT NULL DEFAULT 0,
settings TEXT);
CREATE USER 'TarokyAdmin'@'localhost' IDENTIFIED BY 'p@sSw0rD';
```
Note: REPLACE THE PASSWORD. Do not use p@sSw0rD.
```
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'TarokyAdmin'@'localhost';
GRANT SELECT ON users TO 'TarokyAdmin'@'localhost';
GRANT INSERT ON users TO 'TarokyAdmin'@'localhost';
exit;
```
