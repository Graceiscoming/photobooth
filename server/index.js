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

// เปลี่ยน รหัสตรงนี้ๆ
//ex.http://localhost:3001/?token=password
const ADMIN_TOKEN = 'y2k_admin_secret_2026';

// Path definitions
const galleryPath = path.join(__dirname, 'gallery');
const logPath = path.join(__dirname, 'access.log');
const distPath = path.join(__dirname, '../dist');
const fakeGalleryPath = path.join(__dirname, 'fake_gallery');

// Ensure necessary folders and files exist
if (!fs.existsSync(galleryPath)) {
  fs.mkdirSync(galleryPath, { recursive: true });
}
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, '', 'utf8');
}
if (!fs.existsSync(fakeGalleryPath)) {
  fs.mkdirSync(fakeGalleryPath, { recursive: true });
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

// Enable CORS and parsing
app.use(cors());
app.use(express.json());

// Auth Middleware: Check for Admin Token in headers or query params
function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1] || req.query.token;
  req.isAdmin = (token === ADMIN_TOKEN);
  next();
}

// Express Logging middleware
app.use((req, res, next) => {
  // Prevent logging static asset requests to reduce log noise
  if (!req.url.startsWith('/assets/') && !req.url.startsWith('/fake_gallery/')) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    logActivity('INFO', `${req.method} request for ${req.url} from IP: ${clientIp}`);
  }
  next();
});

// API: Start Session & Create Dynamic Folder
app.post('/api/session/start', (req, res) => {
  const { groupName } = req.body;
  if (!groupName) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  // Sanitize groupName to prevent directory traversal attacks (A-Z, a-z, 0-9, and underscores only)
  const cleanName = groupName.replace(/[^a-zA-Z0-9_]/g, '_');
  const timestamp = Date.now();
  const folderName = `${cleanName}_${timestamp}`;
  const sessionFolder = path.join(galleryPath, folderName);

  try {
    fs.mkdirSync(sessionFolder, { recursive: true });
    logActivity('INFO', `Dynamic folder created for group "${cleanName}": ${folderName}`);
    res.json({
      success: true,
      folderName: folderName
    });
  } catch (error) {
    logActivity('ERROR', `Failed to create dynamic folder: ${error.message}`);
    res.status(500).json({ error: 'Failed to initialize session directory' });
  }
});

// API: Health status check (Restricted data for guest vs admin)
app.get('/api/health', checkAdminAuth, (req, res) => {
  if (req.isAdmin) {
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
  } else {
    // Strip diagnostics for guest users to enhance security
    res.json({
      status: 'ok',
      message: 'Y2K Photobooth Backend is running',
      timestamp: new Date().toISOString()
    });
  }
});

// Serve Fake Gallery statically
app.use('/fake_gallery', express.static(fakeGalleryPath));

// Honeypot: Block public access to actual gallery, redirect unauthorized traffic to fake gallery
app.use('/gallery', checkAdminAuth, (req, res, next) => {
  if (req.isAdmin) {
    // Allow admins to view/download photos
    express.static(galleryPath)(req, res, next);
  } else {
    // Unauthorized access: Log a RED WARNING with the intruder IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    logActivity('⚠️ SECURITY WARN', `Unauthorized access attempt to gallery files: ${req.originalUrl} from IP: ${clientIp}`);

    // Redirect to the Honeypot Decoy Page
    res.redirect('/fake_gallery');
  }
});

// Serve built React static files
app.use(express.static(distPath));

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
