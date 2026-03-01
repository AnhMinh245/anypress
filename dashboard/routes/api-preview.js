const express = require('express');
const router = express.Router();
const quartzBuilder = require('../services/quartz-builder');

// POST /api/preview — Start Quartz local preview
router.post('/', async (req, res) => {
    try {
        const result = await quartzBuilder.startPreview();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/preview — Stop preview
router.delete('/', (req, res) => {
    const result = quartzBuilder.stopPreview();
    res.json({ success: true, ...result });
});

// GET /api/preview — Get preview status
router.get('/', (req, res) => {
    const status = quartzBuilder.getPreviewStatus();
    res.json({ success: true, ...status });
});

module.exports = router;
