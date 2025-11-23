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
    const q = state.range === 'today' ? '?range=today' : '';
    const res = await fetch(`${window.API_BASE}/api/usage/all${q}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.status === 401) {
      try { localStorage.removeItem('token'); } catch(_) {}
      alert('Session expired or not authorized. Please log in as admin.');
      window.location.href = './gameplay.html';
      return;
    }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load');
    state.rows = data.results || [];
    applyFilter(state);
    await loadAPIStats(state);
  }

  async function loadAPIStats(state) {
    const res = await fetch(`${window.API_BASE}/api/admin/usage/stats`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.status === 401) {
      try { localStorage.removeItem('token'); } catch(_) {}
      alert('Session expired or not authorized. Please log in as admin.');
      window.location.href = './gameplay.html';
      return;
    }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load API stats');
    
    state.apiStats = data.stats || [];
    state.apiStatsPage = 0;
    state.apiStatsPageSize = 8;
    
    renderAPIStats(state);
  }

  function renderAPIStats(state) {
    const table = document.getElementById('apiStatsTable');
    if (!table) return;
    const tbody = table.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';

    const start = state.apiStatsPage * state.apiStatsPageSize;
    const end = start + state.apiStatsPageSize;
    const statsPage = state.apiStats.slice(start, end);

    statsPage.forEach((stat, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${stat.method || ''}</td>
        <td>${stat.endpoint || ''}</td>
        <td>${Number(stat.count || 0)}</td>
      `;
      tbody.appendChild(tr);
    });

    if (!table.querySelector('tbody')) {
      table.appendChild(tbody);
    }

    const pageNum = document.getElementById('apiStatsPageNum');
    if (pageNum) {
      pageNum.textContent = `Page ${state.apiStatsPage + 1} of ${Math.ceil(state.apiStats.length / state.apiStatsPageSize)}`;
    }

    const prevBtn = document.getElementById('apiStatsPrevBtn');
    if (prevBtn) {
      prevBtn.disabled = state.apiStatsPage === 0;
    }

    const nextBtn = document.getElementById('apiStatsNextBtn');
    if (nextBtn) {
      const lastPage = Math.ceil(state.apiStats.length / state.apiStatsPageSize) - 1;
      nextBtn.disabled = state.apiStatsPage >= lastPage;
    }
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
    const resetTodayBtn = document.getElementById('resetTodayBtn');
    const rangeSelect = document.getElementById('rangeSelect');
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
    if (resetTodayBtn) resetTodayBtn.addEventListener('click', async () => {
      const who = prompt('Enter username to reset TODAY calls (or * for all):', '*');
      if (who === null) return;
      try {
        const res = await fetch(`${window.API_BASE}/api/admin/usage/reset-today`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
          body: JSON.stringify({ username: who })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Reset today failed');
        alert('Reset today OK');
        loadData(state).catch(()=>{});
      } catch (e) {
        alert(e.message || 'Reset today failed');
      }
    });
    
    if (rangeSelect) rangeSelect.addEventListener('change', () => {
      state.range = rangeSelect.value === 'today' ? 'today' : 'all';
      loadData(state).catch(()=>{});
    });

    const apiStatsPrevBtn = document.getElementById('apiStatsPrevBtn');
    if (apiStatsPrevBtn) {
      apiStatsPrevBtn.addEventListener('click', () => {
        if (state.apiStatsPage > 0) {
          state.apiStatsPage--;
          renderAPIStats(state);
        }
      });
    }

    const apiStatsNextBtn = document.getElementById('apiStatsNextBtn');
    if (apiStatsNextBtn) {
      apiStatsNextBtn.addEventListener('click', () => {
        const lastPage = Math.ceil(state.apiStats.length / state.apiStatsPageSize) - 1;
        if (state.apiStatsPage < lastPage) {
          state.apiStatsPage++;
          renderAPIStats(state);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const auth = ensureAdmin();
    if (!auth) return;
    const state = { 
      token: auth.token, 
      rows: [], 
      apiStats: [],
      apiStatsPage: 0,
      apiStatsPageSize: 8
    };
    bindUI(state);
    loadData(state).catch(err => alert(err.message));
  });
})();
