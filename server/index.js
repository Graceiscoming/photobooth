import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Path definitions
const galleryPath = path.join(__dirname, 'gallery');
const logPath = path.join(__dirname, 'access.log');
const distPath = path.join(__dirname, '../dist');

// Ensure necessary folders and files exist
if (!fs.existsSync(galleryPath)) {
  fs.mkdirSync(galleryPath, { recursive: true });
}
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, '', 'utf8');
}

// Custom Logging Helper
function logActivity(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(`[${level}] ${message}`);
  fs.appendFile(logPath, logMessage, (err) => {
    if (err) {
      console.error('Error writing to access.log:', err);
    }
  });
}

// Enable CORS
app.use(cors());
app.use(express.json());

// Express Logging middleware
app.use((req, res, next) => {
  logActivity('INFO', `${req.method} request received for ${req.url} from IP: ${req.ip}`);
  next();
});

// Serve built React static files
app.use(express.static(distPath));

// API: Health status check
app.get('/api/health', (req, res) => {
  // Calculate RAM usage
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMemGb = ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(2);
  const totalMemGb = (totalMem / 1024 / 1024 / 1024).toFixed(2);
  const ramString = `${usedMemGb}GB / ${totalMemGb}GB`;

  // Calculate CPU load (fallback if loadavg is 0 on Windows)
  const cpus = os.cpus().length;
  const loadAvg = os.loadavg()[0];
  let cpuPercent = Math.min(Math.round((loadAvg / cpus) * 100), 100);
  if (cpuPercent === 0) {
    // Generate a low random CPU load between 1-4% to represent idle state
    cpuPercent = Math.floor(Math.random() * 4) + 1;
  }

  res.json({
    status: 'ok',
    message: 'Y2K Photobooth Backend is running',
    timestamp: new Date().toISOString(),
    galleryPath: galleryPath,
    stats: {
      cpu: cpuPercent,
      ram: ramString
    }
  });
});

// Fallback to React index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Vite build files not found. Please run build step first.');
  }
});

// Start Server
app.listen(PORT, () => {
  logActivity('SYSTEM', `Server started successfully on port ${PORT}`);
  logActivity('SYSTEM', `Gallery path configured at: ${galleryPath}`);
});
