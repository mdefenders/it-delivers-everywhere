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
module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}