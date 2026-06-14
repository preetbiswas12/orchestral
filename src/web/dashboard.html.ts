/**
 * Web Dashboard HTML
 *
 * Self-contained single-page dashboard served as a string from the server.
 * Uses vanilla JS (no frameworks) with embedded CSS.
 */

export const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Code Web Dashboard</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0d1117; --bg-secondary: #161b22; --bg-tertiary: #21262d;
  --border: #30363d; --text: #c9d1d9; --text-dim: #8b949e;
  --accent: #58a6ff; --green: #3fb950; --red: #f85149; --yellow: #d29922; --cyan: #39c5cf;
  --sidebar-width: 200px; --header-height: 48px;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }

/* Layout */
.app { display: flex; flex-direction: column; height: 100vh; }
.header { height: var(--header-height); background: var(--bg-secondary); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 12px; }
.header h1 { font-size: 16px; font-weight: 600; }
.header .status { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); }
.header .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.header .status-dot.offline { background: var(--red); }
.main { display: flex; flex: 1; overflow: hidden; }

/* Sidebar */
.sidebar { width: var(--sidebar-width); background: var(--bg-secondary); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow-y: auto; }
.sidebar-item { padding: 10px 16px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; border-left: 3px solid transparent; }
.sidebar-item:hover { background: var(--bg-tertiary); }
.sidebar-item.active { background: var(--bg-tertiary); border-left-color: var(--accent); color: var(--accent); }
.sidebar-item .icon { font-size: 16px; width: 20px; text-align: center; }
.sidebar-divider { height: 1px; background: var(--border); margin: 8px 0; }

/* Content */
.content { flex: 1; overflow-y: auto; padding: 20px; }
.tab { display: none; }
.tab.active { display: block; }
.tab h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

/* Cards */
.card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.card h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-dim); }
.card .value { font-size: 24px; font-weight: 700; }
.card .sub { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }

/* Progress bar */
.progress-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; margin: 8px 0; }
.progress-bar .fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.progress-bar .fill.green { background: var(--green); }
.progress-bar .fill.yellow { background: var(--yellow); }
.progress-bar .fill.red { background: var(--red); }
.progress-bar .fill.cyan { background: var(--cyan); }

/* File tree */
.file-tree { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; }
.file-item { padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; border-radius: 4px; }
.file-item:hover { background: var(--bg-tertiary); }
.file-item .icon { width: 16px; text-align: center; }
.file-item.directory { font-weight: 600; }
.file-item .size { margin-left: auto; color: var(--text-dim); font-size: 11px; }

/* Agent cards */
.agent-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; }
.agent-card .header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; background: none; border: none; padding: 0; height: auto; }
.agent-card .status-icon { font-size: 14px; }
.agent-card .name { font-weight: 600; font-size: 14px; }
.agent-card .status { font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: auto; }
.agent-card .status.running { background: rgba(57,197,207,0.15); color: var(--cyan); }
.agent-card .status.completed { background: rgba(63,185,80,0.15); color: var(--green); }
.agent-card .status.failed { background: rgba(248,81,73,0.15); color: var(--red); }
.agent-card .status.pending { background: rgba(139,148,158,0.15); color: var(--text-dim); }
.agent-card .preview { font-size: 12px; color: var(--text-dim); font-family: monospace; white-space: pre-wrap; max-height: 60px; overflow: hidden; }

/* Session list */
.session-item { padding: 10px 12px; border-bottom: 1px solid var(--border); cursor: pointer; }
.session-item:hover { background: var(--bg-tertiary); }
.session-item .name { font-weight: 600; font-size: 13px; }
.session-item .meta { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

/* Command palette */
.cmd-search { width: 100%; padding: 10px 14px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; margin-bottom: 12px; outline: none; }
.cmd-search:focus { border-color: var(--accent); }
.cmd-item { padding: 10px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
.cmd-item:hover { background: var(--bg-tertiary); }
.cmd-item .name { font-weight: 600; font-size: 13px; font-family: monospace; }
.cmd-item .desc { font-size: 12px; color: var(--text-dim); }
.cmd-item .category { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--bg-tertiary); color: var(--text-dim); margin-left: auto; }

/* Token chart placeholder */
.chart { height: 120px; background: var(--bg-tertiary); border-radius: 8px; display: flex; align-items: flex-end; padding: 8px; gap: 4px; margin: 12px 0; }
.chart .bar { flex: 1; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 4px; transition: height 0.3s; }

/* Loading */
.loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-dim); }
.spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

/* Responsive */
@media (max-width: 768px) {
  .sidebar { width: 48px; }
  .sidebar-item span:not(.icon) { display: none; }
  .sidebar-divider { margin: 4px 0; }
}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <h1>⚡ Claude Code</h1>
    <div class="status">
      <span class="status-dot" id="wsStatus"></span>
      <span id="wsLabel">Connecting...</span>
    </div>
  </div>
  <div class="main">
    <nav class="sidebar">
      <div class="sidebar-item active" data-tab="overview"><span class="icon">📊</span><span>Overview</span></div>
      <div class="sidebar-item" data-tab="files"><span class="icon">📁</span><span>Files</span></div>
      <div class="sidebar-item" data-tab="sessions"><span class="icon">💬</span><span>Sessions</span></div>
      <div class="sidebar-item" data-tab="tokens"><span class="icon">📈</span><span>Tokens</span></div>
      <div class="sidebar-item" data-tab="agents"><span class="icon">🤖</span><span>Agents</span></div>
      <div class="sidebar-item" data-tab="context"><span class="icon">🧠</span><span>Context</span></div>
      <div class="sidebar-divider"></div>
      <div class="sidebar-item" data-tab="commands"><span class="icon">🔧</span><span>Commands</span></div>
    </nav>
    <div class="content" id="content">
      <div class="loading"><div class="spinner"></div> Loading dashboard...</div>
    </div>
  </div>
</div>

<script>
// ── State ──────────────────────────────────────────────────────────
const state = { ws: null, currentTab: 'overview', data: {}, connected: false };

// ── DOM Helpers ────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── API ────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  try {
    const res = await fetch('/api/' + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    return await res.json();
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── WebSocket ──────────────────────────────────────────────────────
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(proto + '//' + location.host + '/ws');
  state.ws.onopen = () => { state.connected = true; updateWsStatus(); };
  state.ws.onclose = () => { state.connected = false; updateWsStatus(); setTimeout(connectWS, 3000); };
  state.ws.onerror = () => { state.connected = false; updateWsStatus(); };
  state.ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      // Merge event data into state for polling fallback
      if (event.data) Object.assign(state.data, event.data);

      if (event.type === 'context_update') {
        // Update context DOM directly from event data (no API roundtrip)
        updateContextDOM(event.data);
      } else if (event.type === 'agent_update') {
        // Update agent card in-place
        updateAgentCard(event.data);
      } else if (event.type === 'server_info') {
        // Initial connection info
      }
    } catch {}
  };
}

// ── Lightweight DOM Updates from WebSocket Events ──────────────────

function updateContextDOM(data) {
  if (!data) return;
  // Update the context bar fill
  const fill = document.querySelector('#tab-context .progress-bar .fill');
  if (fill && data.percentage != null) {
    fill.style.width = data.percentage + '%';
    fill.className = 'fill ' + (data.status === 'critical' ? 'red' : data.status === 'warning' ? 'yellow' : 'green');
  }
  // Update percentage text
  const pctEl = document.querySelector('#tab-context .card .value');
  if (pctEl && data.percentage != null) {
    pctEl.textContent = data.percentage + '%';
    pctEl.style.color = data.status === 'critical' ? 'var(--red)' : data.status === 'warning' ? 'var(--yellow)' : 'var(--green)';
  }
  // Update tokens sub text
  const subEl = document.querySelector('#tab-context .card .sub');
  if (subEl && data.totalTokens != null) {
    subEl.textContent = data.totalTokens.toLocaleString() + ' / ' + (data.maxTokens || 0).toLocaleString();
  }
  // Also update overview tab context card if visible
  const overviewFill = document.querySelector('#tab-overview .progress-bar .fill');
  if (overviewFill && data.percentage != null) {
    overviewFill.style.width = data.percentage + '%';
    overviewFill.className = 'fill ' + (data.status === 'critical' ? 'red' : data.status === 'warning' ? 'yellow' : 'green');
  }
  const overviewPct = document.querySelector('#tab-overview .card .value');
  if (overviewPct && data.percentage != null) {
    overviewPct.textContent = data.percentage + '%';
  }
  const overviewSub = document.querySelector('#tab-overview .card .sub');
  if (overviewSub && data.totalTokens != null) {
    overviewSub.textContent = data.totalTokens.toLocaleString() + ' / ' + (data.maxTokens || 0).toLocaleString() + ' tokens';
  }
}

function updateAgentCard(data) {
  if (!data || !data.agentId) return;
  // Find or create agent card
  let card = document.querySelector('.agent-card[data-agent-id="' + data.agentId + '"]');
  if (card) {
    // Update existing card's status
    const statusEl = card.querySelector('.status');
    if (statusEl) {
      statusEl.textContent = data.status;
      statusEl.className = 'status ' + data.status;
    }
    const iconEl = card.querySelector('.status-icon');
    if (iconEl) {
      iconEl.textContent = data.status === 'completed' ? '✓' : data.status === 'running' ? '◉' : data.status === 'failed' ? '✗' : '○';
    }
    if (data.output) {
      const preview = card.querySelector('.preview');
      if (preview) preview.textContent = data.output.slice(0, 200);
    }
  }
  // If card doesn't exist and we're on the agents tab, the next renderAgents() full render will pick it up
}

// ── Polling Fallback ───────────────────────────────────────────────
// Fetches fresh data every 5 seconds as backup when WebSocket events don't fire
let pollInterval = null;

function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    try {
      const [contextRes, tokensRes, agentsRes] = await Promise.all([
        api('context'), api('tokens'), api('agents')
      ]);
      if (contextRes.data) {
        state.data.context = contextRes.data.health;
        updateContextDOM(contextRes.data.health);
      }
      if (tokensRes.data) state.data.tokens = tokensRes.data;
      if (agentsRes.data) state.data.agents = agentsRes.data;
    } catch {
      // Polling failure is non-fatal
    }
  }, 5000);
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

function updateWsStatus() {
  const dot = $('#wsStatus');
  const label = $('#wsLabel');
  if (state.connected) { dot.className = 'status-dot'; label.textContent = 'Connected'; }
  else { dot.className = 'status-dot offline'; label.textContent = 'Reconnecting...'; }
}

// ── Tab Navigation ────────────────────────────────────────────────
$$('.sidebar-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => {
    $$('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const tab = item.dataset.tab;
    state.currentTab = tab;
    $$('.tab').forEach(t => t.classList.remove('active'));
    const tabEl = $('#tab-' + tab);
    if (tabEl) { tabEl.classList.add('active'); }
    renderTab(tab);
  });
});

// ── Render Tabs ───────────────────────────────────────────────────
function renderTab(tab) {
  if (tab === 'overview') renderOverview();
  else if (tab === 'files') renderFiles();
  else if (tab === 'sessions') renderSessions();
  else if (tab === 'tokens') renderTokens();
  else if (tab === 'agents') renderAgents();
  else if (tab === 'context') renderContext();
  else if (tab === 'commands') renderCommands();
}

// ── Overview ──────────────────────────────────────────────────────
async function renderOverview() {
  const content = $('#content');
  const [project, context, agents] = await Promise.all([
    api('project'), api('context'), api('agents')
  ]);

  const ctx = context.data?.health || {};
  const agentStats = agents.data?.stats || {};

  content.innerHTML = \`
    <div class="tab active" id="tab-overview">
      <h2>Project Overview</h2>
      <div class="card-grid">
        <div class="card">
          <h3>Project</h3>
          <div class="value">\${project.data?.name || 'Unknown'}</div>
          <div class="sub">\${project.data?.path || ''}</div>
        </div>
        <div class="card">
          <h3>Git Branch</h3>
          <div class="value">\${project.data?.gitBranch || 'N/A'}</div>
          <div class="sub">\${project.data?.originalPath || ''}</div>
        </div>
        <div class="card">
          <h3>Context Usage</h3>
          <div class="value" style="color:\${ctx.status === 'critical' ? 'var(--red)' : ctx.status === 'warning' ? 'var(--yellow)' : 'var(--green)'}">\${ctx.percentage || 0}%</div>
          <div class="progress-bar"><div class="fill \${ctx.status === 'critical' ? 'red' : ctx.status === 'warning' ? 'yellow' : 'green'}" style="width:\${ctx.percentage || 0}%"></div></div>
          <div class="sub">\${(ctx.totalTokens || 0).toLocaleString()} / \${(ctx.maxTokens || 0).toLocaleString()} tokens</div>
        </div>
        <div class="card">
          <h3>Active Agents</h3>
          <div class="value">\${agentStats.activeSwarms || 0}</div>
          <div class="sub">\${agentStats.totalAgents || 0} total agents in \${agentStats.totalSwarms || 0} swarms</div>
        </div>
        <div class="card">
          <h3>Token Trend</h3>
          <div class="value">\${ctx.trend || 'stable'}</div>
          <div class="sub">\${Math.round(ctx.tokensPerMinute || 0)} tok/min</div>
        </div>
        <div class="card">
          <h3>Compactions</h3>
          <div class="value">\${ctx.compactionCount || 0}</div>
          <div class="sub">Avg \${(ctx.avgTokensSaved || 0).toLocaleString()} tokens saved</div>
        </div>
      </div>
    </div>
  \`;
}

// ── Files ─────────────────────────────────────────────────────────
async function renderFiles(path = '') {
  const content = $('#content');
  const res = await api('files' + (path ? '?path=' + encodeURIComponent(path) : ''));
  const files = res.data?.files || [];

  let html = '<div class="tab active" id="tab-files"><h2>Files</h2>';
  if (path) html += '<div class="card" style="cursor:pointer" onclick="renderFiles(\\'' + path.split('/').slice(0, -1).join('/') + '\\')">⬆️ ..</div>';
  html += '<div class="file-tree">';

  for (const f of files) {
    const icon = f.isDirectory ? '📁' : getFileIcon(f.name);
    const size = f.size ? formatSize(f.size) : '';
    html += \`<div class="file-item \${f.isDirectory ? 'directory' : ''}" onclick="\${f.isDirectory ? 'renderFiles(\\'' + f.path + '\\')' : 'viewFile(\\'' + f.path + '\\')'}">
      <span class="icon">\${icon}</span>
      <span>\${f.name}</span>
      <span class="size">\${size}</span>
    </div>\`;
  }

  html += '</div></div>';
  content.innerHTML = html;
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = { ts: '🔷', tsx: '🔷', js: '🟨', jsx: '🟨', py: '🐍', go: '🔵', rs: '🦀', json: '📋', md: '📝', yaml: '⚙️', yml: '⚙️', css: '🎨', html: '🌐', sh: '⚡' };
  return icons[ext || ''] || '📄';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

async function viewFile(path) {
  const content = $('#content');
  const res = await api('files/' + encodeURIComponent(path));
  if (res.ok) {
    content.innerHTML = \`<div class="tab active" id="tab-files">
      <h2>\${path}</h2>
      <div class="card">
        <pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;overflow:auto;max-height:70vh;">\${escapeHtml(res.data.content)}</pre>
      </div>
    </div>\`;
  }
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ── Sessions ──────────────────────────────────────────────────────
async function renderSessions() {
  const content = $('#content');
  const res = await api('sessions');
  const sessions = res.data?.sessions || [];

  let html = '<div class="tab active" id="tab-sessions"><h2>Sessions</h2>';
  if (sessions.length === 0) html += '<div class="card"><div class="sub">No sessions found.</div></div>';

  for (const s of sessions) {
    html += \`<div class="session-item" onclick="viewSession('\${s.id}')">
      <div class="name">\${s.name}</div>
      <div class="meta">\${new Date(s.modified).toLocaleString()} · \${formatSize(s.size)}</div>
    </div>\`;
  }

  html += '</div>';
  content.innerHTML = html;
}

async function viewSession(id) {
  const content = $('#content');
  const res = await api('sessions/' + id);
  if (res.ok) {
    content.innerHTML = \`<div class="tab active" id="tab-sessions">
      <h2>Session: \${id}</h2>
      <div class="card-grid">
        <div class="card"><h3>Messages</h3><div class="value">\${res.data.messageCount || 0}</div></div>
        <div class="card"><h3>Est. Tokens</h3><div class="value">\${(res.data.tokenCount || 0).toLocaleString()}</div></div>
        <div class="card"><h3>Files</h3><div class="value">\${(res.data.files || []).length}</div></div>
      </div>
    </div>\`;
  }
}

// ── Tokens ────────────────────────────────────────────────────────
async function renderTokens() {
  const content = $('#content');
  const res = await api('tokens');
  const data = res.data || {};
  const ctx = data.context || {};
  const history = data.history || [];

  // Build simple bar chart from history
  const maxTokens = Math.max(...history.map(h => h.tokens), 1);
  const bars = history.map(h => {
    const pct = Math.max(2, (h.tokens / maxTokens) * 100);
    return \`<div class="bar" style="height:\${pct}%" title="\${h.tokens.toLocaleString()} tokens at \${new Date(h.timestamp).toLocaleTimeString()}"></div>\`;
  }).join('');

  content.innerHTML = \`
    <div class="tab active" id="tab-tokens">
      <h2>Token Analytics</h2>
      <div class="card-grid">
        <div class="card"><h3>Current Usage</h3><div class="value">\${ctx.percentage || 0}%</div><div class="sub">\${(ctx.totalTokens || 0).toLocaleString()} / \${(ctx.maxTokens || 0).toLocaleString()}</div></div>
        <div class="card"><h3>Usage Rate</h3><div class="value">\${Math.round(ctx.tokensPerMinute || 0)}</div><div class="sub">tokens per minute</div></div>
        <div class="card"><h3>Est. Time Left</h3><div class="value">\${ctx.estimatedMinutesUntilFull != null ? Math.round(ctx.estimatedMinutesUntilFull) + ' min' : '∞'}</div></div>
        <div class="card"><h3>Compactions</h3><div class="value">\${ctx.compactionCount || 0}</div><div class="sub">Avg \${(ctx.avgTokensSaved || 0).toLocaleString()} saved</div></div>
      </div>
      <div class="card">
        <h3>Usage History</h3>
        <div class="chart">\${bars || '<div class="sub" style="flex:1;text-align:center">No history yet</div>'}</div>
      </div>
    </div>
  \`;
}

// ── Agents ────────────────────────────────────────────────────────
async function renderAgents() {
  const content = $('#content');
  const res = await api('agents');
  const swarms = res.data?.swarms || [];
  const stats = res.data?.stats || {};

  let html = '<div class="tab active" id="tab-agents"><h2>Agents</h2>';
  html += \`<div class="card-grid" style="margin-bottom:16px">
    <div class="card"><h3>Total Swarms</h3><div class="value">\${stats.totalSwarms || 0}</div></div>
    <div class="card"><h3>Active</h3><div class="value" style="color:var(--cyan)">\${stats.activeSwarms || 0}</div></div>
    <div class="card"><h3>Total Agents</h3><div class="value">\${stats.totalAgents || 0}</div></div>
    <div class="card"><h3>Total Tokens</h3><div class="value">\${(stats.totalTokens || 0).toLocaleString()}</div></div>
  </div>\`;

  if (swarms.length === 0) {
    html += '<div class="card"><div class="sub">No swarms yet. Use /agent-dashboard to create one.</div></div>';
  }

  for (const swarm of swarms) {
    const statusColor = swarm.status === 'completed' ? 'green' : swarm.status === 'running' ? 'cyan' : swarm.status === 'failed' ? 'red' : 'gray';
    html += \`<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="color:var(--\${statusColor})">●</span>
        <strong>\${swarm.name}</strong>
        <span class="status \${swarm.status}">\${swarm.status}</span>
        <span class="sub" style="margin-left:auto">\${swarm.agentCount} agents · \${(swarm.duration / 1000).toFixed(1)}s</span>
      </div>\`;
    for (const agent of swarm.agents) {
      html += \`<div class="agent-card">
        <div class="header"><span class="status-icon">\${agent.status === 'completed' ? '✓' : agent.status === 'running' ? '◉' : agent.status === 'failed' ? '✗' : '○'}</span>
        <span class="name">\${agent.name}</span>
        <span class="status \${agent.status}">\${agent.status}</span></div>
        \${agent.outputPreview ? '<div class="preview">' + escapeHtml(agent.outputPreview) + '</div>' : ''}
      </div>\`;
    }
    html += '</div>';
  }

  html += '</div>';
  content.innerHTML = html;
}

// ── Context ───────────────────────────────────────────────────────
async function renderContext() {
  const content = $('#content');
  const res = await api('context');
  const h = res.data?.health || {};
  const bar = res.data?.bar || {};

  content.innerHTML = \`
    <div class="tab active" id="tab-context">
      <h2>Context Health</h2>
      <div class="card-grid">
        <div class="card"><h3>Status</h3><div class="value" style="color:\${h.status === 'critical' ? 'var(--red)' : h.status === 'warning' ? 'var(--yellow)' : 'var(--green)'}">\${h.status?.toUpperCase() || 'UNKNOWN'}</div></div>
        <div class="card"><h3>Usage</h3><div class="value">\${h.percentage || 0}%</div><div class="sub">\${(h.totalTokens || 0).toLocaleString()} / \${(h.maxTokens || 0).toLocaleString()}</div></div>
        <div class="card"><h3>Trend</h3><div class="value">\${h.trend || 'stable'}</div><div class="sub">\${Math.round(h.tokensPerMinute || 0)} tok/min</div></div>
        <div class="card"><h3>Time Until Full</h3><div class="value">\${h.estimatedMinutesUntilFull != null ? Math.round(h.estimatedMinutesUntilFull) + ' min' : '∞'}</div></div>
      </div>
      <div class="card">
        <h3>Context Bar</h3>
        <div class="progress-bar" style="height:24px">
          <div class="fill \${h.status === 'critical' ? 'red' : h.status === 'warning' ? 'yellow' : 'green'}" style="width:\${h.percentage || 0}%"></div>
        </div>
        <div class="sub">Compactions: \${h.compactionCount || 0} · Avg saved: \${(h.avgTokensSaved || 0).toLocaleString()} tokens</div>
      </div>
    </div>
  \`;
}

// ── Commands ──────────────────────────────────────────────────────
async function renderCommands() {
  const content = $('#content');
  const res = await api('commands');
  const commands = res.data?.commands || [];

  let html = '<div class="tab active" id="tab-commands"><h2>Command Palette</h2>';
  html += '<input type="text" class="cmd-search" placeholder="Search commands..." id="cmdSearch" oninput="filterCommands()">';
  html += '<div id="cmdList">';

  for (const cmd of commands) {
    html += \`<div class="cmd-item" data-name="\${cmd.name.toLowerCase()}" onclick="executeCommand('\${cmd.name}')">
      <span class="name">/\${cmd.name}</span>
      <span class="desc">\${cmd.description}</span>
      <span class="category">\${cmd.category}</span>
    </div>\`;
  }

  html += '</div></div>';
  content.innerHTML = html;
}

function filterCommands() {
  const query = $('#cmdSearch').value.toLowerCase();
  $$('.cmd-item').forEach(item => {
    item.style.display = item.dataset.name.includes(query) ? '' : 'none';
  });
}

async function executeCommand(name) {
  const res = await api('command', { method: 'POST', body: JSON.stringify({ command: name }) });
  alert(res.data?.message || res.error || 'Command executed');
}

// ── Init ──────────────────────────────────────────────────────────
connectWS();
renderOverview();
startPolling();
</script>
</body>
</html>`
