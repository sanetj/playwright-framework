export const browserSensorScript = `(() => {
  if ((window).__intel) return;
  const q = [];
  let seq = 0;
  const emit = (type, payload = {}) => {
    const evt = { type, ts: Date.now(), href: location.href, payload, traceId: 't_' + (++seq) };
    q.push(evt);
    if (q.length > 1000) q.shift();
    window.__intelNodeHook__?.(evt);
  };
  window.__intel = { emit, queue: q, version: '1.0.0' };

  const ofetch = window.fetch;
  window.fetch = async (...args) => {
    const [input, init] = args;
    const method = (init && init.method) || 'GET';
    const url = typeof input === 'string' ? input : input.url;
    emit('fetch_request', { method, url });
    try {
      const res = await ofetch(...args);
      emit('fetch_response', { method, url, status: res.status });
      return res;
    } catch (error) {
      emit('runtime_exception', { source: 'fetch', message: String(error) });
      throw error;
    }
  };

  const ox = XMLHttpRequest.prototype.open;
  const os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) { this.__intel = { method, url }; return ox.call(this, method, url, ...rest); };
  XMLHttpRequest.prototype.send = function(body) {
    const meta = this.__intel || {};
    emit('xhr_request', { method: meta.method || 'GET', url: meta.url || '', bodySize: body ? String(body).length : 0 });
    this.addEventListener('load', () => emit('xhr_response', { method: meta.method || 'GET', url: meta.url || '', status: this.status }));
    return os.call(this, body);
  };

  const hp = history.pushState; history.pushState = function(...a){ const r = hp.apply(this,a); emit('route_transition',{kind:'pushState',to:location.href}); return r; };
  const hr = history.replaceState; history.replaceState = function(...a){ const r = hr.apply(this,a); emit('route_transition',{kind:'replaceState',to:location.href}); return r; };
  window.addEventListener('popstate', () => emit('route_transition', { kind: 'popstate', to: location.href }));

  const mo = new MutationObserver((muts) => emit('mutation', { count: muts.length, sample: muts.slice(0,3).map(m=>m.type) }));
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

  const wrapStore = (name) => {
    const s = window[name]; const set = s.setItem.bind(s); const get = s.getItem.bind(s);
    s.setItem = (k,v) => { emit('storage_access', { store: name, op: 'set', key: k }); return set(k,v); };
    s.getItem = (k) => { emit('storage_access', { store: name, op: 'get', key: k }); return get(k); };
  };
  wrapStore('localStorage'); wrapStore('sessionStorage');

  const opm = window.postMessage; window.postMessage = function(message,targetOrigin,...rest){ emit('postMessage', { targetOrigin, preview: String(message).slice(0,100) }); return opm.call(this,message,targetOrigin,...rest); };
  const OWS = window.WebSocket; window.WebSocket = function(url, protocols){ const ws = new OWS(url, protocols); emit('websocket_open', { url }); ws.addEventListener('message',(ev)=>emit('websocket_message',{url, size: String(ev.data).length})); return ws; };

  window.addEventListener('error', (e) => emit('runtime_exception', { message: e.message, source: 'window.onerror' }));
  window.addEventListener('unhandledrejection', (e) => emit('runtime_exception', { source: 'unhandledrejection', reason: String(e.reason) }));

  const cerr = console.error.bind(console);
  console.error = (...args) => { emit('console_error', { args: args.map(a => String(a).slice(0,120)) }); return cerr(...args); };

  document.addEventListener('click', (e) => { const t = e.target; emit('click', { tag: t?.tagName, id: t?.id, text: t?.textContent?.slice(0,80) }); }, true);
  document.addEventListener('input', (e) => { const t = e.target; emit('input', { tag: t?.tagName, name: t?.name, type: t?.type }); }, true);
  document.addEventListener('submit', (e) => { const f = e.target; emit('form_submit', { action: f?.action || location.href, method: f?.method || 'GET' }); }, true);
})();`;
