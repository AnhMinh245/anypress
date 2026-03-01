/**
 * Git Manager
 * Handles selective git add, commit, and push operations.
 */

const simpleGit = require('simple-git');
const path = require('path');

const REPO_PATH = path.resolve(__dirname, '..', '..');
const git = simpleGit(REPO_PATH);

/**
 * Get status of all files in content/ directory
 * Returns list with file path, status (new/modified/deleted/unmodified)
 */
async function getContentStatus() {
    const status = await git.status();
    const contentFiles = [];

    // Track all changed files in content/
    const allChanges = [
        ...status.not_added.map(f => ({ file: f, status: 'new' })),
        ...status.modified.map(f => ({ file: f, status: 'modified' })),
        ...status.deleted.map(f => ({ file: f, status: 'deleted' })),
        ...status.created.map(f => ({ file: f, status: 'new' })),
        ...status.renamed.map(f => ({ file: f.to, status: 'renamed' }))
    ];

    for (const change of allChanges) {
        if (change.file.startsWith('content/') || change.file.startsWith('content\\')) {
            contentFiles.push({
                path: change.file,
                name: path.basename(change.file, '.md'),
                status: change.status
            });
        }
    }

    return contentFiles;
}

/**
 * List all markdown files in content/
 */
async function listAllContent() {
    const fs = require('fs');
    const contentDir = path.join(REPO_PATH, 'content');
    const files = [];

    function walk(dir, prefix = '') {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                walk(path.join(dir, entry.name), relPath);
            } else if (entry.name.endsWith('.md')) {
                const stat = fs.statSync(path.join(dir, entry.name));
                files.push({
                    path: `content/${relPath}`,
                    name: entry.name.replace('.md', ''),
                    size: stat.size,
                    modified: stat.mtime
                });
            }
        }
    }

    walk(contentDir);
    return files;
}

/**
 * Selective git add + commit + push
 * @param {string[]} files - Array of file paths to stage (relative to repo root)
 * @param {string} message - Commit message
 */
async function selectiveDeploy(files, message) {
    if (!files || files.length === 0) {
        throw new Error('No files selected for deployment');
    }

    // Stage selected files
    await git.add(files);

    // Commit
    const commitMsg = message || `Publish ${files.length} article(s) — ${new Date().toISOString().split('T')[0]}`;
    const commitResult = await git.commit(commitMsg);

    // Push
    const pushResult = await git.push('origin', 'main');

    return {
        commit: commitResult.commit || 'no changes',
        summary: commitResult.summary,
        pushed: true,
        filesDeployed: files.length
    };
}

/**
 * Get recent commits
 */
async function getRecentCommits(count = 5) {
    const log = await git.log({ maxCount: count });
    return log.all.map(c => ({
        hash: c.hash.substring(0, 7),
        message: c.message,
        date: c.date,
        author: c.author_name
    }));
}

module.exports = {
    getContentStatus,
    listAllContent,
    selectiveDeploy,
    getRecentCommits
};
