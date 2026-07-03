import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import crypto from 'crypto';

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

// Enable CORS and parsing (large body limit for base64 image uploads)
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// API: Upload image file (PNG strip or GIF) to session folder
// Accepts base64 encoded file data — no external multer dependency needed
app.post('/api/upload', (req, res) => {
  const { folderName, fileName, fileData, mimeType } = req.body;

  if (!folderName || !fileName || !fileData) {
    return res.status(400).json({ error: 'folderName, fileName and fileData are required' });
  }

  // Security: prevent directory traversal
  const cleanFolder = folderName.replace(/[^a-zA-Z0-9_]/g, '_');
  const cleanFile = fileName.replace(/[^a-zA-Z0-9_.]/g, '_');
  const sessionFolder = path.join(galleryPath, cleanFolder);
  const filePath = path.join(sessionFolder, cleanFile);

  // Ensure session folder exists (auto-create if offline mode skipped session/start)
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  try {
    // Strip base64 data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    logActivity('INFO', `File uploaded: ${cleanFolder}/${cleanFile} (${(buffer.length / 1024).toFixed(1)} KB) from IP: ${clientIp}`);

    res.json({ success: true, path: `${cleanFolder}/${cleanFile}` });
  } catch (error) {
    logActivity('ERROR', `Upload failed for ${cleanFolder}/${cleanFile}: ${error.message}`);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// API: List files in a session folder (public — anyone with folderName can access)
app.get('/api/gallery/:folder', (req, res) => {
  const cleanFolder = req.params.folder.replace(/[^a-zA-Z0-9_]/g, '_');
  const sessionFolder = path.join(galleryPath, cleanFolder);

  if (!fs.existsSync(sessionFolder)) {
    return res.status(404).json({ error: 'Session folder not found' });
  }

  try {
    const files = fs.readdirSync(sessionFolder)
      .filter(f => f.endsWith('.png') || f.endsWith('.gif') || f.endsWith('.jpg'))
      .map(f => {
        const stats = fs.statSync(path.join(sessionFolder, f));
        return {
          fileName: f,
          url: `/api/gallery/${cleanFolder}/file/${f}`,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type: f.endsWith('.gif') ? 'gif' : 'image'
        };
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ folderName: cleanFolder, files });
  } catch (error) {
    logActivity('ERROR', `Gallery listing failed for ${cleanFolder}: ${error.message}`);
    res.status(500).json({ error: 'Failed to list gallery files' });
  }
});

// API: Serve individual gallery file (public)
app.get('/api/gallery/:folder/file/:file', (req, res) => {
  const cleanFolder = req.params.folder.replace(/[^a-zA-Z0-9_]/g, '_');
  const cleanFile = req.params.file.replace(/[^a-zA-Z0-9_.]/g, '_');
  const filePath = path.join(galleryPath, cleanFolder, cleanFile);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// API: List all sessions (Admin only)
app.get('/api/sessions', checkAdminAuth, (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const sessions = fs.readdirSync(galleryPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const sessionPath = path.join(galleryPath, d.name);
        const files = fs.readdirSync(sessionPath)
          .filter(f => f.endsWith('.png') || f.endsWith('.gif') || f.endsWith('.jpg'));
        const stats = fs.statSync(sessionPath);
        return {
          folderName: d.name,
          fileCount: files.length,
          createdAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ sessions });
  } catch (error) {
    logActivity('ERROR', `Sessions listing failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to list sessions' });
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

// AI Engine Checker
let isAiAvailable = false;
function checkAiAvailability() {
  try {
    const stdout = execSync('python3 -c "import cv2, numpy; print(\'OK\')"').toString().trim();
    if (stdout === 'OK') {
      isAiAvailable = true;
      logActivity('SYSTEM', 'Python AI Image Processing Engine (OpenCV/NumPy) is ONLINE');
    }
  } catch (err) {
    isAiAvailable = false;
    logActivity('SYSTEM', 'Python AI Image Processing Engine is OFFLINE (falling back to client-side JS)');
  }
}

// AI status endpoint
app.get('/api/ai/status', (req, res) => {
  res.json({ available: isAiAvailable });
});

// Image processing endpoint (executes Python color transfer)
app.post('/api/process-image', (req, res) => {
  const { image, filter } = req.body;
  if (!image || !filter) {
    return res.status(400).json({ error: 'image and filter are required' });
  }

  if (!isAiAvailable) {
    return res.status(503).json({ error: 'AI processing engine is not online' });
  }

  const base64Data = image.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  const randId = crypto.randomBytes(8).toString('hex');
  const tempIn = path.join(__dirname, `temp_in_${randId}.png`);
  const tempOut = path.join(__dirname, `temp_out_${randId}.png`);

  try {
    // Write input image
    fs.writeFileSync(tempIn, buffer);

    // Call python script
    const scriptPath = path.join(__dirname, 'color_transfer.py');
    const command = `python3 "${scriptPath}" "${tempIn}" "${filter}" "${tempOut}"`;

    exec(command, (error, stdout, stderr) => {
      const cleanFiles = () => {
        try {
          if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
          if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
        } catch (e) {
          console.error('Failed to clean temp files:', e);
        }
      };

      if (error) {
        cleanFiles();
        logActivity('ERROR', `Python script failed: ${stderr || error.message}`);
        return res.status(500).json({ error: 'AI Image Processing failed: ' + error.message });
      }

      try {
        if (!fs.existsSync(tempOut)) {
          cleanFiles();
          return res.status(500).json({ error: 'Output file was not generated by AI' });
        }
        
        const outBuffer = fs.readFileSync(tempOut);
        const outBase64 = `data:image/png;base64,${outBuffer.toString('base64')}`;
        cleanFiles();
        res.json({ success: true, image: outBase64 });
      } catch (err) {
        cleanFiles();
        res.status(500).json({ error: 'Failed to read AI output image' });
      }
    });
  } catch (err) {
    if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
    res.status(500).json({ error: 'Server preprocessing error: ' + err.message });
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
  checkAiAvailability();
});
