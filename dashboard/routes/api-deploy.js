const express = require('express');
const router = express.Router();
const gitManager = require('../services/git-manager');

// POST /api/deploy — Selective deploy (commit + push chosen files)
router.post('/', async (req, res) => {
    try {
        const { files, message } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please select files to deploy'
            });
        }

        const result = await gitManager.selectiveDeploy(files, message);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/deploy/history — Recent commits
router.get('/history', async (req, res) => {
    try {
        const commits = await gitManager.getRecentCommits(10);
        res.json({ success: true, commits });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
