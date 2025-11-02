(() => {
  function ensureAdmin() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(_) {}
    const token = localStorage.getItem('token');
    if (!token || !user || user.role !== 'admin') {
      alert('Admin only. Please log in as admin.');
      window.location.href = './gameplay.html';
      return null;
    }
    return { user, token };
  }

  function renderRows(rows) {
    const tbody = document.querySelector('#usageTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (rows || []).forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${r.username || ''}</td>
        <td>${r.email || ''}</td>
        <td>${Number(r.total_calls || 0)}</td>
        <td>${Number(r.tokens_total || 0)}</td>
        <td>${Number(r.games_count || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function filterRows(rows, q) {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter(r => (r.username||'').toLowerCase().includes(s) || (r.email||'').toLowerCase().includes(s));
  }

  function toCSV(rows) {
    const headers = ['username','email','total_calls','tokens_total','games_count'];
    const lines = [headers.join(',')];
    (rows||[]).forEach(r => {
      lines.push([
        r.username || '',
        r.email || '',
        Number(r.total_calls || 0),
        Number(r.tokens_total || 0),
        Number(r.games_count || 0)
      ].map(v => String(v).replace(/"/g,'""')).map(v => /[",\n]/.test(v) ? `"${v}"` : v).join(','));
    });
    return lines.join('\n');
  }

  async function loadData(state) {
    const res = await fetch(`${window.API_BASE}/api/usage/all`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
    state.rows = data.results || [];
    applyFilter(state);
  }

  function applyFilter(state) {
    const q = (document.getElementById('searchBox')?.value || '').trim();
    const filtered = filterRows(state.rows, q);
    renderRows(filtered);
  }

  function bindUI(state) {
    const search = document.getElementById('searchBox');
    const refresh = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const resetBtn = document.getElementById('resetCallsBtn');
    if (search) search.addEventListener('input', () => applyFilter(state));
    if (refresh) refresh.addEventListener('click', () => loadData(state).catch(err => alert(err.message)));
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const q = (document.getElementById('searchBox')?.value || '').trim();
      const filtered = filterRows(state.rows || [], q);
      const csv = toCSV(filtered);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'usage.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      const who = prompt('Enter username to reset calls (or * for all):', '*');
      if (who === null) return;
      try {
        const res = await fetch(`${window.API_BASE}/api/admin/usage/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
          body: JSON.stringify({ username: who })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Reset failed');
        alert('Reset OK');
        loadData(state).catch(()=>{});
      } catch (e) {
        alert(e.message || 'Reset failed');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const auth = ensureAdmin();
    if (!auth) return;
    const state = { token: auth.token, rows: [] };
    bindUI(state);
    loadData(state).catch(err => alert(err.message));
  });
})();
