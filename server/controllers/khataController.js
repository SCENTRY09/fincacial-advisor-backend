const Khata = require('../models/Khata');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const uploadsDir = process.env.NODE_ENV === 'production'
    ? '/tmp/khata-proofs'
    : path.join(os.tmpdir(), 'khata-proofs');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
    }
});

exports.uploadMiddleware = upload.single('proof');

// Get all parties for the logged-in user
exports.getParties = async (req, res) => {
    try {
        const parties = await Khata.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.json(parties);
    } catch (err) {
        console.error('getParties error:', err.message);
        res.status(500).json({ message: 'Failed to fetch parties' });
    }
};

// Create a new party for the logged-in user
exports.createParty = async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const party = await Khata.create({ userId: req.user._id, name, phone });
        res.status(201).json(party);
    } catch (err) {
        console.error('createParty error:', err.message);
        res.status(500).json({ message: 'Failed to create party' });
    }
};

// Update party — only if it belongs to the logged-in user
exports.updateParty = async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const party = await Khata.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { name, phone },
            { new: true, runValidators: true }
        );
        if (!party) return res.status(404).json({ message: 'Party not found' });
        res.json(party);
    } catch (err) {
        console.error('updateParty error:', err.message);
        res.status(500).json({ message: 'Failed to update party' });
    }
};

// Delete a party — only if it belongs to the logged-in user
exports.deleteParty = async (req, res) => {
    try {
        const party = await Khata.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!party) return res.status(404).json({ message: 'Party not found' });
        res.json({ message: 'Party deleted' });
    } catch (err) {
        console.error('deleteParty error:', err.message);
        res.status(500).json({ message: 'Failed to delete party' });
    }
};

// Get single party — only if it belongs to the logged-in user
exports.getParty = async (req, res) => {
    try {
        const party = await Khata.findOne({ _id: req.params.id, userId: req.user._id });
        if (!party) return res.status(404).json({ message: 'Party not found' });
        res.json(party);
    } catch (err) {
        console.error('getParty error:', err.message);
        res.status(500).json({ message: 'Failed to fetch party' });
    }
};

// Add entry (gave/got) to a party — only if it belongs to the logged-in user
exports.addEntry = async (req, res) => {
    try {
        const { type, amount, note, date } = req.body;
        if (!['gave', 'got'].includes(type)) return res.status(400).json({ message: 'Type must be gave or got' });
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

        const party = await Khata.findOne({ _id: req.params.id, userId: req.user._id });
        if (!party) return res.status(404).json({ message: 'Party not found' });

        const proofUrl = req.file ? `khata-proofs/${req.file.filename}` : undefined;
        party.entries.push({ type, amount: Number(amount), note, date: date || new Date(), proofUrl });
        await party.save();
        res.status(201).json(party);
    } catch (err) {
        console.error('addEntry error:', err.message);
        res.status(500).json({ message: 'Failed to add entry' });
    }
};

// Delete an entry — only if the parent party belongs to the logged-in user
exports.deleteEntry = async (req, res) => {
    try {
        const party = await Khata.findOne({ _id: req.params.id, userId: req.user._id });
        if (!party) return res.status(404).json({ message: 'Party not found' });

        party.entries = party.entries.filter(e => e._id.toString() !== req.params.entryId);
        await party.save();
        res.json(party);
    } catch (err) {
        console.error('deleteEntry error:', err.message);
        res.status(500).json({ message: 'Failed to delete entry' });
    }
};
