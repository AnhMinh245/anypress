/**
 * GitHub API Client
 * Fetches CI/CD workflow run status from GitHub Actions.
 */

const GITHUB_REPO = process.env.GITHUB_REPO || 'AnhMinh245/anypress';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const API_BASE = 'https://api.github.com';

function headers() {
    const h = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'anypress-dashboard'
    };
    if (GITHUB_TOKEN) {
        h['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    return h;
}

/**
 * Get recent workflow runs
 */
async function getWorkflowRuns(count = 5) {
    try {
        const url = `${API_BASE}/repos/${GITHUB_REPO}/actions/runs?per_page=${count}`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) {
            if (res.status === 404) return { success: true, runs: [], message: 'Repo not found or no workflows yet' };
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        const runs = (data.workflow_runs || []).map(run => ({
            id: run.id,
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            url: run.html_url,
            branch: run.head_branch,
            commitMessage: run.head_commit?.message || ''
        }));

        return { success: true, runs };
    } catch (err) {
        return { success: false, error: err.message, runs: [] };
    }
}

/**
 * Get status icon for a workflow run
 */
function getStatusIcon(status, conclusion) {
    if (status === 'completed') {
        if (conclusion === 'success') return '✅';
        if (conclusion === 'failure') return '❌';
        if (conclusion === 'cancelled') return '⚪';
        return '⚠️';
    }
    if (status === 'in_progress' || status === 'queued') return '🔄';
    return '⏳';
}

module.exports = {
    getWorkflowRuns,
    getStatusIcon
};
