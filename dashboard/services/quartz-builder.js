/**
 * Quartz Builder
 * Manages Quartz local preview builds.
 */

const { spawn } = require('child_process');
const path = require('path');

const REPO_PATH = path.resolve(__dirname, '..', '..');
let previewProcess = null;

/**
 * Start Quartz local preview server
 */
function startPreview() {
    return new Promise((resolve, reject) => {
        if (previewProcess) {
            resolve({ running: true, url: 'http://localhost:8080', message: 'Preview already running' });
            return;
        }

        const isWindows = process.platform === 'win32';
        const npxCmd = isWindows ? 'npx.cmd' : 'npx';

        previewProcess = spawn(npxCmd, ['quartz', 'build', '--serve'], {
            cwd: REPO_PATH,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let started = false;

        previewProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Started') || output.includes('localhost') || output.includes('8080')) {
                if (!started) {
                    started = true;
                    resolve({ running: true, url: 'http://localhost:8080' });
                }
            }
        });

        previewProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Quartz often logs to stderr
            if (output.includes('Started') || output.includes('localhost') || output.includes('8080')) {
                if (!started) {
                    started = true;
                    resolve({ running: true, url: 'http://localhost:8080' });
                }
            }
        });

        previewProcess.on('error', (err) => {
            previewProcess = null;
            reject(err);
        });

        previewProcess.on('exit', () => {
            previewProcess = null;
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!started) {
                resolve({ running: true, url: 'http://localhost:8080', message: 'Preview may still be starting...' });
            }
        }, 30000);
    });
}

/**
 * Stop Quartz preview server
 */
function stopPreview() {
    if (previewProcess) {
        previewProcess.kill();
        previewProcess = null;
        return { stopped: true };
    }
    return { stopped: false, message: 'No preview running' };
}

/**
 * Get preview status
 */
function getPreviewStatus() {
    return {
        running: previewProcess !== null,
        url: previewProcess ? 'http://localhost:8080' : null
    };
}

module.exports = {
    startPreview,
    stopPreview,
    getPreviewStatus
};
