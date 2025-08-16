// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'frontend';
app.use(express.json());

let versionInfo = {};
try {
  const versionPath = path.join(__dirname, 'version.json');
  versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
} catch (err) {
  console.warn("Could not read version file", err);
}
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: versionInfo.version || 'unknown',
    commit: versionInfo.commit || 'unknown'
  });
});
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>It Delivers Everywhere Demo Project</title>
      <style>
        body {
          background: linear-gradient(135deg, #6dd5ed, #2193b0);
          color: #fff;
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 60px auto;
          background: rgba(0,0,0,0.5);
          border-radius: 16px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          padding: 40px;
          text-align: center;
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 0.5em;
        }
        p {
          font-size: 1.2em;
        }
        .badge {
          display: inline-block;
          background: #fff;
          color: #2193b0;
          padding: 0.4em 1em;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 1em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>It Delivers Everywhere</h1>
        <p>Welcome to the <strong>Demo Project</strong> for <em>It Delivers Everywhere</em>!</p>
        <p>This is a sample Express.js application designed to showcase modern deployment and delivery techniques.</p>
        <span class="badge">Demo Project</span>
      </div>
    </body>
    </html>
  `);
});

// MySQL connection setup (only if backend)
let db;
function getMysqlPassword() {
  const filePath = process.env.MYSQL_PASSWORD_FILE;
  if (!filePath) return process.env.MYSQL_PASS;
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (err) {
    console.error('Could not read MySQL password file:', filePath, err);
    return process.env.MYSQL_PASS;
  }
}
if (SERVICE_TYPE === 'backend') {
  // Ensure database and table exist
  const dbName = process.env.MYSQL_DB || 'demo';
  const branchCol = 'branch VARCHAR(128)';
  const createDbSql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`;
  const createTableSql = `CREATE TABLE IF NOT EXISTS ip_log (id INT AUTO_INCREMENT PRIMARY KEY, ip VARCHAR(45) NOT NULL, timestamp DATETIME NOT NULL, ${branchCol})`;

  // Create DB if not exists
  const adminConn = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER || 'admin',
    password: getMysqlPassword(),
    multipleStatements: true
  });
  adminConn.query(createDbSql, (err) => {
    if (err) console.error('Error creating database:', err);
    // Now connect to DB and create table
    db = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER || 'admin',
      password: getMysqlPassword(),
      database: dbName,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
    db.query(createTableSql, (err) => {
      if (err) console.error('Error creating ip_log table:', err);
    });
    adminConn.end();
  });
}

app.get('/ip', async (req, res) => {
  if (SERVICE_TYPE === 'backend') {
    try {
      db.query('SELECT * FROM ip_log ORDER BY id DESC', (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'DB error', details: err.message });
        }
        res.json({ data: results });
      });
    } catch (e) {
      return res.status(500).json({ error: 'Unexpected error', details: e.message });
    }
  } else {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.json({ ip });
  }
});

if (SERVICE_TYPE === 'backend') {
  app.post('/ip', (req, res) => {
    const ip = req.body.ip;
    if (!ip) {
      return res.status(400).json({ error: 'Missing ip in request body' });
    }
    const timestamp = new Date();
    const branch = process.env.SERVICE_BRANCH || '';
    db.query(
      'INSERT INTO ip_log (ip, timestamp, branch) VALUES (?, ?, ?)',
      [ip, timestamp, branch],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'DB error', details: err.message });
        }
        res.json({ status: 'ok', ip, timestamp, branch });
      }
    );
  });
}

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}