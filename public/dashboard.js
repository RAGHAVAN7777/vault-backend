const API_BASE = "/api";
const userId = sessionStorage.getItem("userId");

if (!userId) {
    window.location.replace("index.html");
}

// UI Helpers
const setLoader = (isLoading) => {
    document.getElementById('db-loader').style.display = isLoading ? 'block' : 'none';
};

const setStatus = (msg, isError = false) => {
    const el = document.getElementById('upload-status');
    el.innerText = msg ? `// ${msg}` : '';
    el.style.color = isError ? '#ff3333' : '#33ff33';
};

// Custom Modal Helpers
function showModal({ title, message, isPrompt = false, onConfirm, onCancel }) {
    const overlay = document.getElementById('custom-modal-overlay');
    const input = document.getElementById('modal-prompt-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    document.getElementById('modal-title').innerText = `// ${title}`;
    document.getElementById('modal-message').innerText = message;

    input.style.display = isPrompt ? 'block' : 'none';
    if (isPrompt) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }

    overlay.style.display = 'flex';

    const cleanUp = () => {
        overlay.style.display = 'none';
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    confirmBtn.onclick = () => {
        const val = isPrompt ? input.value : true;
        cleanUp();
        if (onConfirm) onConfirm(val);
    };

    cancelBtn.onclick = () => {
        cleanUp();
        if (onCancel) onCancel();
    };

    // Close on ESC or Enter
    const handleKey = (e) => {
        if (e.key === "Escape") cancelBtn.click();
        if (e.key === "Enter" && isPrompt) confirmBtn.click();
    };
    window.addEventListener('keydown', handleKey, { once: true });
}

// Log Out
function logout() {
    sessionStorage.clear();
    window.location.replace("index.html");
}

// Force Download (Bypass CORS for cross-origin downloads)
async function forceDownload(url, filename) {
    try {
        setStatus("PREPARING_DOWNLOAD...");
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        setStatus("DOWNLOAD_READY", false);
    } catch (e) {
        console.error("Download failed", e);
        setStatus("DOWNLOAD_BLOCK_EXTERNAL", true);
        window.open(url, '_blank');
    }
}

// Time Remaining Helper
function getTimeRemaining(expiryDate) {
    if (!expiryDate) return "PERMANENT";
    const total = Date.parse(expiryDate) - Date.parse(new Date());
    if (total <= 0) return "EXPIRED";

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    let timeStr = "";
    if (days > 0) timeStr += `${days}d `;
    timeStr += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return timeStr;
}

// Update Storage UI
async function refreshStorage() {
    try {
        const res = await fetch(`${API_BASE}/user/${userId}`);
        const data = await res.json();

        if (!data.success) return;

        const container = document.getElementById('storage-container');
        const fill = document.getElementById('storage-fill');
        const text = document.getElementById('storage-text');

        container.style.opacity = '1';

        // Update Identity Display
        document.getElementById('display-userid').innerText = userId;
        document.getElementById('display-role').innerText = `[ACCESS_LEVEL: ${data.role.toUpperCase()}]`;

        if (data.role === 'admin') {
            text.innerText = `// STORAGE: UNLIMITED_CAPACITY`;
            fill.style.width = '100%';
            fill.style.background = 'var(--accent)';
        } else {
            const usedMB = (data.storageUsed / (1024 * 1024)).toFixed(2);
            const limitMB = (data.limit / (1024 * 1024)).toFixed(0);
            const percent = Math.min((data.storageUsed / data.limit) * 100, 100);

            text.innerText = `// STORAGE: ${usedMB} MB / ${limitMB} MB USED`;

            // Force Reflow & Sync
            setTimeout(() => {
                fill.style.width = `${percent}%`;
                if (percent > 90) fill.style.background = '#ff3333';
                else if (percent > 70) fill.style.background = '#ffcc00';
                else fill.style.background = '#ffffff';
            }, 100);
        }
    } catch (e) {
        console.error("Storage sync failed", e);
    }
}

// Load Files
async function loadFiles() {
    try {
        const res = await fetch(`${API_BASE}/files/${userId}`);
        const data = await res.json();

        const container = document.getElementById('fileList');
        if (data.files && data.files.length > 0) {
            container.innerHTML = data.files.map(f => {
                const ext = f.fileName.toLowerCase().split('.').pop();
                const viewableDocs = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
                const isViewableDoc = viewableDocs.includes(ext);
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                const viewerUrl = isViewableDoc ? `https://docs.google.com/viewer?url=${encodeURIComponent(f.fileUrl)}&embedded=true` : f.fileUrl;
                const expiryLabel = f.expiresAt ? getTimeRemaining(f.expiresAt) : "PERMANENT";

                return `
                <div class="file-item-group" style="margin-bottom: 25px; border: 1px solid var(--border); padding: 15px; background: #050505; overflow: hidden;">
                    <div class="file-item" style="border:none; margin-bottom: 0px; padding:0; display:flex; justify-content:space-between; align-items:center;">
                        <span class="file-info" style="color: var(--text-main); font-family: 'JetBrains Mono', monospace; overflow-wrap: anywhere; word-break: break-all; padding-right: 15px;">
                            <span style="color: var(--accent);">[FILE_ENTRY]</span> ${f.fileName} (${(f.fileSize / 1024).toFixed(1)} KB)
                            <div style="font-size: 0.6rem; color: var(--error); margin-top: 4px; opacity: 0.8;">// AUTO_DELETE_IN: ${expiryLabel}</div>
                        </span>
                        <div class="file-actions" style="display: flex; gap: 15px;">
                            ${(isViewableDoc || isImage) ? `<span onclick="toggleFilePreview('${f.publicId}')" style="cursor:pointer; color: var(--accent); font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; letter-spacing: 1px;">// VIEW</span>` : `<span style="color: var(--text-dim); font-size: 0.7rem; opacity: 0.5; cursor: not-allowed;">// NO_PREVIEW</span>`}
                            <span onclick="forceDownload('${f.fileUrl}', '${f.fileName}')" style="cursor:pointer; color: var(--success); font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; letter-spacing: 1px;">// DOWNLOAD</span>
                            <span class="delete-btn" onclick="deleteFile('${f.publicId}')" style="cursor:pointer; color: var(--error); font-weight: bold; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; letter-spacing: 1px;">// ERASE_DATA</span>
                        </div>
                    </div>
                    
                    <div id="preview-${f.publicId.replace(/[^a-zA-Z0-9]/g, '-')}" style="display: none; margin-top: 20px; border-top: 1px dashed var(--border); padding-top: 15px;">
                        ${isViewableDoc ? `
                            <div class="pdf-preview" style="height: 500px; background: #111; border: 1px solid #222; position: relative; overflow: hidden;">
                                <iframe src="${viewerUrl}" width="100%" height="100%" style="border:none; background: #111;"></iframe>
                            </div>
                        ` : isImage ? `
                            <div class="img-preview" style="max-height: 500px; text-align: center; background: #111; border: 1px solid #222; padding: 10px;">
                                <img src="${f.fileUrl}" style="max-width: 100%; max-height: 480px; object-fit: contain;">
                            </div>
                        ` : `
                            <div style="padding: 40px; text-align: center; color: var(--text-dim); font-size: 0.7rem; letter-spacing: 2px; border: 1px dashed #222;">
                                // PREVIEW_UNAVAILABLE_FOR_ENCRYPTED_BINARY
                            </div>
                        `}
                    </div>
                </div>
            `;
            }).join('');
        } else {
            container.innerHTML = '<div class="status-line">// NO_FILES_DETECTED</div>';
        }
    } catch (e) {
        console.error("Load failed", e);
    }
}

function toggleFilePreview(publicId) {
    const rawId = publicId.replace(/[^a-zA-Z0-9]/g, '-');
    const el = document.getElementById(`preview-${rawId}`);
    if (el) {
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';

        // Smooth scroll if opening
        if (isHidden) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Upload File
document.getElementById('btn-upload').onclick = async () => {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) return setStatus("NO_FILE_SELECTED", true);

    setLoader(true);
    setStatus("INGESTING_FILE...");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("userId", userId);

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        if (response.ok) {
            setStatus("UPLOAD_SEQUENCE_COMPLETE", false);
            fileInput.value = '';
            loadFiles();
            refreshStorage();
        } else {
            if (response.status === 403) {
                setStatus("STORAGE_LIMIT_REACHED", true);
            } else {
                throw new Error(data.message);
            }
        }
    } catch (err) {
        if (!document.getElementById('upload-status').innerText.includes("LIMIT")) {
            setStatus("UPLOAD_FAILED", true);
        }
    } finally {
        setLoader(false);
    }
};

// Delete File
async function deleteFile(publicId) {
    showModal({
        title: "SECURITY_PROTOCOL",
        message: "CONFIRM_ERASE_COMMAND? THIS_ACTION_IS_IRREVERSIBLE.",
        onConfirm: async () => {
            setLoader(true);
            try {
                const response = await fetch(`${API_BASE}/delete/${encodeURIComponent(publicId)}`, {
                    method: "DELETE"
                });
                const result = await response.json();

                if (response.ok) {
                    setStatus("FILE_ERASED_SUCCESSFULLY", false);
                    loadFiles();
                    refreshStorage();
                } else {
                    throw new Error(result.message || "ERASE_COMMAND_FAILED");
                }
            } catch (e) {
                console.error("Delete failed", e);
                setStatus(`DELETE_ERROR: ${e.message}`, true);
            } finally {
                setLoader(false);
            }
        }
    });
}

// --- MULTI-NOTEBOOK LOGIC ---
let activeNoteId = null;
let notebookCache = [];

async function loadNotebooks() {
    try {
        // Safe Move: Park the editor in the reservoir before clearing innerHTML
        const reservoir = document.getElementById('editor-reservoir');
        const editor = document.getElementById('note-editor-view');
        if (reservoir && editor) reservoir.appendChild(editor);

        const res = await fetch(`${API_BASE}/notes/${userId}`);
        const data = await res.json();
        if (!data.success) return;

        notebookCache = data.notes;
        const container = document.getElementById('notebook-entries');

        if (notebookCache.length === 0) {
            container.innerHTML = '<div class="status-line" style="opacity: 0.4;">// NO_LOCAL_LOGS_FOUND_IN_VAULT</div>';
            return;
        }

        container.innerHTML = notebookCache.map(note => `
            <div class="note-entry-group" id="group-${note._id}" style="border: 1px solid var(--border); background: #050505;">
                <div class="file-item" style="padding: 15px; cursor: pointer; border: none; margin: 0; transition: all 0.2s ease;" onclick="openNote('${note._id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="color: var(--text-main); font-weight: bold; font-size: 0.8rem;">[LOG] ${note.title}</span>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <span style="font-size: 0.55rem; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; opacity: 0.6;">${new Date(note.updatedAt).toLocaleTimeString()}</span>
                            <span onclick="event.stopPropagation(); deleteNote('${note._id}')" style="color: var(--error); cursor: pointer; font-size: 0.6rem; letter-spacing: 1px;">// PURGE</span>
                        </div>
                    </div>
                </div>
                <div id="editor-holder-${note._id}" class="editor-holder" style="padding: 0 15px;"></div>
            </div>
        `).join('');

        // Restore active editor if it exists
        if (activeNoteId) openNote(activeNoteId);
    } catch (e) {
        console.error("Notebook fetch failed", e);
    }
}

function closeNoteEditor() {
    const reservoir = document.getElementById('editor-reservoir');
    const editor = document.getElementById('note-editor-view');

    if (reservoir && editor) {
        editor.style.display = 'none';
        reservoir.appendChild(editor); // Park it safely
    }

    activeNoteId = null;
    document.querySelectorAll('.note-entry-group').forEach(g => g.style.borderColor = 'var(--border)');
}

async function triggerNoteCreation() {
    showModal({
        title: "INITIALIZE_LOG",
        message: "ASSIGN_IDENTIFIER_FOR_NEW_LOG_ENTRY:",
        isPrompt: true,
        onConfirm: async (title) => {
            if (!title) return;
            try {
                const res = await fetch(`${API_BASE}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, title })
                });
                const data = await res.json();
                if (data.success) {
                    await loadNotebooks(); // Sync cache
                    openNote(data.note._id);
                }
            } catch (e) {
                console.error("Create failed", e);
            }
        }
    });
}

function openNote(noteId) {
    const note = notebookCache.find(n => n._id === noteId);
    if (!note) return;

    const editor = document.getElementById('note-editor-view');
    const targetHolder = document.getElementById(`editor-holder-${noteId}`);

    if (!targetHolder) return;

    // Move editor to the specific log row
    targetHolder.appendChild(editor);
    editor.style.display = 'block';

    activeNoteId = noteId;
    document.getElementById('active-note-title').innerText = `// LOG: ${note.title.toUpperCase()}`;
    document.getElementById('notesBox').value = note.content;
    document.getElementById('note-status').innerText = "// READY_FOR_INPUT";

    // Highlight active group
    document.querySelectorAll('.note-entry-group').forEach(g => g.style.borderColor = 'var(--border)');
    document.getElementById(`group-${noteId}`).style.borderColor = 'var(--accent)';

    // Smooth scroll to entry
    document.getElementById(`group-${noteId}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function saveActiveNote() {
    const idToSave = activeNoteId;
    if (!idToSave) return;

    // Clear auto-save timer to prevent collisions if called manually
    clearTimeout(autoSaveTimer);

    const content = document.getElementById('notesBox').value;
    document.getElementById('note-status').innerText = "// SYNCING_WITH_NODE...";

    try {
        const res = await fetch(`${API_BASE}/notes/${idToSave}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.success) {
            // Update Local Cache using the captured ID
            const cacheIndex = notebookCache.findIndex(n => n._id === idToSave);
            if (cacheIndex !== -1) {
                notebookCache[cacheIndex].content = content;
                notebookCache[cacheIndex].updatedAt = new Date().toISOString();
            }

            // Only update UI status if this note is still the active one
            if (activeNoteId === idToSave) {
                document.getElementById('note-status').innerText = "// DATA_PERSISTED_SUCCESSFULLY";
                setTimeout(() => {
                    const statusEl = document.getElementById('note-status');
                    if (statusEl && activeNoteId === idToSave) {
                        statusEl.innerText = "// STANDBY";
                    }
                }, 2000);
            }
        }
    } catch (e) {
        if (activeNoteId === idToSave) {
            document.getElementById('note-status').innerText = "!! SYNC_FAILURE";
        }
    }
}

async function deleteNote(noteId) {
    showModal({
        title: "PURGE_COMMAND",
        message: "CONFIRM_DESTRUCTION_OF_LOCAL_LOG_DATA?",
        onConfirm: async () => {
            try {
                await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
                loadNotebooks();
            } catch (e) {
                console.error("Purge failed", e);
            }
        }
    });
}

function downloadNote() {
    if (!activeNoteId) return;
    const note = notebookCache.find(n => n._id === activeNoteId);
    if (!note) return;

    const content = document.getElementById('notesBox').value;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}_VAULT_LOG.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Auto-save logic
let autoSaveTimer;
document.getElementById('notesBox').addEventListener('input', () => {
    document.getElementById('note-status').innerText = "// INPUT_DETECTED... AUTO_SYNC_ARMED";
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveActiveNote, 2000);
});

// File Selection Notification
document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) {
        showModal({
            title: "FILE_STAGED",
            message: `[${e.target.files[0].name.toUpperCase()}] IS_READY_FOR_INGESTION. CLICK 'INITIATE_UPLOAD' TO SEND TO CLOUD_STORAGE.`,
            onConfirm: () => { } // Just an information modal
        });
    }
});

// Destruction Protocols
async function purgeAllContent() {
    showModal({
        title: "CONFIRM_NUCLEAR_SWEEP",
        message: "THIS_ACTION_WILL_ERASE_ALL_FILES_AND_NOTES_PERMANENTLY. PROCEED?",
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE}/purge-all/${userId}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showModal({
                        title: "SWEEP_COMPLETE",
                        message: "ALL_DATA_PURGED_SUCCESSFULLY.",
                        onConfirm: () => location.reload()
                    });
                } else {
                    showModal({
                        title: "SWEEP_FAILED",
                        message: `ERROR: ${data.message || "UNABLE_TO_COMPLETE_SWEEP"}`,
                        onConfirm: () => { }
                    });
                }
            } catch (e) {
                console.error(e);
                showModal({
                    title: "NETWORK_FAILURE",
                    message: "PROTOCOL_INTERRUPTED. UNABLE_TO_REACH_VAULT_CORE.",
                    onConfirm: () => { }
                });
            }
        }
    });
}

async function requestAccountPurge() {
    showModal({
        title: "ENTITY_DEGRADATION_REQUEST",
        message: "TOTAL_ACCOUNT_DESTRUCTION_REQUIRES_EMAIL_VERIFICATION. REQUEST_TOKEN?",
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE}/request-purge-account-otp/${userId}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showModal({
                        title: "DESTRUCTION_TOKEN_SENT",
                        message: "ENTER_DESTRUCTION_TOKEN_SENT_TO_YOUR_EMAIL:",
                        isPrompt: true,
                        onConfirm: (otp) => {
                            if (otp) finalizeAccountPurge(otp);
                        }
                    });
                } else {
                    showModal({
                        title: "REQUEST_FAILED",
                        message: `ERROR: ${data.message || "COMM_LINK_FAILURE"}`,
                        onConfirm: () => { }
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
    });
}

async function finalizeAccountPurge(otp) {
    try {
        const res = await fetch(`${API_BASE}/purge-account/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });
        const data = await res.json();
        if (data.success) {
            sessionStorage.clear();
            showModal({
                title: "ENTITY_TERMINATED",
                message: "YOUR_ACCOUNT_AND_DATA_HAVE_BEEN_ERASED_FROM_THE_MULTIVERSE.",
                onConfirm: () => location.href = 'index.html'
            });
        } else {
            showModal({
                title: "TERMINATION_FAILED",
                message: `ERROR: ${data.message || "INVALID_AUTH_SEQUENCE"}`,
                onConfirm: () => { }
            });
        }
    } catch (e) {
        console.error(e);
        showModal({
            title: "FATAL_ERROR",
            message: "DESTRUCTION_SEQUENCE_ABORTED_BY_HOST.",
            onConfirm: () => { }
        });
    }
}
loadNotebooks();
loadFiles();
refreshStorage();

// Live Countdown Refresh
setInterval(() => {
    loadFiles(); // Refresh UI to update countdowns
}, 30000); // Every 30 seconds
