/**
 * Open Marketing Platform tracking pixel.
 *
 * Install on the destination site:
 *
 *   <script>window.omp=window.omp||function(){(window.omp.q=window.omp.q||[]).push(arguments)};</script>
 *   <script src="https://your-app-domain/omp.js"
 *           data-site-key="omp_xxxxxxxxxxxxxxxx"
 *           data-endpoint="https://your-project-ref.supabase.co/functions/v1/collect"
 *           async></script>
 *
 * A page view is recorded automatically. Record a lead on the thank-you page:
 *
 *   omp('convert', { value: 49 });
 *
 * One snippet covers every campaign — attribution comes from the `?omp=` code
 * on the inbound link, not from the snippet itself.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var siteKey = script.getAttribute('data-site-key');
  var endpoint = script.getAttribute('data-endpoint');
  if (!siteKey || !endpoint) return;

  // How long a click keeps earning credit for conversions on this site.
  var ATTRIBUTION_DAYS = Number(script.getAttribute('data-window-days')) || 30;
  var ATTRIBUTION_MS = ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000;

  var ATTR_KEY = 'omp_attribution';
  var VISITOR_KEY = 'omp_visitor';

  // All storage is wrapped: Safari private mode and cookie-blocking extensions
  // make localStorage throw rather than return null, and a tracking script must
  // never break the page it runs on.
  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* storage unavailable — degrade to per-page-view tracking */
    }
  }

  function visitorId() {
    var existing = read(VISITOR_KEY);
    if (existing) return existing;

    var generated = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    write(VISITOR_KEY, generated);
    return generated;
  }

  /**
   * The attribution code for this visitor.
   *
   * A `?omp=` parameter on the current URL always wins and refreshes the
   * window — the visitor just arrived through a tracked link. Otherwise fall
   * back to a stored code from an earlier visit, provided it hasn't expired.
   */
  function attributionCode() {
    var fromUrl = null;
    try {
      fromUrl = new URL(window.location.href).searchParams.get('omp');
    } catch (e) {
      /* older browser without URL support — stored code still works */
    }

    if (fromUrl) {
      write(ATTR_KEY, JSON.stringify({ code: fromUrl, ts: Date.now() }));
      return fromUrl;
    }

    var stored = read(ATTR_KEY);
    if (!stored) return null;

    try {
      var parsed = JSON.parse(stored);
      if (!parsed.code || Date.now() - parsed.ts > ATTRIBUTION_MS) return null;
      return parsed.code;
    } catch (e) {
      return null;
    }
  }

  function send(event, options) {
    var payload = JSON.stringify({
      site_key: siteKey,
      code: attributionCode(),
      event: event,
      value: options && options.value,
      visitor_id: visitorId(),
      url: window.location.href,
      referrer: document.referrer || null,
    });

    // sendBeacon survives the page unloading, which matters when a conversion
    // fires on a button that also navigates away.
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
        return;
      } catch (e) {
        /* fall through to fetch */
      }
    }

    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
        mode: 'cors',
      }).catch(function () {});
    } catch (e) {
      /* nothing more to try; never surface a tracking failure to the visitor */
    }
  }

  function omp(command, options) {
    if (command === 'view' || command === 'convert') send(command, options);
  }

  // Drain anything queued by the inline stub before this file finished loading.
  var queued = (window.omp && window.omp.q) || [];
  window.omp = omp;
  for (var i = 0; i < queued.length; i++) omp.apply(null, queued[i]);

  send('view');
})();
