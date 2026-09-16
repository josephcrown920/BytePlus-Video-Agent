// BytePlus Video Agent - Frontend App

const API_BASE = '/api';

// ===== Utility Functions =====
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function validateApiKey() {
  // We don't validate here - the server handles it
  return true;
}

// ===== Tab Navigation =====
function initTabs() {
  const tabs = document.querySelectorAll('.nav-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tabName}`).classList.add('active');

      // Load data when tab is opened
      if (tabName === 'drafts') loadDrafts();
      if (tabName === 'tasks') loadTasks();
      if (tabName === 'bible') loadBible();
    });
  });
}

// ===== API Status Check =====
async function checkApiStatus() {
  const result = await apiCall('/status');
  const badge = document.getElementById('api-status');
  if (result.ok) {
    badge.textContent = result.apiKeyConfigured ? '● API Connected' : '● API Key Missing';
    badge.className = `status-badge ${result.apiKeyConfigured ? 'status-online' : 'status-offline'}`;
    if (!result.apiKeyConfigured) {
      showToast('Warning: ARK_API_KEY not set on server. Generation will fail.', 'warning');
    }
  } else {
    badge.textContent = '● Offline';
    badge.className = 'status-badge status-offline';
  }
}

// ===== Image Generation =====
function initImageGen() {
  document.getElementById('btn-img-dry').addEventListener('click', async () => {
    const prompt = document.getElementById('img-prompt').value;
    if (!prompt) return showToast('Please enter a prompt', 'warning');

    const result = await apiCall('/image/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        version: document.getElementById('img-version').value,
        size: document.getElementById('img-size').value,
        confirmed: false,
      }),
    });
    document.getElementById('img-result').classList.remove('hidden');
    document.getElementById('img-output').innerHTML = `
      <p style="color: var(--text-secondary); margin-bottom: 10px;">📝 Dry Run Preview</p>
      <pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; color: var(--text-muted);">${JSON.stringify(result.request || result, null, 2)}</pre>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">ℹ️ This is a preview. Click "Generate Image" to create the actual image (API charges may apply).</p>
    `;
  });

  document.getElementById('btn-img-gen').addEventListener('click', async () => {
    const prompt = document.getElementById('img-prompt').value;
    if (!prompt) return showToast('Please enter a prompt', 'warning');

    const btn = document.getElementById('btn-img-gen');
    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    const outputFormat = document.getElementById('img-format').value;
    const seed = document.getElementById('img-seed').value;

    const result = await apiCall('/image/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        version: document.getElementById('img-version').value,
        size: document.getElementById('img-size').value,
        outputFormat: outputFormat || undefined,
        seed: seed ? Number(seed) : undefined,
        confirmed: true,
      }),
    });

    btn.disabled = false;
    btn.textContent = '✨ Generate Image';

    document.getElementById('img-result').classList.remove('hidden');
    if (result.ok && result.data && result.data.length > 0) {
      const images = result.data.map((img, i) => {
        const url = img.url;
        return `<div style="margin-bottom: 15px;">
          <img src="${url}" alt="Generated image ${i + 1}" style="width: 100%;">
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
            ${url}
          </p>
        </div>`;
      }).join('');
      document.getElementById('img-output').innerHTML = images;
      showToast('Image generated successfully!', 'success');
    } else {
      document.getElementById('img-output').innerHTML = `<p style="color: var(--danger);">❌ ${result.error || 'Generation failed'}</p>`;
      showToast('Generation failed', 'error');
    }
  });
}

// ===== Video Generation =====
function initVideoGen() {
  // Apply preset when changed
  document.getElementById('vid-preset').addEventListener('change', (e) => {
    const preset = e.target.value;
    if (preset) {
      const presets = {
        'cinematic-wide': { version: '2.0', ratio: '21:9', duration: 8, resolution: '1080p' },
        'theatrical': { version: '2.0', ratio: '16:9', duration: 10, resolution: '1080p' },
        'social-portrait': { version: '1.5-pro', ratio: '9:16', duration: 5, resolution: '1080p' },
        'social-landscape': { version: '1.5-pro', ratio: '16:9', duration: 5, resolution: '720p' },
        'storyboard': { version: '2.0-fast', ratio: '16:9', duration: 3, resolution: '480p' },
      };
      const p = presets[preset];
      if (p) {
        document.getElementById('vid-version').value = p.version;
        document.getElementById('vid-ratio').value = p.ratio;
        document.getElementById('vid-duration').value = p.duration;
        document.getElementById('vid-resolution').value = p.resolution;
      }
    }
  });

  document.getElementById('btn-vid-dry').addEventListener('click', async () => {
    const prompt = document.getElementById('vid-prompt').value;
    if (!prompt) return showToast('Please enter a prompt', 'warning');

    const result = await apiCall('/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        version: document.getElementById('vid-version').value,
        ratio: document.getElementById('vid-ratio').value,
        duration: Number(document.getElementById('vid-duration').value),
        resolution: document.getElementById('vid-resolution').value,
        motion: document.getElementById('vid-motion').value || undefined,
        confirmed: false,
      }),
    });
    document.getElementById('vid-result').classList.remove('hidden');
    document.getElementById('vid-output').innerHTML = `
      <p style="color: var(--text-secondary); margin-bottom: 10px;">📝 Dry Run Preview</p>
      <pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; color: var(--text-muted);">${JSON.stringify(result.request || result, null, 2)}</pre>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">ℹ️ This is a preview. Click "Generate Video" to create the actual video (API charges may apply, and it may take several minutes).</p>
    `;
  });

  document.getElementById('btn-vid-gen').addEventListener('click', async () => {
    const prompt = document.getElementById('vid-prompt').value;
    if (!prompt) return showToast('Please enter a prompt', 'warning');

    const btn = document.getElementById('btn-vid-gen');
    btn.disabled = true;
    btn.textContent = '⏳ Generating... (this may take a few minutes)';

    const noWait = document.getElementById('vid-nowait').checked;
    const firstFrame = document.getElementById('vid-first-frame').value;

    const result = await apiCall('/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        version: document.getElementById('vid-version').value,
        ratio: document.getElementById('vid-ratio').value,
        duration: Number(document.getElementById('vid-duration').value),
        resolution: document.getElementById('vid-resolution').value,
        firstFrame: firstFrame || undefined,
        generateAudio: document.getElementById('vid-audio').checked,
        motion: document.getElementById('vid-motion').value || undefined,
        confirmed: true,
        noWait,
      }),
    });

    btn.disabled = false;
    btn.textContent = '🎬 Generate Video';

    document.getElementById('vid-result').classList.remove('hidden');
    displayVideoResult(result);
  });
}

function displayVideoResult(result) {
  const output = document.getElementById('vid-output');

  if (result.ok && result.status === 'submitted') {
    output.innerHTML = `
      <p style="color: var(--warning);">⏳ Task submitted! Task ID: ${result.task_id}</p>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
        Track progress in the Tasks tab. The video may take 1-5 minutes to generate.
      </p>
    `;
    showToast('Video task submitted! Check Tasks tab for progress.', 'info');
  } else if (result.ok && result.status === 'succeeded') {
    const videoUrl = result.task?.content?.video_url || '';
    const lastFrame = result.task?.content?.last_frame || '';
    output.innerHTML = `
      ${videoUrl ? `<video controls src="${videoUrl}" style="width: 100%; border-radius: 8px;"></video>` : ''}
      ${lastFrame ? `<p style="font-size: 12px; margin-top: 10px;"><strong>Last frame:</strong></p><img src="${lastFrame}" style="max-width: 200px; border-radius: 4px; margin-top: 5px;">` : ''}
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
        Task ID: ${result.task_id}<br>
        ${videoUrl ? `URL: ${videoUrl}` : ''}
      </p>
    `;
    showToast('Video generated successfully!', 'success');
  } else {
    output.innerHTML = `<p style="color: var(--danger);">❌ ${result.error || 'Generation failed'}</p>
      <pre style="background: var(--bg-tertiary); padding: 10px; border-radius: 6px; font-size: 11px; color: var(--text-muted); margin-top: 10px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>`;
    showToast('Generation failed', 'error');
  }
}

// ===== Multi-Shot =====
let shotCount = 1;

function initMultiShot() {
  document.getElementById('btn-add-shot').addEventListener('click', () => {
    shotCount++;
    const container = document.getElementById('shots-container');
    const shot = document.createElement('div');
    shot.className = 'shot-item';
    shot.dataset.shot = shotCount - 1;
    shot.innerHTML = `
      <div class="shot-header">
        <span class="shot-number">Shot ${shotCount}</span>
        <button class="btn btn-small btn-danger btn-rm-shot" data-idx="${shotCount - 1}">Remove</button>
      </div>
      <textarea class="shot-prompt" rows="2" placeholder="Describe this shot..."></textarea>
    `;
    container.appendChild(shot);
    attachRemoveHandlers();
  });

  attachRemoveHandlers();

  document.getElementById('btn-ms-generate').addEventListener('click', async () => {
    const shots = getShotsData();
    if (shots.length === 0) return showToast('Add at least one shot', 'warning');

    const btn = document.getElementById('btn-ms-generate');
    btn.disabled = true;
    btn.textContent = '⏳ Submitting shots...';

    const result = await apiCall('/video/multishot', {
      method: 'POST',
      body: JSON.stringify({
        shots,
        version: document.getElementById('ms-model').value,
        ratio: document.getElementById('ms-ratio').value,
        duration: Number(document.getElementById('ms-duration').value),
        resolution: document.getElementById('ms-resolution').value,
        confirmed: true,
      }),
    });

    btn.disabled = false;
    btn.textContent = '🎬 Generate All Shots';

    document.getElementById('ms-result').classList.remove('hidden');
    if (result.ok) {
      let html = `<p>✅ Submitted ${result.submitted} of ${result.totalShots} shots</p><div style="margin-top: 15px;">`;
      for (const r of result.results) {
        html += `<div style="padding: 10px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 8px;">
          <strong>Shot ${r.shotIndex + 1}:</strong>
          <span style="color: ${r.ok ? 'var(--success)' : 'var(--danger)'}">
            ${r.ok ? r.task_id : r.error}
          </span>
        </div>`;
      }
      html += '</div>';
      document.getElementById('ms-output').innerHTML = html;
      showToast(`${result.submitted} shots submitted!`, 'success');
    } else {
      document.getElementById('ms-output').innerHTML = `<p style="color: var(--danger);">❌ ${result.error}</p>`;
      showToast('Failed to submit shots', 'error');
    }
  });

  document.getElementById('btn-ms-save-draft').addEventListener('click', async () => {
    const shots = getShotsData();
    const scene = document.getElementById('ms-scene').value;
    const result = await apiCall('/drafts', {
      method: 'POST',
      body: JSON.stringify({
        type: 'multishot',
        data: {
          scene,
          shots,
          version: document.getElementById('ms-model').value,
          ratio: document.getElementById('ms-ratio').value,
          duration: Number(document.getElementById('ms-duration').value),
          resolution: document.getElementById('ms-resolution').value,
        },
      }),
    });
    if (result.ok) {
      showToast('Draft saved!', 'success');
    } else {
      showToast('Failed to save draft', 'error');
    }
  });
}

function getShotsData() {
  const prompts = document.querySelectorAll('.shot-prompt');
  const shots = [];
  prompts.forEach((ta, idx) => {
    if (ta.value.trim()) {
      shots.push({ id: `shot-${idx + 1}`, prompt: ta.value.trim() });
    }
  });
  return shots;
}

function attachRemoveHandlers() {
  document.querySelectorAll('.btn-rm-shot').forEach(btn => {
    btn.onclick = (e) => {
      const idx = e.target.dataset.idx;
      const shotItem = document.querySelector(`.shot-item[data-shot="${idx}"]`);
      if (shotItem && shotCount > 1) {
        shotItem.remove();
      }
    };
  });
}

// ===== Drafts =====
async function loadDrafts() {
  const type = document.getElementById('draft-filter-type').value;
  const status = document.getElementById('draft-filter-status').value;
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);

  const result = await apiCall(`/drafts?${params.toString()}`);
  const list = document.getElementById('drafts-list');

  if (!result.ok || result.drafts.length === 0) {
    list.innerHTML = '<p class="muted">No drafts found</p>';
    return;
  }

  list.innerHTML = result.drafts.map(d => `
    <div class="draft-card">
      <div class="draft-card-header">
        <span class="draft-type">${d.type}</span>
        <span class="draft-status">${d.status} • ${new Date(d.updatedAt).toLocaleString()}</span>
      </div>
      <div class="draft-prompt">${d.data.prompt || d.data.scene || d.id}</div>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button class="btn btn-small btn-secondary" onclick="loadDraft('${d.id}')">Load</button>
        <button class="btn btn-small btn-secondary" onclick="duplicateDraft('${d.id}')">Duplicate</button>
        <button class="btn btn-small btn-danger" onclick="deleteDraft('${d.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function deleteDraft(id) {
  const result = await apiCall(`/drafts/${id}`, { method: 'DELETE' });
  if (result.ok) {
    showToast('Draft deleted', 'success');
    loadDrafts();
  }
}

async function duplicateDraft(id) {
  const result = await apiCall(`/drafts/${id}/duplicate`, { method: 'POST' });
  if (result.ok) {
    showToast('Draft duplicated', 'success');
    loadDrafts();
  }
}

function loadDraft(id) {
  // Load draft into the generate tab
  apiCall(`/drafts/${id}`).then(result => {
    if (result.ok && result.draft) {
      const data = result.draft.data;
      if (result.draft.type === 'video' || result.draft.type === 'image') {
        // Switch to generate tab and populate
        showToast('Draft loaded', 'info');
      }
    }
  });
}

function initDrafts() {
  document.getElementById('btn-refresh-drafts').addEventListener('click', loadDrafts);
  document.getElementById('draft-filter-type').addEventListener('change', loadDrafts);
  document.getElementById('draft-filter-status').addEventListener('change', loadDrafts);
}

// ===== Tasks =====
let autoRefresh = false;
let autoRefreshInterval = null;

async function loadTasks() {
  const result = await apiCall('/video/tasks');
  const list = document.getElementById('tasks-list');

  if (!result.ok || !result.tasks || result.tasks.length === 0) {
    list.innerHTML = '<p class="muted">No active tasks</p>';
    return;
  }

  list.innerHTML = result.tasks.map(t => `
    <div class="task-card">
      <div class="task-header">
        <span class="task-id">${t.task_id}</span>
        <span class="task-status status-${t.status || 'submitted'}">${t.status || 'submitted'}</span>
      </div>
      ${t.task?.content?.video_url ? `
        <video controls src="${t.task.content.video_url}" style="width: 100%; margin-top: 10px; border-radius: 6px;"></video>
      ` : ''}
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button class="btn btn-small btn-secondary" onclick="pollTask('${t.task_id}')">🔄 Poll Status</button>
      </div>
    </div>
  `).join('');
}

async function pollTask(taskId) {
  const result = await apiCall(`/video/tasks/${taskId}?maxWait=5`);
  loadTasks();
  if (result.ok && result.status === 'succeeded') {
    showToast('Task completed!', 'success');
  }
}

function initTasks() {
  document.getElementById('btn-refresh-tasks').addEventListener('click', loadTasks);
  document.getElementById('btn-auto-refresh').addEventListener('click', () => {
    autoRefresh = !autoRefresh;
    const btn = document.getElementById('btn-auto-refresh');
    if (autoRefresh) {
      btn.textContent = '⏱️ Auto-Refresh: ON';
      autoRefreshInterval = setInterval(loadTasks, 10000);
      showToast('Auto-refresh enabled (every 10s)', 'info');
    } else {
      btn.textContent = '⏱️ Auto-Refresh: OFF';
      clearInterval(autoRefreshInterval);
    }
  });
}

// ===== Bible =====
async function loadBible() {
  const [summaryRes, charRes, styleRes] = await Promise.all([
    apiCall('/bible'),
    apiCall('/bible/characters'),
    apiCall('/bible/style'),
  ]);

  // Characters list
  const charList = document.getElementById('char-list');
  if (charRes.ok && charRes.characters && Object.keys(charRes.characters).length > 0) {
    charList.innerHTML = Object.values(charRes.characters).map(c => `
      <div class="char-item">
        <div class="char-name">${c.name}</div>
        <div class="char-desc">${c.visualDescription || c.description || 'No description'}</div>
      </div>
    `).join('');
  } else {
    charList.innerHTML = '<p class="muted">No characters yet</p>';
  }

  // Style
  if (styleRes.ok && styleRes.style) {
    document.getElementById('bible-style-overall').value = styleRes.style.overall || '';
    document.getElementById('bible-style-palette').value = styleRes.style.colorPalette || '';
    document.getElementById('bible-style-lighting').value = styleRes.style.lighting || '';
    document.getElementById('bible-style-lens').value = styleRes.style.lens || '';
  }

  // Summary
  document.getElementById('bible-summary').textContent = JSON.stringify(summaryRes, null, 2);
}

function initBible() {
  document.getElementById('btn-add-char').addEventListener('click', async () => {
    const name = document.getElementById('char-name').value;
    const desc = document.getElementById('char-desc').value;
    if (!name) return showToast('Enter a character name', 'warning');

    const result = await apiCall('/bible/characters', {
      method: 'POST',
      body: JSON.stringify({
        name,
        details: { visualDescription: desc },
      }),
    });
    if (result.ok) {
      showToast('Character added!', 'success');
      document.getElementById('char-name').value = '';
      document.getElementById('char-desc').value = '';
      loadBible();
    } else {
      showToast('Failed to add character', 'error');
    }
  });

  document.getElementById('btn-save-style').addEventListener('click', async () => {
    const result = await apiCall('/bible/style', {
      method: 'POST',
      body: JSON.stringify({
        overall: document.getElementById('bible-style-overall').value,
        colorPalette: document.getElementById('bible-style-palette').value,
        lighting: document.getElementById('bible-style-lighting').value,
        lens: document.getElementById('bible-style-lens').value,
      }),
    });
    if (result.ok) {
      showToast('Style saved!', 'success');
      loadBible();
    }
  });
}

// ===== Pipeline =====
function initPipeline() {
  document.getElementById('btn-run-pipeline').addEventListener('click', async () => {
    const btn = document.getElementById('btn-run-pipeline');
    btn.disabled = true;
    btn.textContent = '⏳ Running pipeline...';

    const result = await apiCall('/pipeline/scene', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: document.getElementById('pipe-scene').value,
        conceptPrompt: document.getElementById('pipe-concept').value,
        videoPrompt: document.getElementById('pipe-video-prompt').value,
        duration: Number(document.getElementById('pipe-duration').value),
        ratio: document.getElementById('pipe-ratio').value,
        resolution: document.getElementById('pipe-resolution').value,
        generateVideo: true,
        confirmed: true,
      }),
    });

    btn.disabled = false;
    btn.textContent = '🚀 Run Full Pipeline';

    document.getElementById('pipe-result').classList.remove('hidden');
    document.getElementById('pipe-output').innerHTML = `
      <pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>
    `;
  });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initImageGen();
  initVideoGen();
  initMultiShot();
  initDrafts();
  initTasks();
  initBible();
  initPipeline();
  checkApiStatus();
  setInterval(checkApiStatus, 30000);

  console.log('🎬 BytePlus Video Agent UI loaded');
});
