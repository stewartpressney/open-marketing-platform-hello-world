// URLs for the tracking Edge Functions.
//
// Both live in the same Supabase project as the database, so their base is
// derived from VITE_SUPABASE_URL rather than configured separately.
// VITE_TRACKING_BASE_URL overrides it when the functions sit behind a custom
// domain — short links read better as go.example.com/r/ab3k9x than as a
// project-ref subdomain, and QR codes scan more reliably when the encoded
// string is short.

const FUNCTIONS_BASE =
  import.meta.env.VITE_TRACKING_BASE_URL?.replace(/\/$/, '') ??
  `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')}/functions/v1`;

/** The shareable short link for an approved application's tracking code. */
export function trackingUrl(code) {
  return `${FUNCTIONS_BASE}/r/${code}`;
}

/** Where the pixel posts its events. */
export const collectUrl = `${FUNCTIONS_BASE}/collect`;

/**
 * The install snippet shown in Account Settings.
 *
 * The inline stub queues any omp() calls the page makes before the async
 * script finishes loading, so a conversion firing early is never dropped.
 */
export function installSnippet(siteKey, origin = window.location.origin) {
  return `<!-- Open Marketing Platform -->
<script>window.omp=window.omp||function(){(window.omp.q=window.omp.q||[]).push(arguments)};</script>
<script src="${origin}/omp.js"
        data-site-key="${siteKey}"
        data-endpoint="${collectUrl}"
        async></script>`;
}

/** Conversion call the site owner adds to their thank-you page. */
export const CONVERSION_SNIPPET = `omp('convert', { value: 49 });`;
