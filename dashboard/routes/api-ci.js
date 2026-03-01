const express = require('express');
const router = express.Router();
const githubClient = require('../services/github-client');

// GET /api/ci — Get recent CI/CD workflow runs
router.get('/', async (req, res) => {
    try {
        const result = await githubClient.getWorkflowRuns(5);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
