import React, { useState, useCallback, useRef } from 'react';

const API = '';   // same origin via proxy

// ── helpers ──────────────────────────────────────────────────────────────────
const wkNum = s => { const m = s && s.match(/WEEK-(\d+)/i); return m ? +m[1] : 0; };
const fmt   = n => Number(n).toLocaleString('en-IN');
const fmtInj= n => Number(n).toFixed(2);

// ── styles object (CSS-in-JS) ─────────────────────────────────────────────────
const S = {
  layout:    { display:'grid', gridTemplateColumns:'320px 1fr', gridTemplateRows:'70px 1fr', height:'100vh', border:'none', overflow:'hidden', background:'transparent' },
  // Topbar
  topbar:    { gridColumn:'1/-1', display:'flex', alignItems:'center', padding:'0 32px', borderBottom:'1px solid var(--border)', background:'rgba(7, 9, 12, 0.75)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', gap:16, position:'relative', zIndex:10, boxShadow:'0 4px 30px rgba(0,0,0,0.1)' },
  logoIcon:  { width:36, height:36, background:'#ff6b00', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 20px rgba(255,107,0,0.4)' },
  logoText:  { fontFamily:'"DM Sans",sans-serif', fontWeight:800, fontSize:18, letterSpacing:-0.5, color:'var(--text)' },
  logoSub:   { fontSize:11, color:'var(--text2)', letterSpacing:0.5 },
  divider:   { width:1, height:24, background:'var(--border2)', margin:'0 8px' },
  badge:     { fontSize:11, padding:'4px 12px', borderRadius:99, background:'var(--accent-dim)', color:'var(--accent)', fontWeight:600, border:'1px solid var(--accent-glow)' },
  tstat:     { display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:99, fontSize:12, backdropFilter:'blur(8px)' },
  tstatV:    { fontWeight:600, color:'var(--accent)', fontFamily:'"DM Sans",sans-serif', fontSize:14 },
  tstatL:    { color:'var(--text2)' },
  // Sidebar
  sidebar:   { background:'rgba(13, 17, 23, 0.65)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'4px 0 24px rgba(0,0,0,0.2)' },
  // Drop zone
  dropZone:  (drag) => ({ border:`1.5px dashed ${drag?'var(--accent)':'var(--border2)'}`, borderRadius:16, padding:'28px 20px', textAlign:'center', cursor:'pointer', background: drag?'var(--accent-dim)':'var(--surface)', margin:20, transition:'all .3s ease', boxShadow: drag ? '0 0 20px var(--accent-glow)' : 'none' }),
  dzIcon:    { width:48, height:48, margin:'0 auto 12px', background:'var(--accent-glow)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)' },
  dzTitle:   { fontSize:14, fontWeight:700, fontFamily:'"DM Sans",sans-serif', marginBottom:4, color:'var(--text)' },
  dzSub:     { fontSize:12, color:'var(--text2)' },
  // Progress
  progWrap:  { padding:'0 20px 16px', flexShrink:0 },
  progTrack: { height:4, background:'var(--bg4)', borderRadius:99, overflow:'hidden', marginBottom:8 },
  progFill:  (p) => ({ height:'100%', width:p+'%', background:'linear-gradient(90deg, var(--accent2), var(--accent))', transition:'width .4s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius:99, boxShadow:'0 0 10px var(--accent)' }),
  progLabel: { fontSize:11, color:'var(--text2)', fontWeight:500 },
  // Panel
  panelHdr:  { padding:'16px 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  panelLbl:  { fontSize:11, fontWeight:800, letterSpacing:1.5, color:'var(--text3)', textTransform:'uppercase' },
  panelActs: { display:'flex', gap:6 },
  microBtn:  { fontSize:10, padding:'4px 10px', border:'1px solid var(--border2)', borderRadius:6, cursor:'pointer', background:'var(--surface)', color:'var(--text2)', fontFamily:'"DM Sans",sans-serif', transition:'all .2s', fontWeight:600 },
  searchWrap:{ position:'relative', padding:'0 20px 12px' },
  searchInp: { width:'100%', padding:'10px 14px 10px 36px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:13, fontFamily:'"DM Sans",sans-serif', outline:'none', transition:'border-color 0.2s' },
  searchIcon:{ position:'absolute', left:34, top:'calc(50% - 6px)', transform:'translateY(-50%)', opacity:.5, pointerEvents:'none', color:'var(--text2)' },
  qcaList:   { flex:1, overflowY:'auto', padding:'0 12px 12px' },
  qcaItem:   (sel) => ({ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, cursor:'pointer', background: sel?'var(--accent-dim)':'transparent', marginBottom:2, transition:'all .2s ease' }),
  qcaCb:     (sel) => ({ width:16, height:16, border:`1.5px solid ${sel?'var(--accent)':'var(--border2)'}`, borderRadius:5, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: sel?'var(--accent)':'transparent', transition:'all .2s ease', boxShadow: sel ? '0 0 10px var(--accent-glow)' : 'none' }),
  qcaName:   (sel) => ({ fontSize:13, color: sel?'var(--text)':'var(--text2)', flex:1, lineHeight:1.4, fontWeight: sel ? 500 : 400 }),
  qcaCount:  (sel) => ({ fontSize:10, color: sel?'var(--accent)':'var(--text3)', background: sel?'var(--accent-glow)':'var(--surface2)', padding:'2px 8px', borderRadius:99, flexShrink:0, fontFamily:'"DM Sans",sans-serif', fontWeight:600 }),
  // Footer
  sideFooter:{ padding:'16px 20px', borderTop:'1px solid var(--border)', flexShrink:0, display:'flex', gap:12, alignItems:'center', background:'rgba(13, 17, 23, 0.8)' },
  selCount:  { fontSize:12, color:'var(--text2)', flex:1 },
  exportBtn: (dis) => ({ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'8px 16px', background: dis?'var(--surface2)':'linear-gradient(135deg, var(--accent), var(--accent2))', color: dis?'var(--text3)':'#000', border:'none', borderRadius:8, fontSize:12, fontWeight:800, fontFamily:'"DM Sans",sans-serif', cursor: dis?'not-allowed':'pointer', transition:'all .3s ease', flexShrink:0, width:'auto', boxShadow: dis ? 'none' : '0 4px 15px var(--accent-glow)' }),
  // Main
  main:      { display:'flex', flexDirection:'column', overflow:'hidden', background:'transparent' },
  filterBar: { padding:'12px 32px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', minHeight:52, flexShrink:0, background:'rgba(7, 9, 12, 0.4)', backdropFilter:'blur(10px)' },
  filterLbl: { fontSize:12, color:'var(--text2)', flexShrink:0, fontWeight:500 },
  fpill:     { display:'flex', alignItems:'center', gap:6, padding:'4px 10px 4px 14px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:99, fontSize:12, color:'var(--text2)', fontWeight:500, boxShadow:'0 2px 8px rgba(0,0,0,0.1)' },
  fpillRm:   { cursor:'pointer', opacity:.6, display:'flex', alignItems:'center', transition:'opacity .2s' },
  content:   { flex:1, overflowY:'auto', padding:32 },
  // Empty
  emptyWrap: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:20, padding:60 },
  emptyIcon: { width:88, height:88, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.2)' },
  emptyTitle:{ fontFamily:'"DM Sans",sans-serif', fontSize:22, fontWeight:800, color:'var(--text)' },
  emptySub:  { fontSize:14, color:'var(--text2)', textAlign:'center', lineHeight:1.8, maxWidth:380 },
  // Entity blocks
  entityBlock:{ marginBottom:32, background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 10px 40px rgba(0,0,0,0.2)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', overflow:'hidden' },
  entityHdr: { display:'flex', alignItems:'flex-start', gap:16, padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' },
  entityAccent:{ width:4, minHeight:36, background:'var(--accent)', borderRadius:4, flexShrink:0, alignSelf:'stretch', boxShadow:'0 0 10px var(--accent-glow)' },
  entityTitle:{ fontFamily:'"DM Sans",sans-serif', fontSize:15, fontWeight:800, letterSpacing:-0.2, lineHeight:1.4, color:'var(--text)' },
  entityMeta:{ display:'flex', alignItems:'center', gap:10, marginTop:6, flexWrap:'wrap' },
  metaQca:   { fontSize:11, padding:'3px 10px', borderRadius:99, fontWeight:600, background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid var(--accent-glow)' },
  metaWeeks: { fontSize:11, padding:'3px 10px', borderRadius:99, fontWeight:600, background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border2)' },
  entityNums:{ marginLeft:'auto', display:'flex', gap:24, textAlign:'right', flexShrink:0 },
  enumItem:  { display:'flex', flexDirection:'column' },
  enumVal:   { fontFamily:'"DM Sans",sans-serif', fontSize:16, fontWeight:600, color:'var(--accent)' },
  enumLbl:   { fontSize:10, color:'var(--text3)', letterSpacing:1, marginTop:2, fontWeight:700 },
  tableWrap: { background:'rgba(0,0,0,0.2)' },
  // Table
  th:        { padding:'12px 18px', background:'rgba(0,0,0,0.2)', color:'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', textAlign:'left', borderBottom:'1px solid var(--border)' },
  thNum:     { padding:'12px 18px', background:'rgba(0,0,0,0.2)', color:'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', textAlign:'right', borderBottom:'1px solid var(--border)' },
  td:        { padding:'10px 18px', borderBottom:'1px solid var(--border)', color:'var(--text2)', fontFamily:'"DM Sans",sans-serif', fontSize:13 },
  tdLabel:   { padding:'10px 18px', borderBottom:'1px solid var(--border)', color:'var(--text2)', fontFamily:'"DM Sans",sans-serif', fontSize:13 },
  tdNum:     { padding:'10px 18px', borderBottom:'1px solid var(--border)', color:'var(--text2)', fontFamily:'"DM Sans",sans-serif', fontSize:13, textAlign:'right' },
  tdTot:     { padding:'12px 18px', color:'var(--accent)', fontWeight:600, fontFamily:'"DM Sans",sans-serif', fontSize:13, background:'var(--accent-dim)', borderTop:'1px solid var(--accent-glow)', borderBottom:'none' },
  tdTotLabel:{ padding:'12px 18px', color:'var(--accent)', fontWeight:700, fontFamily:'"DM Sans",sans-serif', fontSize:12, letterSpacing:1, background:'var(--accent-dim)', borderTop:'1px solid var(--accent-glow)', borderBottom:'none' },
  tdTotNum:  { padding:'12px 18px', color:'var(--accent)', fontWeight:600, fontFamily:'"DM Sans",sans-serif', fontSize:13, textAlign:'right', background:'var(--accent-dim)', borderTop:'1px solid var(--accent-glow)', borderBottom:'none' },
};

// ── QCA Item ──────────────────────────────────────────────────────────────────
function QcaItem({ name, count, selected, onToggle }) {
  return (
    <div style={S.qcaItem(selected)} onClick={onToggle}>
      <div style={S.qcaCb(selected)}>
        {selected && <i className="ti ti-check" style={{ fontSize:9, color:'#000', fontWeight:700 }} />}
      </div>
      <span style={S.qcaName(selected)}>{name}</span>
      <span style={S.qcaCount(selected)}>{count}</span>
    </div>
  );
}

// ── Entity Block ──────────────────────────────────────────────────────────────
function EntityBlock({ plant, qca, rows }) {
  const sorted  = [...rows].sort((a, b) => wkNum(a.weekNo) - wkNum(b.weekNo));
  const totInj  = rows.reduce((s, r) => s + r.inj, 0);
  const totDsm  = rows.reduce((s, r) => s + r.dsm, 0);
  const wkCount = new Set(rows.map(r => r.weekNo)).size;

  return (
    <div style={S.entityBlock}>
      <div style={S.entityHdr}>
        <div style={S.entityAccent} />
        <div style={{ flex:1 }}>
          <div style={S.entityTitle}>{plant}</div>
          <div style={S.entityMeta}>
            <span style={S.metaQca}>{qca}</span>
            <span style={S.metaWeeks}>{wkCount} week{wkCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={S.entityNums}>
          <div style={S.enumItem}>
            <div style={S.enumVal}>{fmtInj(totInj)}</div>
            <div style={S.enumLbl}>INJECTION AG</div>
          </div>
          <div style={S.enumItem}>
            <div style={S.enumVal}>₹{fmt(Math.round(totDsm))}</div>
            <div style={S.enumLbl}>DSM TOTAL</div>
          </div>
        </div>
      </div>
      <div style={S.tableWrap}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={S.th}>Week No.</th>
              <th style={S.thNum}>SR No.</th>
              <th style={S.thNum}>Injection AG</th>
              <th style={S.thNum}>DSM (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i}>
                <td style={S.tdLabel}>{r.weekNo}</td>
                <td style={{ ...S.tdNum, color:'#4a5568', fontSize:11 }}>{r.scode}</td>
                <td style={S.tdNum}>{fmtInj(r.inj)}</td>
                <td style={S.tdNum}>{fmt(Math.round(r.dsm))}</td>
              </tr>
            ))}
            <tr>
              <td style={S.tdTotLabel}>TOTAL</td>
              <td style={S.tdTot}></td>
              <td style={S.tdTotNum}>{fmtInj(totInj)}</td>
              <td style={S.tdTotNum}>₹{fmt(Math.round(totDsm))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, show }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, padding:'10px 18px', background:'#252b35', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, fontSize:13, zIndex:999, display:'flex', alignItems:'center', gap:8, transform: show?'translateY(0)':'translateY(12px)', opacity: show?1:0, transition:'all .25s', pointerEvents:'none' }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:'#00e5a0', flexShrink:0 }} />
      {msg}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [allData,      setAllData]      = useState([]);
  const [allQCAs,      setAllQCAs]      = useState([]);
  const [selectedQCAs, setSelectedQCAs] = useState(new Set());
  const [qcaFilter,    setQcaFilter]    = useState('');
  const [selectedPlants, setSelectedPlants] = useState(new Set());
  const [plantFilter,  setPlantFilter]  = useState('');
  const [progress,     setProgress]     = useState(0);
  const [progLabel,    setProgLabel]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [drag,         setDrag]         = useState(false);
  const [toast,        setToast]        = useState({ msg:'', show:false });
  const [filesLoaded,  setFilesLoaded]  = useState(0);
  const fileRef = useRef();

  const showToast = (msg) => {
    setToast({ msg, show:true });
    setTimeout(() => setToast(t => ({ ...t, show:false })), 2800);
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    const pdfs = [...files].filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;

    setLoading(true);
    setProgress(5);
    setProgLabel(`Uploading ${pdfs.length} file(s)…`);

    const fd = new FormData();
    pdfs.forEach(f => fd.append('pdfs', f));
    
    // Generate a unique Job ID for progress tracking
    const jobId = Math.random().toString(36).substring(2, 15);
    fd.append('jobId', jobId);

    // Setup Progress Polling
    const startTime = Date.now();
    let pollInterval = null;

    try {
      setProgress(10);
      setProgLabel('Parsing PDFs on server…');
      
      // Start polling after 1.5 seconds (give upload some time)
      setTimeout(() => {
        pollInterval = setInterval(async () => {
          try {
            const pres = await fetch(`${API}/api/progress/${jobId}`);
            if (!pres.ok) return;
            const pdata = await pres.json();
            
            if (pdata.progress > 0 && pdata.progress < 100) {
              const pct = pdata.progress;
              const elapsedSec = (Date.now() - startTime) / 1000;
              const estimatedTotal = elapsedSec / (pct / 100);
              const remainingSec = Math.max(0, estimatedTotal - elapsedSec);
              
              let etaStr = `${Math.round(remainingSec)}s`;
              if (remainingSec > 60) {
                etaStr = `${Math.floor(remainingSec / 60)}m ${Math.round(remainingSec % 60)}s`;
              }
              
              setProgress(10 + (pct * 0.8)); // map 0-100 to 10-90 on UI
              setProgLabel(`Parsing PDFs… ${pct.toFixed(1)}% (ETA: ${etaStr})`);
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 500);
      }, 1500);

      const res  = await fetch(`${API}/api/upload`, { method:'POST', body: fd });
      clearInterval(pollInterval);
      
      const json = await res.json();

      setProgress(90);
      setProgLabel('Building entity list…');

      if (!json.ok) throw new Error(json.error || 'Server error');

      const merged = [...allData, ...json.data];
      setAllData(merged);
      setFilesLoaded(n => n + pdfs.length);

      // Rebuild QCA list
      const qcaSet = [...new Set(merged.map(r => r.qca))].sort();
      setAllQCAs(qcaSet);
      setSelectedQCAs(new Set(qcaSet));

      const plantSet = [...new Set(merged.map(r => r.plant))].sort();
      setSelectedPlants(new Set(plantSet));

      setProgress(100);
      setProgLabel('Done');
      setTimeout(() => { setLoading(false); setProgress(0); }, 1200);
      showToast(`${pdfs.length} file(s) loaded · ${json.count} entities`);
      if (json.errors?.length) console.warn('Parse errors:', json.errors);
    } catch (e) {
      if (pollInterval) clearInterval(pollInterval);
      setLoading(false);
      setProgress(0);
      showToast('Error: ' + e.message);
    }
  }, [allData]);

  const onDrop = e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const filtered = allData.filter(r => selectedQCAs.has(r.qca) && selectedPlants.has(r.plant));
    if (!filtered.length) return;

    // Group by plant
    const byPlant = {};
    for (const r of filtered) {
      if (!byPlant[r.plant]) byPlant[r.plant] = { plant:r.plant, qca:r.qca, rows:[] };
      byPlant[r.plant].rows.push(r);
    }
    const groups = Object.values(byPlant).sort((a,b) => a.plant.localeCompare(b.plant));

    setExporting(true);
    try {
      const res = await fetch(`${API}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ groups }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'DSM_Extracted.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${groups.length} entities`);
    } catch (e) {
      showToast('Export error: ' + e.message);
    }
    setExporting(false);
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const filtered  = allData.filter(r => selectedQCAs.has(r.qca) && selectedPlants.has(r.plant));
  
  const availablePlants = [...new Set(allData.filter(r => selectedQCAs.has(r.qca)).map(r => r.plant))].sort();
  const visiblePlants = availablePlants.filter(p => !plantFilter || p.toLowerCase().includes(plantFilter.toLowerCase()));

  const togglePlant = (name) => {
    setSelectedPlants(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const byPlant   = {};
  for (const r of filtered) {
    if (!byPlant[r.plant]) byPlant[r.plant] = { plant:r.plant, qca:r.qca, rows:[] };
    byPlant[r.plant].rows.push(r);
  }
  const plants    = Object.keys(byPlant).sort();
  const totInj    = filtered.reduce((s,r) => s+r.inj, 0);
  const totDsm    = filtered.reduce((s,r) => s+r.dsm, 0);
  const weeks     = new Set(allData.map(r=>r.weekNo)).size;

  const visibleQCAs = allQCAs.filter(q => !qcaFilter || q.toLowerCase().includes(qcaFilter.toLowerCase()));

  const toggleQCA = (name) => {
    setSelectedQCAs(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const canExport = plants.length > 0 && !exporting;

  return (
    <div style={S.layout}>

      {/* ── TOPBAR ── */}
      <header style={S.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={S.logoIcon}>
            <i className="ti ti-bolt" style={{ fontSize:18, color:'#000' }} />
          </div>
          <div>
            <div style={S.logoText}>Injection DSM Extractor</div>
            <div style={S.logoSub}>SLDC Gujarat · Intra Solar</div>
          </div>
        </div>
        <div style={S.divider} />
        <div style={S.badge}>Intra Solar · PMKC</div>

        {allData.length > 0 && (
          <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
            {[
              [filesLoaded, 'files'],
              [new Set(allData.map(r=>r.plant)).size, 'entities'],
              [weeks, 'weeks'],
              [fmtInj(totInj), 'inj. AG'],
              ['₹'+fmt(Math.round(totDsm)), 'DSM'],
            ].map(([v,l]) => (
              <div key={l} style={S.tstat}>
                <span style={S.tstatV}>{v}</span>
                <span style={S.tstatL}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>

        {/* Drop zone */}
        <div
          style={S.dropZone(drag)}
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div style={S.dzIcon}>
            <i className="ti ti-file-upload" style={{ fontSize:22, color:'var(--accent)' }} />
          </div>
          <div style={S.dzTitle}>Upload Week PDFs</div>
          <div style={S.dzSub}>Drop files or click · Multiple supported</div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:'none' }} onChange={e => handleFiles(e.target.files)} />

        {/* Progress */}
        {loading && (
          <div style={S.progWrap}>
            <div style={S.progTrack}><div style={S.progFill(progress)} /></div>
            <div style={S.progLabel}>{progLabel}</div>
          </div>
        )}

        {/* QCA filter header */}
        <div style={S.panelHdr}>
          <div style={S.panelLbl}>Filter by QCA</div>
          <div style={S.panelActs}>
            <button style={S.microBtn} onClick={() => setSelectedQCAs(new Set(allQCAs))}>All</button>
            <button style={S.microBtn} onClick={() => setSelectedQCAs(new Set())}>None</button>
          </div>
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <i className="ti ti-search" style={{ ...S.searchIcon, top:'calc(50% - 4px)' }} />
          <input
            type="text"
            style={S.searchInp}
            placeholder="Search QCA names…"
            value={qcaFilter}
            onChange={e => setQcaFilter(e.target.value)}
          />
        </div>

        {/* QCA list */}
        <div style={{ ...S.qcaList, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {visibleQCAs.map(q => {
            const count = new Set(allData.filter(r=>r.qca===q).map(r=>r.plant)).size;
            return (
              <QcaItem key={q} name={q} count={count} selected={selectedQCAs.has(q)} onToggle={() => toggleQCA(q)} />
            );
          })}
          {allQCAs.length === 0 && (
            <div style={{ padding:'20px 8px', textAlign:'center', fontSize:12, color:'#4a5568' }}>Upload PDFs to see QCA list</div>
          )}
        </div>

        {/* Plant filter header */}
        <div style={{ ...S.panelHdr, borderTop: 'none', paddingTop: 8 }}>
          <div style={S.panelLbl}>Filter by Plant</div>
          <div style={S.panelActs}>
            <button style={S.microBtn} onClick={() => {
               const next = new Set(selectedPlants);
               availablePlants.forEach(p => next.add(p));
               setSelectedPlants(next);
            }}>All</button>
            <button style={S.microBtn} onClick={() => {
               const next = new Set(selectedPlants);
               availablePlants.forEach(p => next.delete(p));
               setSelectedPlants(next);
            }}>None</button>
          </div>
        </div>

        {/* Plant Search */}
        <div style={S.searchWrap}>
          <i className="ti ti-search" style={{ ...S.searchIcon, top:'calc(50% - 4px)' }} />
          <input
            type="text"
            style={S.searchInp}
            placeholder="Search Plant names…"
            value={plantFilter}
            onChange={e => setPlantFilter(e.target.value)}
          />
        </div>

        {/* Plant list */}
        <div style={S.qcaList}>
          {visiblePlants.map(p => {
            const wkCount = new Set(allData.filter(r => r.plant === p).map(r => r.weekNo)).size;
            return (
              <QcaItem key={p} name={p} count={wkCount} selected={selectedPlants.has(p)} onToggle={() => togglePlant(p)} />
            );
          })}
          {availablePlants.length === 0 && allQCAs.length > 0 && (
            <div style={{ padding:'20px 8px', textAlign:'center', fontSize:12, color:'#4a5568' }}>No plants found for selected QCAs</div>
          )}
        </div>

        {/* Footer */}
        <div style={S.sideFooter}>
          <div style={S.selCount}>
            <span style={{ color:'var(--accent)', fontWeight:600 }}>{selectedQCAs.size}</span> of {allQCAs.length} QCAs
          </div>
          <button style={S.exportBtn(!canExport)} onClick={handleExport} disabled={!canExport}>
            <i className="ti ti-download" style={{ fontSize:13 }} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>

      </aside>

      {/* ── MAIN ── */}
      <main style={S.main}>

        {/* Filter pills */}
        <div style={S.filterBar}>
          {allData.length === 0 ? (
            <span style={S.filterLbl}>No files loaded</span>
          ) : selectedQCAs.size === allQCAs.length ? (
            <span style={S.filterLbl}>Showing all {allQCAs.length} QCAs · {plants.length} plants</span>
          ) : (
            <>
              <span style={S.filterLbl}>{selectedQCAs.size} QCAs active</span>
              {[...selectedQCAs].slice(0,6).map(q => (
                <div key={q} style={S.fpill}>
                  {q.length > 28 ? q.slice(0,26)+'…' : q}
                  <span style={S.fpillRm} onClick={() => toggleQCA(q)}>
                    <i className="ti ti-x" style={{ fontSize:10 }} />
                  </span>
                </div>
              ))}
              {selectedQCAs.size > 6 && <div style={{ ...S.fpill, background:'transparent', color:'#4a5568' }}>+{selectedQCAs.size-6} more</div>}
            </>
          )}
        </div>

        {/* Content */}
        <div style={S.content}>
          {plants.length === 0 ? (
            <div style={S.emptyWrap}>
              <div style={S.emptyIcon}>
                <i className="ti ti-table-import" style={{ fontSize:32, color:'#4a5568' }} />
              </div>
              <div style={S.emptyTitle}>No Data Yet</div>
              <div style={S.emptySub}>Upload SLDC Gujarat week PDF files to extract Intra Solar DSM data. Select QCAs from the sidebar to filter results.</div>
            </div>
          ) : (
            plants.map(plant => (
              <EntityBlock key={plant} {...byPlant[plant]} />
            ))
          )}
        </div>

      </main>

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}
