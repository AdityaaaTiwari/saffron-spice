# Saffron & Spice — Google Sheets logging setup

This package writes the live menu catalog to a `Products` tab and selected website activity to an `ActivityLog` tab.

## Captured data
- `Products`: product ID/name/category/price/description/badge/image URL, active flag, last sync time. The list is refreshed from the website catalog (no duplicate rows each visit).
- `ActivityLog`: timestamp, event, session ID, authenticated user ID/email (after auth is integrated), page, product fields, quantity/prices/totals, reservation date/time/guest count, and a JSON detail field containing cart line items where relevant.
- Events: page views, category filters, product impressions, add-to-cart, quantity changes, cart open/close, checkout attempts (not confirmed orders), reservation requests, navigation/CTA interactions, and authentication hooks (signup/login success/failure/logout/profile update).

Passwords, OTPs, session/access/refresh tokens, payment-card numbers and CVVs are never collected by this logger. Use a clear privacy notice and restrict access to the Sheet.

## Setup
1. Open https://sheets.google.com and create a blank spreadsheet called `Saffron & Spice Activity Log`.
2. Copy the spreadsheet ID from its URL. It is the part between `/d/` and `/edit`.
3. In the Sheet, choose **Extensions → Apps Script**.
4. Replace the editor contents with `google-apps-script/Code.gs` from this package. Replace `PASTE_GOOGLE_SHEET_ID_HERE` with your spreadsheet ID, then Save.
5. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me**. Set access to **Anyone** for this demo, then Deploy and authorize it. Copy the deployed URL ending in `/exec`.
6. In the website `saffron-spice/script.js`, replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` in `SHEETS_WEB_APP_URL` with that `/exec` URL.
7. Push the updated `index.html`, `style.css` and `script.js` to GitHub. Vercel should redeploy. Open the website and check the Sheet: it should create/fill `Products` and `ActivityLog` after the first page load.

## Login data
The website exposes `window.SaffronTracker.trackAuthEvent(eventName, user)` for the authentication task. Call it only after the auth provider reports a result, for example:

```js
window.SaffronTracker.trackAuthEvent('login_success', { id: user.id, email: user.email });
window.SaffronTracker.trackAuthEvent('signup_success', { id: user.id, email: user.email });
window.SaffronTracker.trackAuthEvent('login_failure', { email: attemptedEmail });
window.SaffronTracker.trackAuthEvent('logout', { id: user.id, email: user.email });
```

No real login form/auth provider is included in this frontend package yet, so login events begin after Supabase Auth is wired into the website.

## Limitations/security
The Apps Script endpoint is public when deployed as “Anyone” and can be spammed by outsiders; field allowlists and sanitization reduce mistakes but do not provide robust authentication. This is a demo/prototype bridge. For production, send activity to a Supabase Edge Function/server-side endpoint with validation and rate limits rather than trusting a public client-side logger. `checkout_attempt` is not proof of a completed order; actual orders need a real checkout/backend event.
