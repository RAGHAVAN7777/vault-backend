require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/User');
const File = require('./models/File');
const Note = require('./models/Note');
const sendEmail = require('./utils/sendEmail');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('MongoDB error:', err));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// SaaS Storage Limits
const STORAGE_LIMITS = {
    normal: 5 * 1024 * 1024,   // 5 MB
    power: 25 * 1024 * 1024,  // 25 MB
    premium: Infinity
};

const EXPIRY_TIMES = {
    normal: 12 * 60 * 60 * 1000,  // 12 Hours
    power: 36 * 60 * 60 * 1000,   // 36 Hours
    premium: Infinity               // No Expiry
};

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Memory Store for OTP (email -> { otp, expiresAt })
let otpStore = {};

// Helper: Generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Route: POST /api/send-otp
app.post('/api/send-otp', async (req, res) => {
    const { email, role } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStore[email] = { otp, expiresAt };

        let targetEmail = email;
        if (role === 'premium') {
            const premiumExists = await User.findOne({ role: 'premium' });
            if (!premiumExists) {
                targetEmail = process.env.ADMIN_EMAIL || process.env.MASTER_ADMIN_EMAIL;
            }
        }

        await sendEmail(targetEmail, 'Vault - Verification OTP', `Your OTP is: ${otp}. Valid for 5 minutes.`);
        res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending OTP' });
    }
});

// Route: POST /api/verify-otp
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore[email];
    if (record && record.otp === otp && Date.now() < record.expiresAt) {
        res.json({ success: true, message: 'OTP verified' });
    } else {
        res.status(400).json({ message: 'Invalid or expired OTP' });
    }
});

// Route: POST /api/send-master-otp
app.post('/api/send-master-otp', async (req, res) => {
    try {
        const masterEmail = "sraghavan4747@gmail.com";
        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStore['MASTER_APPROVAL'] = { otp, expiresAt };

        await sendEmail(masterEmail, 'Vault - MASTER_AUTHORIZATION_REQUIRED',
            `CRITICAL: An Admin registration attempt is in progress. \n\nMASTER_AUTHORIZATION_TOKEN: ${otp} \n\nValid for 5 minutes.`);

        res.json({ success: true, message: 'MASTER_TOKEN_TRANSMITTED' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending master OTP' });
    }
});

// Route: POST /api/verify-master-otp
app.post('/api/verify-master-otp', async (req, res) => {
    const { otp } = req.body;
    const record = otpStore['MASTER_APPROVAL'];
    if (record && record.otp === otp && Date.now() < record.expiresAt) {
        // Mark master verification as cleared for this process
        res.json({ success: true, message: 'MASTER_APPROVAL_GRANTED' });
    } else {
        res.status(400).json({ message: 'Invalid or expired master token' });
    }
});

// Route: POST /api/register
app.post('/api/register', async (req, res) => {
    const { userId, email, role, mpin, otp, masterOtp } = req.body;
    try {
        // 1. Verify User OTP
        const record = otpStore[email];
        if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
            return res.status(400).json({ message: 'User OTP invalid or expired' });
        }

        // 2. Dual-Layer Check for Admin
        if (role === 'admin') {
            const masterRecord = otpStore['MASTER_APPROVAL'];
            if (!masterRecord || masterRecord.otp !== masterOtp || Date.now() > masterRecord.expiresAt) {
                return res.status(403).json({ message: 'MASTER_AUTHORIZATION_MISSING_OR_INVALID' });
            }
        }

        const existingUserId = await User.findOne({ userId });
        if (existingUserId) return res.status(400).json({ message: 'User ID taken' });

        const mpinHash = await bcrypt.hash(mpin, 10);
        const newUser = new User({ userId, email, role, mpinHash, isVerified: true });
        await newUser.save();

        delete otpStore[email];
        if (role === 'premium') delete otpStore['MASTER_APPROVAL'];

        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Route: POST /api/login
app.post('/api/login', async (req, res) => {
    const { userId, mpin } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (user && await bcrypt.compare(mpin, user.mpinHash)) {
            res.json({ success: true, user: { userId: user.userId, role: user.role } });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Login error' });
    }
});

// Route: POST /api/recover/send-otp
app.post('/api/recover/send-otp', async (req, res) => {
    const { userId, email } = req.body;
    try {
        const user = await User.findOne({ userId, email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = generateOTP();
        user.recoveryOtp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000;
        await user.save();

        await sendEmail(user.email, 'Vault - Recovery OTP', `Your recovery OTP is: ${otp}. Valid for 5 minutes.`);
        res.json({ success: true, message: 'Recovery OTP sent' });
    } catch (error) {
        res.status(500).json({ message: 'Recovery error' });
    }
});

// Route: POST /api/recover/verify-otp
app.post('/api/recover/verify-otp', async (req, res) => {
    const { userId, otp } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (user && user.recoveryOtp === otp && Date.now() < user.otpExpires) {
            res.json({ success: true, message: 'OTP verified' });
        } else {
            res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Verification error' });
    }
});

// Route: POST /api/recover/reset-mpin
app.post('/api/recover/reset-mpin', async (req, res) => {
    const { userId, mpin, otp } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (user && user.recoveryOtp === otp && Date.now() < user.otpExpires) {
            user.mpinHash = await bcrypt.hash(mpin, 10);
            user.recoveryOtp = null;
            user.otpExpires = null;
            await user.save();
            res.json({ success: true, message: 'MPIN reset successful' });
        } else {
            res.status(400).json({ message: 'Unauthorized reset' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Reset error' });
    }
});

// Route: POST /api/upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) {
            console.log("UPLOAD_ERROR: No file provided");
            return res.status(400).json({ message: "No file uploaded" });
        }

        // 1. Quota Check
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        const limit = STORAGE_LIMITS[user.role] || STORAGE_LIMITS.normal;
        if (user.storageUsed + req.file.size > limit) {
            return res.status(403).json({
                success: false,
                message: "Your allowed storage is full. Upgrade required."
            });
        }

        console.log("INCOMING_UPLOAD:", req.file.originalname, "|", req.file.mimetype, "|", Math.round(req.file.size / 1024), "KB");

        const streamUpload = () => {
            return new Promise((resolve, reject) => {
                const mimetype = req.file.mimetype;
                let resource_type = "raw";

                if (mimetype.startsWith("image/")) {
                    resource_type = "image";
                } else if (mimetype.startsWith("video/")) {
                    resource_type = "video";
                }

                const options = {
                    folder: "vault_files",
                    resource_type: resource_type,
                    type: "upload",
                    access_mode: "public",
                    upload_preset: "vault_unsigned",
                    overwrite: true,
                    invalidate: true,
                    content_disposition: `attachment; filename="${req.file.originalname}"`
                };

                // Clean filename logic: No double extensions
                const timestamp = Date.now();
                const extension = path.extname(req.file.originalname).toLowerCase();
                const baseName = req.file.originalname
                    .toLowerCase()
                    .replace(extension, "")
                    .replace(/[^a-z0-9]/g, '_')
                    .substring(0, 50);

                // Preserve extension in public_id for best browser behavior
                options.public_id = `${baseName}_${timestamp}${extension}`;

                console.log("UNIVERSAL_UPLOAD_PROTOCOL:", {
                    mimetype,
                    resource_type,
                    public_id: options.public_id
                });

                const stream = cloudinary.uploader.upload_stream(
                    options,
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(req.file.buffer);
            });
        };

        const result = await streamUpload();

        // 2. Atomic Storage Update
        user.storageUsed += req.file.size;
        await user.save();

        // 3. Expiry Calculation
        const expiryDuration = EXPIRY_TIMES[user.role] || EXPIRY_TIMES.normal;
        const expiresAt = expiryDuration === Infinity ? null : new Date(Date.now() + expiryDuration);

        const newFile = await File.create({
            userId: userId,
            fileName: req.file.originalname,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            fileSize: req.file.size,
            expiresAt: expiresAt
        });

        res.json({
            success: true,
            message: "Upload successful",
            file: newFile
        });

    } catch (err) {
        console.error("DETAILED_UPLOAD_ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: err.message || "Unknown error"
        });
    }
});

// Route: DELETE /api/delete/:publicId
app.delete('/api/delete/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;

        // Find file metadata
        const file = await File.findOne({ publicId });
        const resource_type = file ? file.resourceType : "image";

        // Attempt Cloudinary deletion
        try {
            await cloudinary.uploader.destroy(publicId, { resource_type });
        } catch (cErr) {
            console.warn("Cloudinary delete ignored (likely already gone):", cErr);
        }

        // Always delete from DB to stay in sync
        await File.deleteOne({ publicId });

        // Decrement Storage Quota
        if (file && file.fileSize) {
            await User.findOneAndUpdate(
                { userId: file.userId },
                { $inc: { storageUsed: -file.fileSize } }
            );
        }

        res.json({ success: true, message: "File metadata purged" });
    } catch (err) {
        console.error("Critical delete error:", err);
        res.status(500).json({ message: "Delete operation failed" });
    }
});

// Route: GET /api/files/:userId
app.get('/api/files/:userId', async (req, res) => {
    try {
        const files = await File.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching files" });
    }
});

// Route: GET /api/user/:userId
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            success: true,
            storageUsed: user.storageUsed,
            role: user.role,
            limit: STORAGE_LIMITS[user.role]
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching user data" });
    }
});

// --- NOTEBOOK ROUTES ---

// Route: GET /api/notes/:userId
app.get('/api/notes/:userId', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.params.userId }).sort({ updatedAt: -1 });
        res.json({ success: true, notes });
    } catch (err) {
        res.status(500).json({ message: "Error fetching notebooks" });
    }
});

// Route: POST /api/notes
app.post('/api/notes', async (req, res) => {
    try {
        const { userId, title } = req.body;
        const newNote = await Note.create({ userId, title, content: "" });
        res.json({ success: true, note: newNote });
    } catch (err) {
        res.status(500).json({ message: "Error creating notebook" });
    }
});

// Route: PUT /api/notes/:noteId
app.put('/api/notes/:noteId', async (req, res) => {
    try {
        const { content } = req.body;
        const note = await Note.findByIdAndUpdate(
            req.params.noteId,
            { content, updatedAt: Date.now() },
            { new: true }
        );
        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ message: "Error saving notebook" });
    }
});

// Route: DELETE /api/notes/:noteId
app.delete('/api/notes/:noteId', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.noteId);
        res.json({ success: true, message: "Notebook purged" });
    } catch (err) {
        res.status(500).json({ message: "Error purging notebook" });
    }
});

// Background Job: Cleanup Expired Files
async function cleanupExpiredFiles() {
    try {
        const now = new Date();
        const expiredFiles = await File.find({ expiresAt: { $ne: null, $lt: now } });

        if (expiredFiles.length === 0) return;

        console.log(`[CLEANUP] Found ${expiredFiles.length} expired files. Purging...`);

        for (const file of expiredFiles) {
            try {
                // Delete from Cloudinary
                await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType });

                // Recover Quota
                await User.findOneAndUpdate(
                    { userId: file.userId },
                    { $inc: { storageUsed: -file.fileSize } }
                );

                // Delete from DB
                await File.deleteOne({ _id: file._id });
                console.log(`[CLEANUP] Purged: ${file.fileName}`);
            } catch (err) {
                console.error(`[CLEANUP] Failed to purge ${file.fileName}:`, err);
            }
        }
    } catch (err) {
        console.error("[CLEANUP] Fatal error in worker:", err);
    }
}

// Route: POST /api/purge-all/:userId
app.post('/api/purge-all/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        const files = await File.find({ userId });

        // Parallel Cloudinary Wipe
        const deletePromises = files.map(f =>
            cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType })
        );
        await Promise.all(deletePromises);

        // Database Wipe
        await File.deleteMany({ userId });
        await Note.deleteMany({ userId });

        // Reset storage
        user.storageUsed = 0;
        await user.save();

        res.json({ success: true, message: "NUCLEAR_SWEEP_COMPLETE" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Purge failed" });
    }
});

// Route: POST /api/request-purge-account-otp/:userId
app.post('/api/request-purge-account-otp/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.recoveryOtp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000;
        await user.save();

        await sendEmail(user.email, 'Vault - ACCOUNT_DESTRUCTION_VERIFICATION',
            `CRITICAL: You have requested the total destruction of your Vault entity. \n\nYOUR_DESTRUCTION_TOKEN: ${otp} \n\nThis token is valid for 5 minutes. If this wasn't you, secure your account immediately.`);

        res.json({ success: true, message: 'DESTRUCTION_TOKEN_TRANSMITTED' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending destruction token' });
    }
});

// Route: POST /api/purge-account/:userId
app.post('/api/purge-account/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { otp } = req.body;
        const user = await User.findOne({ userId });

        if (!user || user.recoveryOtp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ message: 'Invalid or expired destruction token' });
        }

        // 1. Nuclear Sweep first
        const files = await File.find({ userId });
        const deletePromises = files.map(f =>
            cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType })
        );
        await Promise.all(deletePromises);
        await File.deleteMany({ userId });
        await Note.deleteMany({ userId });

        // 2. Terminate Entity
        await User.deleteOne({ userId });

        res.json({ success: true, message: "ENTITY_DELETED_PERMANENTLY" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Account destruction failed" });
    }
});

// Check for expired files every 5 minutes
setInterval(cleanupExpiredFiles, 5 * 60 * 1000);

// --- ADMIN DASHBOARD ENDPOINTS ---

// GET /api/admin/stats - Global system stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const normalUsers = await User.countDocuments({ role: 'normal' });
        const powerUsers = await User.countDocuments({ role: 'power' });
        const premiumUsers = await User.countDocuments({ role: 'premium' });

        const totalStorageResult = await User.aggregate([
            { $group: { _id: null, totalUsed: { $sum: "$storageUsed" } } }
        ]);
        const totalUsed = totalStorageResult.length > 0 ? totalStorageResult[0].totalUsed : 0;
        const totalLimit = 10 * 1024 * 1024 * 1024; // 10 GB

        res.json({
            success: true,
            stats: {
                totalUsers,
                roles: {
                    normal: normalUsers,
                    power: powerUsers,
                    premium: premiumUsers
                },
                storage: {
                    used: totalUsed,
                    limit: totalLimit,
                    free: totalLimit - totalUsed
                }
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching admin stats" });
    }
});

// GET /api/admin/users - List all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, 'userId email role storageUsed createdAt').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ message: "Error fetching users list" });
    }
});

// POST /api/admin/purge-user-content/:userId - Wipe user content
app.post('/api/admin/purge-user-content/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        const files = await File.find({ userId });
        const deletePromises = files.map(f =>
            cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType })
        );
        await Promise.all(deletePromises);

        await File.deleteMany({ userId });
        await Note.deleteMany({ userId });

        user.storageUsed = 0;
        await user.save();

        res.json({ success: true, message: `All content for ${userId} purged` });
    } catch (err) {
        res.status(500).json({ message: "Purge failed" });
    }
});

// POST /api/admin/delete-user/:userId - Remove entity
app.post('/api/admin/delete-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        // 1. Wipe files first
        const files = await File.find({ userId });
        const deletePromises = files.map(f =>
            cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType })
        );
        await Promise.all(deletePromises);

        await File.deleteMany({ userId });
        await Note.deleteMany({ userId });

        // 2. Delete user
        await User.deleteOne({ userId });

        res.json({ success: true, message: `Entity ${userId} terminated` });
    } catch (err) {
        res.status(500).json({ message: "User deletion failed" });
    }
});

// POST /api/admin-login-pattern - Secure backend pattern verification
app.post('/api/admin-login-pattern', (req, res) => {
    const { pattern } = req.body;
    const serverPattern = process.env.ADMIN_PATTERN;

    if (!serverPattern) {
        console.error("CRITICAL_ERROR: ADMIN_PATTERN is not set in environment variables.");
        return res.status(500).json({ success: false, message: 'SERVER_CONFIG_ERROR' });
    }

    if (pattern === serverPattern) {
        res.json({ success: true, message: 'ADMIN_ACCESS_GRANTED' });
    } else {
        res.status(401).json({ success: false, message: 'INVALID_PATTERN_SEQUENCE' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Vault Server running on port ${PORT}`));
