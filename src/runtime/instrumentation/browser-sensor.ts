export const browserSensorScript = `(() => {
  if ((window).__intel) return;
  let seq = 0;
  const queue = [];
  const emit = (type, payload = {}, causeTraceId) => {
    const evt = { type, ts: Date.now(), href: location.href, payload, traceId: 'tr_' + (++seq), causeTraceId };
    queue.push(evt); if (queue.length > 2000) queue.shift();
    window.__intelNodeHook__?.(evt);
  };
  window.__intel = { emit, queue, version: '2.1.0' };

  let mutationBuffer = [];
  let mutationFlushTimer = null;
  const flushMutations = () => {
    if (!mutationBuffer.length) return;
    const payload = { count: mutationBuffer.length, sample: mutationBuffer.slice(0, 12) };
    mutationBuffer = [];
    emit('mutation', payload);
  };

  const recordMutation = (muts) => {
    for (const m of muts) mutationBuffer.push({ t: m.type, n: m.target?.nodeName || 'UNK' });
    if (mutationBuffer.length >= 50) return flushMutations();
    if (mutationFlushTimer) return;
    mutationFlushTimer = setTimeout(() => { mutationFlushTimer = null; flushMutations(); }, 75);
  };

  const wrap = (obj, key, fn) => { const orig = obj[key]; obj[key] = fn(orig); };
  wrap(window, 'fetch', (orig) => async (...args) => {
    const [input, init] = args; const method = (init && init.method) || 'GET'; const url = typeof input === 'string' ? input : input.url; const start='tr_'+(seq+1);
    emit('fetch_request', { method, url }, undefined);
    try { const res = await orig(...args); emit('fetch_response', { method, url, status: res.status }, start); return res; }
    catch (e) { emit('runtime_exception', { source: 'fetch', message: String(e) }, start); throw e; }
  });

  const xo = XMLHttpRequest.prototype.open; const xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) { this.__intelMeta = { method, url }; return xo.call(this, method, url, ...rest); };
  XMLHttpRequest.prototype.send = function(body) { const m = this.__intelMeta || {}; const tr='tr_'+(seq+1); emit('xhr_request', { method:m.method||'GET', url:m.url||'', bodySize: body?String(body).length:0 }); this.addEventListener('load',()=>emit('xhr_response',{ method:m.method||'GET', url:m.url||'', status:this.status }, tr)); return xs.call(this, body); };

  ['pushState','replaceState'].forEach((name) => { const o = history[name]; history[name] = function(...a){ const r = o.apply(this, a); emit('route_transition',{kind:name,to:location.href}); return r; }; });
  window.addEventListener('popstate', () => emit('route_transition',{kind:'popstate',to:location.href}));
  window.addEventListener('hashchange', () => emit('route_transition',{kind:'hashchange',to:location.href}));

  const mo = new MutationObserver(recordMutation);
  mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true });

  ['localStorage','sessionStorage'].forEach((n) => {
    const s = window[n]; const set=s.setItem.bind(s); const get=s.getItem.bind(s); const rem=s.removeItem.bind(s);
    s.setItem=(k,v)=>{ emit('storage_access',{store:n,op:'set',key:k,size:String(v).length}); return set(k,v); };
    s.getItem=(k)=>{ emit('storage_access',{store:n,op:'get',key:k}); return get(k); };
    s.removeItem=(k)=>{ emit('storage_access',{store:n,op:'remove',key:k}); return rem(k); };
  });

  const idbOpen = indexedDB.open.bind(indexedDB); indexedDB.open = function(name, version){ emit('indexeddb_access',{op:'open',name,version}); return idbOpen(name, version); };
  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cookieDesc && cookieDesc.set && cookieDesc.get) Object.defineProperty(document, 'cookie', { configurable: true, get() { return cookieDesc.get.call(document); }, set(v) { emit('cookie_mutation', { preview: String(v).slice(0, 120) }); return cookieDesc.set.call(document, v); } });

  const oPM = window.postMessage.bind(window); window.postMessage = (message, targetOrigin, ...rest) => { emit('postMessage',{targetOrigin,preview:String(message).slice(0,80)}); return oPM(message,targetOrigin,...rest); };
  const OWS = window.WebSocket; window.WebSocket = function(url, protocols){ const ws = new OWS(url, protocols); emit('websocket_open',{url}); ws.addEventListener('message',(ev)=>emit('websocket_message',{url,size:String(ev.data).length})); return ws; };
  const OES = window.EventSource; if (OES) window.EventSource = function(url, config){ const es = new OES(url, config); emit('eventsource_open',{url}); es.addEventListener('message',(ev)=>emit('eventsource_message',{url,size:String(ev.data).length})); return es; };

  const addEvt = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options){ if (['click','submit','change','input'].includes(String(type))) emit('event_listener',{type,target:(this && this.constructor && this.constructor.name) || 'unknown'}); return addEvt.call(this, type, listener, options); };

  document.addEventListener('submit', (e) => { const f=e.target; emit('form_submit',{action:f?.action||location.href,method:f?.method||'GET'}); }, true);
  document.addEventListener('change', (e) => { const t=e.target; if (t?.type === 'file') emit('file_upload',{name:t?.name||'',count:t?.files?.length||0}); }, true);
  window.addEventListener('securitypolicyviolation', (e) => emit('csp_violation',{directive:e.violatedDirective,blocked:e.blockedURI||''}));
  window.addEventListener('error', (e) => emit('runtime_exception',{message:e.message,source:'error'}));
  window.addEventListener('unhandledrejection', (e) => emit('runtime_exception',{message:String(e.reason),source:'unhandledrejection'}));
  const cErr = console.error.bind(console); console.error = (...args) => { emit('console_error',{args:args.map(a=>String(a).slice(0,120))}); return cErr(...args); };
})();`;
