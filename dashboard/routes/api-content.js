const express = require('express');
const router = express.Router();
const gitManager = require('../services/git-manager');
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.resolve(__dirname, '..', '..', 'content');

// GET /api/content — List all content files with git status
router.get('/', async (req, res) => {
    try {
        const allFiles = await gitManager.listAllContent();
        const changes = await gitManager.getContentStatus();

        // Merge status info into file list
        const files = allFiles.map(file => {
            const change = changes.find(c => c.path === file.path);
            return {
                ...file,
                status: change ? change.status : 'unmodified',
                hasChanges: !!change
            };
        });

        // Add new files that aren't yet tracked
        for (const change of changes) {
            if (change.status === 'new' && !files.find(f => f.path === change.path)) {
                files.push({
                    path: change.path,
                    name: change.name,
                    status: 'new',
                    hasChanges: true,
                    size: 0,
                    modified: new Date()
                });
            }
        }

        // Add deleted files
        for (const change of changes) {
            if (change.status === 'deleted') {
                files.push({
                    path: change.path,
                    name: change.name,
                    status: 'deleted',
                    hasChanges: true
                });
            }
        }

        res.json({
            success: true,
            files,
            totalChanged: changes.length,
            total: files.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/content/:filename — Read a single markdown file
router.get('/:filename', (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, `${req.params.filename}.md`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ success: true, content, filename: req.params.filename });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/content/new — Create a new markdown file
router.post('/new', (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'Title required' });

        const slug = title
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const filePath = path.join(CONTENT_DIR, `${slug}.md`);
        const mdContent = content || `---\ntitle: "${title}"\ndate: ${new Date().toISOString().split('T')[0]}\ndraft: false\n---\n\n# ${title}\n\n`;

        fs.writeFileSync(filePath, mdContent, 'utf-8');
        res.json({ success: true, path: `content/${slug}.md`, slug });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
