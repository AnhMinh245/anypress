/**
 * Anytype Local API Client
 * Connects to Anytype desktop app's Local API (localhost:31012)
 * to fetch objects tagged for publishing and export as Markdown.
 */

const API_URL = process.env.ANYTYPE_API_URL || 'http://localhost:31012';
const API_KEY = process.env.ANYTYPE_API_KEY || '';
const SPACE_ID = process.env.ANYTYPE_SPACE_ID || '';
const API_VERSION = '2025-11-08';

function headers() {
    return {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Anytype-Version': API_VERSION
    };
}

/**
 * Check if Anytype API is reachable
 */
async function checkConnection() {
    try {
        const res = await fetch(`${API_URL}/spaces`, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { connected: true, spaces: data.spaces || data.data || [] };
    } catch (err) {
        return { connected: false, error: err.message };
    }
}

/**
 * List all objects in the space, optionally filtered by tag
 */
async function listObjects(tag = 'publish') {
    try {
        const url = `${API_URL}/spaces/${SPACE_ID}/objects`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();

        let objects = data.objects || data.data || [];

        // Filter by tag if specified
        if (tag) {
            objects = objects.filter(obj => {
                const tags = obj.tags || obj.tag || [];
                const snippet = JSON.stringify(obj).toLowerCase();
                return snippet.includes(tag.toLowerCase());
            });
        }

        return { success: true, objects };
    } catch (err) {
        return { success: false, error: err.message, objects: [] };
    }
}

/**
 * Export a single object as Markdown
 */
async function exportMarkdown(objectId) {
    try {
        const url = `${API_URL}/spaces/${SPACE_ID}/objects/${objectId}/markdown`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const text = await res.text();
        return { success: true, markdown: text };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Get object details
 */
async function getObject(objectId) {
    try {
        const url = `${API_URL}/spaces/${SPACE_ID}/objects/${objectId}`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        return { error: err.message };
    }
}

module.exports = {
    checkConnection,
    listObjects,
    exportMarkdown,
    getObject
};
