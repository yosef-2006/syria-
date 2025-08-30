const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));

// تكوين multer للرفع
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.params.type;
    const dir = `downloads/${type}`;
    
    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const type = req.params.type;
    
    if (type === 'android' && !file.originalname.toLowerCase().endsWith('.apk')) {
      return cb(new Error('Only APK files are allowed for Android'));
    }
    
    if (type === 'windows' && !file.originalname.toLowerCase().endsWith('.exe')) {
      return cb(new Error('Only EXE files are allowed for Windows'));
    }
    
    cb(null, true);
  }
});

// API endpoint لمسح الملفات
app.get('/api/files', (req, res) => {
    const folderPath = req.query.path;
    const fullPath = path.join(__dirname, 'downloads', folderPath);
    
    // التأكد من وجود المسار
    if (!fs.existsSync(fullPath)) {
        return res.json([]);
    }
    
    try {
        const files = fs.readdirSync(fullPath);
        const fileDetails = files.map(file => {
            const filePath = path.join(fullPath, file);
            const stats = fs.statSync(filePath);
            
            return {
                name: file,
                size: stats.size,
                lastModified: Math.floor(stats.mtimeMs / 1000)
            };
        }).filter(file => {
            // تصفية الملفات حسب النوع
            if (folderPath === 'android') {
                return file.name.toLowerCase().endsWith('.apk');
            } else if (folderPath === 'windows') {
                return file.name.toLowerCase().endsWith('.exe');
            }
            return true;
        });
        
        res.json(fileDetails);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({ error: 'Unable to read directory' });
    }
});

// API endpoint لرفع الملفات
app.post('/api/upload/:type', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      file: req.file 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Route لأي طلب غير معرّف
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});
