const mariadb = require('mariadb');

const pool = mariadb.createPool({
     //Host: localhost, port: 3306
     user:'TarokyAdmin',
     database: 'machtarok',
     password: PASSWORD,
     connectionLimit: 15
});