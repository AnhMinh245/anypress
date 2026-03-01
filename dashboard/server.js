require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');

const syncRoutes = require('./routes/api-sync');
const contentRoutes = require('./routes/api-content');
const deployRoutes = require('./routes/api-deploy');
const previewRoutes = require('./routes/api-preview');
const ciRoutes = require('./routes/api-ci');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/sync', syncRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/ci', ciRoutes);

// Settings API
app.get('/api/settings', (req, res) => {
    res.json({
        anytypeApiUrl: process.env.ANYTYPE_API_URL || 'http://localhost:31012',
        anytypeSpaceId: process.env.ANYTYPE_SPACE_ID || '',
        githubRepo: process.env.GITHUB_REPO || 'AnhMinh245/anypress',
        githubToken: process.env.GITHUB_TOKEN ? '••••••' : '',
        configured: !!(process.env.ANYTYPE_API_KEY && process.env.GITHUB_TOKEN)
    });
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║  🚀 Anypress Dashboard               ║`);
    console.log(`  ║  http://localhost:${PORT}               ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
});
