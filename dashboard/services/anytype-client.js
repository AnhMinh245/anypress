/**
 * Anytype Local API Client
 * Connects to Anytype desktop app's Local API (127.0.0.1:31009)
 * API docs: https://developers.anytype.io
 */

const API_URL = process.env.ANYTYPE_API_URL || 'http://127.0.0.1:31009';
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
        const res = await fetch(`${API_URL}/v1/spaces`, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { connected: true, spaces: data.data || [] };
    } catch (err) {
        return { connected: false, error: err.message };
    }
}

/**
 * List all objects in the space, filtered by tag name
 * Tags: properties[].key='tag' → multi_select[].name
 */
async function listObjects(tag = 'publish') {
    try {
        const url = `${API_URL}/v1/spaces/${SPACE_ID}/objects?limit=100`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();

        let objects = data.data || [];

        if (tag) {
            objects = objects.filter(obj => {
                const props = obj.properties || [];
                const tagProp = props.find(p => p.key === 'tag');
                if (!tagProp || !tagProp.multi_select) return false;
                return tagProp.multi_select.some(t =>
                    t.name && t.name.toLowerCase() === tag.toLowerCase()
                );
            });
        }

        return { success: true, objects, total: objects.length };
    } catch (err) {
        return { success: false, error: err.message, objects: [] };
    }
}

/**
 * Map Anytype tags to content subfolder
 * Priority: first matching tag wins
 */
function getTargetFolder(tags = []) {
    const tagNames = tags.map(t => (typeof t === 'string' ? t : t.name || '').toLowerCase());

    const mapping = [
        { folder: 'books', match: ['sach', 'book', 'books'] },
        { folder: 'insights', match: ['knowledge', 'kien-thuc', 'insights', 'insight'] },
        { folder: 'journal', match: ['daily', 'nhat-ky', 'journal', 'diary'] },
        { folder: 'tech', match: ['tech', 'technology', 'cong-nghe', 'lap-trinh', 'coding'] },
    ];

    for (const { folder, match } of mapping) {
        if (tagNames.some(t => match.includes(t))) return folder;
    }
    return 'other'; // no matching tag → Other category
}


/**
 * Get a single object's full details including markdown body
 * Response structure: { object: { id, name, markdown, snippet, ... } }
 */
async function getObject(objectId) {
    try {
        const url = `${API_URL}/v1/spaces/${SPACE_ID}/objects/${objectId}`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // API returns { object: { ... } }
        return data.object || data;
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Export a single object as Markdown with full content
 * Uses getObject which returns the 'markdown' field with complete body
 */
async function exportMarkdown(objectId, objectName) {
    try {
        const obj = await getObject(objectId);
        if (obj.error) throw new Error(obj.error);

        const name = obj.name || objectName || 'Untitled';
        const rawBody = obj.markdown || obj.body || obj.snippet || '';

        // Extract tags from object properties for folder routing
        const props = obj.properties || [];
        const tagProp = props.find(p => p.key === 'tag');
        const tags = tagProp?.multi_select || [];

        // Determine target folder based on tags
        const targetFolder = getTargetFolder(tags);

        // Extract description from Anytype properties, fallback to snippet
        const descProp = props.find(p => p.key === 'description');
        const description = (descProp?.text?.value || descProp?.value || obj.snippet || '')
            .replace(/"/g, '\\"')
            .replace(/\n/g, ' ')
            .trim()
            .substring(0, 300); // cap at 300 chars

        // Build proper markdown with frontmatter
        const body = cleanMarkdown(rawBody);
        const tagList = tags.map(t => t.name).filter(Boolean);
        const tagsYaml = tagList.length > 0 ? `\ntags:\n${tagList.map(t => `  - ${t}`).join('\n')}` : '';
        const descYaml = description ? `\ndescription: "${description}"` : '';
        let md = `---\ntitle: "${name}"\ndate: ${new Date().toISOString().split('T')[0]}${tagsYaml}${descYaml}\n---\n\n`;

        if (body && body.trim().length > 0) {
            md += body;
        } else {
            md += `# ${name}\n\n_(Exported from Anytype)_\n`;
        }

        return { success: true, markdown: md, targetFolder };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Clean Anytype's markdown export for proper Quartz rendering
 * Fixes: indentation, tables, horizontal rules, spacing, nested lists
 */
function cleanMarkdown(md) {
    let lines = md.split('\n');

    // Pass 1: Strip all leading whitespace, but track indentation for lists
    lines = lines.map(line => {
        const trimmed = line.trimStart();
        const indent = line.length - trimmed.length;

        // Preserve relative indentation for nested list items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
            // Convert 8-space indent to 4-space (one nesting level)
            const level = Math.floor(indent / 4);
            if (level > 0) {
                return '    '.repeat(level - 1) + trimmed;
            }
        }

        // Table rows: clean excessive padding in cells
        if (trimmed.startsWith('|')) {
            return cleanTableRow(trimmed);
        }

        // Strip trailing whitespace from all lines
        return trimmed.replace(/\s+$/, '');
    });

    // Pass 2: Fix structural issues
    let result = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prev = i > 0 ? result[result.length - 1] : '';
        const isHeading = /^#{1,6}\s/.test(line);
        const isRule = /^---+$/.test(line);
        const isBlockquote = line.startsWith('>');
        const isList = /^[\-\*]\s/.test(line) || /^\d+\.\s/.test(line);
        const isTable = line.startsWith('|');
        const isEmpty = line.trim() === '';
        const prevIsEmpty = prev.trim() === '';

        // Skip standalone --- right at the start (conflicts with frontmatter)
        if (i === 0 && isRule) continue;

        // Ensure blank line before headings (if previous line is not empty)
        if (isHeading && !prevIsEmpty && result.length > 0) {
            result.push('');
        }

        // Ensure blank line before horizontal rules
        if (isRule && !prevIsEmpty && result.length > 0) {
            result.push('');
        }

        // Ensure blank line before blockquotes (if not after another blockquote)
        if (isBlockquote && !prevIsEmpty && !prev.startsWith('>') && result.length > 0) {
            result.push('');
        }

        result.push(line);

        // Ensure blank line after headings
        if (isHeading && i + 1 < lines.length && lines[i + 1].trim() !== '') {
            result.push('');
        }

        // Ensure blank line after horizontal rules
        if (isRule && i + 1 < lines.length && lines[i + 1].trim() !== '') {
            result.push('');
        }
    }

    return result.join('\n')
        // Remove excessive blank lines (3+ -> 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim() + '\n';
}

/**
 * Clean a markdown table row by removing excessive padding
 */
function cleanTableRow(row) {
    // Split by |, clean each cell, rejoin
    const cells = row.split('|');
    const cleaned = cells.map(cell => {
        const trimmed = cell.trim();
        if (trimmed === '') return '';
        // Keep separator rows as-is but simplified
        if (/^:?-+:?$/.test(trimmed)) return trimmed;
        return ' ' + trimmed + ' ';
    });
    return cleaned.join('|');
}

module.exports = {
    checkConnection,
    listObjects,
    exportMarkdown,
    getObject
};
