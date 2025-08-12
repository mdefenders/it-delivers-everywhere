// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

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
module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}