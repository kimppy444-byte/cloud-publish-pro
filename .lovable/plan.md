This is a big batch (6 features). Shipping in 3 phases so each piece lands tested instead of all half-baked. Phases 1 & 2 land in this turn; Phase 3 is a follow-up.

## Phase 1 — Lands this turn (small/medium, high impact)

### 1. Compliance + safety notice on smart-link pages
- Add a permanent footer block on `UnlockYouTubePage` and `UnlockFacebookPage`:
  - "We do not host, promote, or condone adult, illegal, or harmful content."
  - DMCA / abuse contact email link.
  - Link to a new `/terms` page (legal disclaimer, ad-network notice, age 18+).
- Add `<meta name="rating" content="general">` and `robots noindex` on unlock pages so they don't get scraped into porn-link aggregators.
- Add `/terms` page with full disclaimer.

### 2. YouTube token auto-refresh + reconnect UI
- Add `check_token_health` action in `youtube-auth` that pings each stored channel, tries a refresh, and returns `{channelId, healthy, error}`.
- New `<TokenHealthBanner />` component, rendered in `AppLayout`. Polls every 10 min. Shows a red banner per broken channel with a "Reconnect <ChannelName>" button that runs the existing OAuth flow scoped to that channel.
- Replace the generic "Failed to fetch" toast in upload paths with "Channel X needs reconnect" + button.

### 3. Smart-link analytics (self-hosted layer)
- New edge function `s` (short-redirect): `GET /s/:code` looks up `short_urls.code`, increments `click_count`, 302-redirects to `original_url`. Also stores per-day clicks in a new `short_url_clicks` table (date, code, count) so we can chart.
- Update `url-shortener` to default to self-hosted (`{origin}/s/{code}`) for analytics, with spoo.me/da.gd as opt-in fallback flag.
- New `<SmartLinkAnalytics />` panel in Settings showing top 20 links by clicks + 7-day sparkline.

## Phase 2 — Lands this turn (medium)

### 4. Multi-OAuth-client pool per channel group
- Add column `youtube_tokens.client_id` (text, nullable). On `exchange_code`, persist the client_id that minted the token (refresh tokens are bound to the client that issued them anyway).
- `refreshToken()` now reads `row.client_id` and resolves its secret from `GOOGLE_CLIENT_PAIRS` instead of always using `DEFAULT_CLIENT_ID`. Falls back to default if null (legacy rows).
- This fixes the silent breakage where mass-upload across many channels hits a single client's quota — each channel now uses the client it was authorized under.
- Add a `rotate_client` action: re-issues the OAuth URL with a different `client_id` for users who want to manually re-bind a channel to a fresh client.

## Phase 3 — Follow-up turn (large, architectural)

### 5. Upload retry queue
- New table `upload_queue` (id, video_path, metadata, status, attempts, last_error, next_attempt_at, channel_token_id).
- On client upload failure, enqueue instead of failing. Edge function `process-upload-queue` (pg_cron every 2 min) retries with exponential backoff (1m → 5m → 30m, max 5 tries).
- UI in `/upload` shows a "Retry queue" widget with live status.

### 6. Service-worker upload
- Register `public/upload-sw.js`. When a YT upload starts, hand the file + resumable session URL to the SW via `postMessage`. SW continues PUTting chunks even after tab close, reporting progress via Background Sync / IndexedDB.
- Requires breaking down the current FFmpeg.wasm-in-tab flow: SW can't run wasm, so processing stays in-tab; only the final raw upload moves to SW.
- This is ~1 day of work alone; doing it properly in its own turn avoids breaking current uploads.

## Technical details

- New tables: `short_url_clicks(code, day, count)`, `upload_queue(...)`. Both auth-only via RLS.
- New column: `youtube_tokens.client_id text`.
- New edge functions: `s` (no JWT, public redirect), `process-upload-queue` (cron).
- New components: `TokenHealthBanner`, `SmartLinkAnalytics`, `RetryQueueWidget`.
- New page: `/terms`.
- Bumps to: `youtube-auth` (new actions), `url-shortener` (self-host default), `UnlockYouTubePage`, `UnlockFacebookPage`, `AppLayout`, `SettingsPage`.
- No breaking changes to existing flows.

After Phase 1+2 land you can mass-reconnect any broken channels, see which short links convert, and stop getting flagged for the popunder. Phase 3 (queue + SW) follows in next request.