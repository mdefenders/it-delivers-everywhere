// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const axios = require('axios');

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
app.get('/', async (req, res) => {
  if (SERVICE_TYPE !== 'backend') {
    // Get client IP, prefer x-forwarded-for if present, otherwise remoteAddress
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // If x-forwarded-for is a list, take the first IP
    if (clientIp && typeof clientIp === 'string' && clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }
    // Log x-forwarded-for header for debugging
    console.log('x-forwarded-for:', req.headers['x-forwarded-for']);

    // Use Kubernetes provided env vars for service DNS and port
    const serviceName = process.env.SERVICE_NAME;
    // Kubernetes exposes services via <SERVICE_NAME>_SERVICE_HOST and <SERVICE_NAME>_SERVICE_PORT
    const envHostVar = `${serviceName}_SERVICE_HOST`;
    const envPortVar = `${serviceName}_SERVICE_PORT`;
    const backendHost = process.env[envHostVar];
    const backendPort = process.env[envPortVar];
    const backendUrl = `http://${backendHost}:${backendPort}/ip`;
    let postError = null;
    try {
      await axios.post(backendUrl, { ip: clientIp });
    } catch (err) {
      postError = err.message;
      console.error('Error posting IP to backend:', err);
    }
    let ipLog = [];
    let getError = null;
    try {
      const response = await axios.get(backendUrl);
      ipLog = response.data.data || [];
    } catch (err) {
      getError = err.message;
      console.error('Error fetching IP log from backend:', err);
    }
    let tableRows = ipLog.map(row => `<tr><td>${row.id}</td><td>${row.ip}</td><td>${row.timestamp}</td><td>${row.branch || ''}</td></tr>`).join('');
    let errorMsg = '';
    if (postError) errorMsg += `<div style='color:red'>Error posting IP: ${postError}</div>`;
    if (getError) errorMsg += `<div style='color:red'>Error fetching log: ${getError}</div>`;
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IP Log Table</title>
        <style>
          body { background: #f7f7f7; font-family: Arial, sans-serif; }
          .container { max-width: 800px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #ccc; padding: 32px; }
          h1 { color: #2193b0; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #2193b0; color: #fff; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>IP Log Table</h1>
          ${errorMsg}
          <table>
            <thead><tr><th>ID</th><th>IP</th><th>Timestamp</th><th>Branch</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    return;
  }
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
      const limit = parseInt(process.env.LIMIT, 10) || 20;
      db.query(`SELECT * FROM ip_log ORDER BY id DESC LIMIT ?`, [limit], (err, results) => {
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