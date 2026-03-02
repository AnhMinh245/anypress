const express = require('express');
const router = express.Router();
const anytypeClient = require('../services/anytype-client');
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.resolve(__dirname, '..', '..', 'content');

// POST /api/sync — Sync content from Anytype
router.post('/', async (req, res) => {
    try {
        // Check connection
        const conn = await anytypeClient.checkConnection();
        if (!conn.connected) {
            return res.json({
                success: false,
                error: `Cannot connect to Anytype: ${conn.error}. Make sure Anytype is running.`
            });
        }

        // List objects with 'publish' tag
        const tag = req.body.tag || 'publish';
        const result = await anytypeClient.listObjects(tag);
        if (!result.success) {
            return res.json({ success: false, error: result.error });
        }

        // Export each object as Markdown
        let synced = 0, failed = 0;
        const syncedFiles = [];

        for (const obj of result.objects) {
            try {
                const exported = await anytypeClient.exportMarkdown(obj.id);
                if (exported.success && exported.markdown) {
                    const slug = slugify(obj.name || obj.title || obj.id);

                    // Save to subfolder based on tag routing
                    const subfolder = exported.targetFolder || '';
                    const targetDir = subfolder
                        ? path.join(CONTENT_DIR, subfolder)
                        : CONTENT_DIR;

                    // Ensure target directory exists
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    const filePath = path.join(targetDir, `${slug}.md`);
                    fs.writeFileSync(filePath, exported.markdown, 'utf-8');

                    const relPath = subfolder
                        ? `content/${subfolder}/${slug}.md`
                        : `content/${slug}.md`;
                    syncedFiles.push({ name: slug, path: relPath, folder: subfolder });
                    synced++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }

        res.json({
            success: true,
            total: result.objects.length,
            synced,
            failed,
            files: syncedFiles
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/sync/status — Check Anytype connection
router.get('/status', async (req, res) => {
    const conn = await anytypeClient.checkConnection();
    res.json(conn);
});

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

module.exports = router;
