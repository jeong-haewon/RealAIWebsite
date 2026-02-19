/**
 * Admin utilities for REAL AI website
 * Handles GitHub integration and image uploads
 */

class GitHubAdmin {
    constructor() {
        this.token = localStorage.getItem('github_token') || '';
        this.repo = 'RealAIWebsite';
        this.owner = 'jeong-haewon'; // Hardcoded to ensure PRs go to the main repo
        this.baseRef = 'main';
    }

    isAuthenticated() {
        return !!this.token;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    clearToken() {
        this.token = '';
        localStorage.removeItem('github_token');
    }

    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.owner = user.login;
                return { valid: true, user };
            }
            return { valid: false };
        } catch (error) {
            console.error('Token validation error:', error);
            return { valid: false, error };
        }
    }

    async getRepoInfo() {
        // Always use the hardcoded owner/repo to ensure PRs go to the main repo
        const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            return await response.json();
        }

        return null;
    }

    async getDefaultBranch() {
        const repo = await this.getRepoInfo();
        if (repo) {
            this.baseRef = repo.default_branch;
            return repo.default_branch;
        }
        return 'main';
    }

    async createBranch(branchName) {
        // Get the SHA of the base branch
        const refResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/${this.baseRef}`,
            {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!refResponse.ok) {
            throw new Error('Could not get base branch reference');
        }

        const refData = await refResponse.json();
        const baseSha = refData.object.sha;

        // Create new branch
        const createResponse = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: baseSha
                })
            }
        );

        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.message || 'Could not create branch');
        }

        return await createResponse.json();
    }

    async getFileContent(path) {
        const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.baseRef}`,
            {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (response.ok) {
            const data = await response.json();
            // Properly decode UTF-8 from Base64
            const binary = atob(data.content);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const content = new TextDecoder('utf-8').decode(bytes);
            return { content, sha: data.sha };
        }

        return null;
    }

    async commitFile(branch, path, content, message, sha = null) {
        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Could not commit file');
        }

        return await response.json();
    }

    async commitBinaryFile(branch, path, base64Content, message) {
        // Check if file exists
        let sha = null;
        try {
            const existing = await fetch(
                `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            if (existing.ok) {
                const data = await existing.json();
                sha = data.sha;
            }
        } catch (e) {
            // File doesn't exist, that's fine
        }

        const body = {
            message,
            content: base64Content,
            branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Could not commit binary file');
        }

        return await response.json();
    }

    async createPullRequest(branch, title, body) {
        const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/pulls`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    body,
                    head: branch,
                    base: this.baseRef
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Could not create pull request');
        }

        return await response.json();
    }
}

// Image upload utilities
class ImageUploader {
    constructor(inputId, previewId, options = {}) {
        this.input = document.getElementById(inputId);
        this.preview = document.getElementById(previewId);
        this.options = {
            maxWidth: options.maxWidth || 1200,
            maxHeight: options.maxHeight || 1200,
            quality: options.quality || 0.85,
            ...options
        };
        this.file = null;
        this.base64 = null;
        this.filename = null;

        if (this.input) {
            this.input.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        this.file = file;
        this.filename = this.sanitizeFilename(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            // Resize if needed
            this.resizeImage(e.target.result, (resizedBase64) => {
                this.base64 = resizedBase64.split(',')[1]; // Remove data:image/...;base64, prefix
                this.updatePreview(resizedBase64);

                // Trigger custom event
                this.input.dispatchEvent(new CustomEvent('imageReady', {
                    detail: { filename: this.filename, base64: this.base64 }
                }));
            });
        };
        reader.readAsDataURL(file);
    }

    resizeImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // Check if resize needed
            if (width <= this.options.maxWidth && height <= this.options.maxHeight) {
                callback(dataUrl);
                return;
            }

            // Calculate new dimensions
            const ratio = Math.min(
                this.options.maxWidth / width,
                this.options.maxHeight / height
            );
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);

            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Get resized image
            const resized = canvas.toDataURL('image/jpeg', this.options.quality);
            callback(resized);
        };
        img.src = dataUrl;
    }

    updatePreview(dataUrl) {
        if (this.preview) {
            this.preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
        }
    }

    sanitizeFilename(name) {
        // Convert to lowercase, replace spaces with underscores, remove special chars
        return name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_.-]/g, '');
    }

    getUploadData() {
        if (!this.base64 || !this.filename) return null;
        return {
            filename: this.filename,
            base64: this.base64
        };
    }

    clear() {
        this.file = null;
        this.base64 = null;
        this.filename = null;
        if (this.input) this.input.value = '';
        if (this.preview) this.preview.innerHTML = this.options.placeholder || 'No image';
    }
}

// UI Components
function createLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'githubLoginModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Connect to GitHub</h3>
                <button class="modal-close" onclick="closeLoginModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>To submit content for review, you need to connect your GitHub account.</p>

                <div class="instructions">
                    <h4>How to get a Personal Access Token:</h4>
                    <ol>
                        <li>Go to <a href="https://github.com/settings" target="_blank">GitHub Settings</a> (click your profile photo in the top right, then "Settings")</li>
                        <li>Scroll down in the left sidebar and click <strong>"Developer settings"</strong> (at the very bottom)</li>
                        <li>Click <strong>"Personal access tokens"</strong> → <strong>"Fine-grained tokens"</strong></li>
                        <li>Click the <strong>"Generate new token"</strong> button</li>
                        <li>Fill in the token details:
                            <ul>
                                <li><strong>Token name</strong>: "REAL AI Admin" (or any name you like)</li>
                                <li><strong>Expiration</strong>: 90 days (recommended)</li>
                            </ul>
                        </li>
                        <li>Under <strong>"Repository access"</strong>, select <strong>"Only select repositories"</strong> and choose the RealAIWebsite repo</li>
                        <li>Under <strong>"Permissions"</strong>, expand <strong>"Repository permissions"</strong> and set:
                            <ul>
                                <li><strong>Contents</strong>: Read and write</li>
                                <li><strong>Pull requests</strong>: Read and write</li>
                            </ul>
                        </li>
                        <li>Scroll down and click the green <strong>"Generate token"</strong> button</li>
                        <li>Copy the token (starts with <code>github_pat_</code>) — you won't be able to see it again!</li>
                    </ol>
                </div>

                <div class="form-group">
                    <label for="githubToken">Personal Access Token</label>
                    <input type="password" id="githubToken" placeholder="ghp_xxxxxxxxxxxx">
                </div>

                <div id="tokenStatus"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeLoginModal()">Cancel</button>
                <button class="btn btn-primary" onclick="validateAndSaveToken()">Connect</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add modal styles if not present
    if (!document.getElementById('modalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'modalStyles';
        styles.textContent = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 2000;
                align-items: center;
                justify-content: center;
            }
            .modal.show {
                display: flex;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.25rem 1.5rem;
                border-bottom: 1px solid var(--border-light);
            }
            .modal-header h3 {
                margin: 0;
                font-size: 1.1rem;
                color: var(--text-primary);
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary);
                line-height: 1;
            }
            .modal-close:hover {
                color: var(--text-primary);
            }
            .modal-body {
                padding: 1.5rem;
            }
            .modal-body p {
                margin-top: 0;
                color: var(--text-secondary);
            }
            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--border-light);
                background: #f8f9fa;
                border-radius: 0 0 12px 12px;
            }
            .instructions {
                background: #f7f8f9;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                font-size: 0.9rem;
            }
            .instructions h4 {
                margin: 0 0 0.75rem 0;
                font-size: 0.95rem;
                color: var(--text-primary);
            }
            .instructions ol {
                margin: 0;
                padding-left: 1.25rem;
            }
            .instructions li {
                margin-bottom: 0.5rem;
                color: var(--text-secondary);
            }
            .instructions ul {
                margin: 0.5rem 0 0 0;
                padding-left: 1.25rem;
            }
            .instructions a {
                color: var(--sky-blue);
            }
            #tokenStatus {
                margin-top: 1rem;
                padding: 0.75rem;
                border-radius: 6px;
                font-size: 0.9rem;
                display: none;
            }
            #tokenStatus.success {
                display: block;
                background: #d4edda;
                color: #155724;
            }
            #tokenStatus.error {
                display: block;
                background: #f8d7da;
                color: #721c24;
            }
            #tokenStatus.loading {
                display: block;
                background: #e7f3ff;
                color: #004085;
            }

            /* Submit modal */
            .submit-progress {
                margin: 1rem 0;
            }
            .progress-step {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
                color: var(--text-secondary);
            }
            .progress-step.active {
                color: var(--sky-blue);
            }
            .progress-step.done {
                color: #28a745;
            }
            .progress-step.error {
                color: #dc3545;
            }
            .progress-step .icon {
                width: 24px;
                text-align: center;
            }
            .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid var(--sky-blue);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Image upload styles */
            .image-upload-group {
                margin-bottom: 1.25rem;
            }
            .image-upload-label {
                display: block;
                font-weight: 500;
                margin-bottom: 0.5rem;
                color: var(--text-primary);
                font-size: 0.9rem;
            }
            .image-upload-area {
                border: 2px dashed var(--border-light);
                border-radius: 8px;
                padding: 1.5rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
                background: #fafafa;
            }
            .image-upload-area:hover {
                border-color: var(--sky-blue);
                background: #f0f7ff;
            }
            .image-upload-area.has-image {
                padding: 0.5rem;
            }
            .image-upload-area img {
                max-width: 100%;
                max-height: 200px;
                border-radius: 6px;
            }
            .image-upload-area input[type="file"] {
                display: none;
            }
            .image-upload-hint {
                font-size: 0.8rem;
                color: var(--text-secondary);
                margin-top: 0.5rem;
            }
            .image-upload-text {
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            .image-upload-text strong {
                color: var(--sky-blue);
            }

            /* GitHub status badge */
            .github-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: #f0f0f0;
                border-radius: 6px;
                font-size: 0.85rem;
                margin-bottom: 1rem;
            }
            .github-status.connected {
                background: #d4edda;
                color: #155724;
            }
            .github-status.disconnected {
                background: #fff3cd;
                color: #856404;
            }
            .github-status a {
                margin-left: auto;
                color: inherit;
                text-decoration: underline;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styles);
    }
}

function createSubmitModal() {
    const modal = document.createElement('div');
    modal.id = 'submitModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Submitting for Review</h3>
                <button class="modal-close" onclick="closeSubmitModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="submit-progress">
                    <div class="progress-step" id="step-branch">
                        <span class="icon">&#9675;</span>
                        <span>Creating branch...</span>
                    </div>
                    <div class="progress-step" id="step-images">
                        <span class="icon">&#9675;</span>
                        <span>Uploading images...</span>
                    </div>
                    <div class="progress-step" id="step-data">
                        <span class="icon">&#9675;</span>
                        <span>Updating data file...</span>
                    </div>
                    <div class="progress-step" id="step-pr">
                        <span class="icon">&#9675;</span>
                        <span>Creating pull request...</span>
                    </div>
                </div>
                <div id="submitResult"></div>
            </div>
            <div class="modal-footer" id="submitModalFooter" style="display: none;">
                <button class="btn btn-primary" onclick="closeSubmitModal()">Done</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Modal functions
function showLoginModal() {
    let modal = document.getElementById('githubLoginModal');
    if (!modal) {
        createLoginModal();
        modal = document.getElementById('githubLoginModal');
    }
    modal.classList.add('show');
}

function closeLoginModal() {
    const modal = document.getElementById('githubLoginModal');
    if (modal) modal.classList.remove('show');
}

function showSubmitModal() {
    let modal = document.getElementById('submitModal');
    if (!modal) {
        createSubmitModal();
        modal = document.getElementById('submitModal');
    }

    // Reset progress
    ['branch', 'images', 'data', 'pr'].forEach(step => {
        const el = document.getElementById(`step-${step}`);
        if (el) {
            el.className = 'progress-step';
            el.querySelector('.icon').innerHTML = '&#9675;';
        }
    });
    document.getElementById('submitResult').innerHTML = '';
    document.getElementById('submitModalFooter').style.display = 'none';

    modal.classList.add('show');
}

function closeSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) modal.classList.remove('show');
}

function updateSubmitStep(step, status) {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;

    el.className = `progress-step ${status}`;
    const icon = el.querySelector('.icon');

    switch (status) {
        case 'active':
            icon.innerHTML = '<span class="spinner"></span>';
            break;
        case 'done':
            icon.innerHTML = '&#10003;';
            break;
        case 'error':
            icon.innerHTML = '&#10007;';
            break;
        default:
            icon.innerHTML = '&#9675;';
    }
}

async function validateAndSaveToken() {
    const tokenInput = document.getElementById('githubToken');
    const status = document.getElementById('tokenStatus');
    const token = tokenInput.value.trim();

    if (!token) {
        status.className = 'error';
        status.textContent = 'Please enter a token';
        status.style.display = 'block';
        return;
    }

    status.className = 'loading';
    status.textContent = 'Validating token...';
    status.style.display = 'block';

    const github = new GitHubAdmin();
    github.setToken(token);

    const result = await github.validateToken();

    if (result.valid) {
        // Try to find the repo
        const repo = await github.getRepoInfo();

        if (repo) {
            status.className = 'success';
            status.textContent = `Connected as ${result.user.login}! Repository: ${repo.full_name}`;

            // Update UI after short delay
            setTimeout(() => {
                closeLoginModal();
                updateGitHubStatus();
            }, 1500);
        } else {
            status.className = 'error';
            status.textContent = `Connected as ${result.user.login}, but couldn't find the repository. Make sure you have access to the website repo.`;
        }
    } else {
        status.className = 'error';
        status.textContent = 'Invalid token. Please check and try again.';
        github.clearToken();
    }
}

function updateGitHubStatus() {
    const statusEl = document.getElementById('githubStatus');
    if (!statusEl) return;

    const github = new GitHubAdmin();

    if (github.isAuthenticated()) {
        github.validateToken().then(result => {
            if (result.valid) {
                statusEl.className = 'github-status connected';
                statusEl.innerHTML = `
                    <span>&#10003;</span>
                    <span>Connected as <strong>${result.user.login}</strong></span>
                    <a onclick="disconnectGitHub()">Disconnect</a>
                `;
            } else {
                showDisconnected();
            }
        });
    } else {
        showDisconnected();
    }

    function showDisconnected() {
        statusEl.className = 'github-status disconnected';
        statusEl.innerHTML = `
            <span>&#9888;</span>
            <span>Not connected to GitHub</span>
            <a onclick="showLoginModal()">Connect</a>
        `;
    }
}

function disconnectGitHub() {
    const github = new GitHubAdmin();
    github.clearToken();
    updateGitHubStatus();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    createLoginModal();
    createSubmitModal();
    updateGitHubStatus();
});
