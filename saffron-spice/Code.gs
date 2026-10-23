/** Saffron & Spice Google Sheets logger.
 * Writes product catalog to Products and user activity to ActivityLog.
 * Never collects passwords, OTPs, access/refresh tokens or payment-card data.
 */
const SHEET_ID = '1EWmxbMF5Z-s5Tz3J61Fhl1YOTLqUSkBivlKt4cqqiCc';
const ACTIVITY_TAB = 'ActivityLog';
const PRODUCTS_TAB = 'Products';
const ALLOWED_EVENTS = new Set([
  'page_view', 'menu_filter', 'product_impression', 'product_catalog_sync',
  'add_to_cart', 'cart_quantity_change', 'cart_open', 'cart_close',
  'checkout_attempt', 'reservation_request', 'ui_interaction',
  'signup_success', 'login_success', 'login_failure', 'logout', 'profile_update'
]);
const ACTIVITY_HEADERS = [
  'Timestamp (ISO UTC)', 'Event', 'Session ID', 'User ID', 'Email',
  'Page', 'Product ID', 'Product Name', 'Category', 'Quantity',
  'Unit Price (INR)', 'Total (INR)', 'Booking Date', 'Booking Time',
  'Guest Count', 'Reservation/Order ID', 'Details JSON'
];
const PRODUCT_HEADERS = [
  'Product ID', 'Product Name', 'Category', 'Price (INR)', 'Description',
  'Badge', 'Image URL', 'Active', 'Last Synced (ISO UTC)'
];

function doGet() {
  return ContentService.createTextOutput('Saffron & Spice activity logger is running.');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'Missing payload' });
    const payload = JSON.parse(e.postData.contents);
    const eventName = safeText_(payload.event, 50);
    if (!ALLOWED_EVENTS.has(eventName)) return json_({ ok: false, error: 'Event not allowed' });
    if (!SHEET_ID || SHEET_ID === 'PASTE_GOOGLE_SHEET_ID_HERE') return json_({ ok: false, error: 'Configure SHEET_ID in Apps Script' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      if (eventName === 'product_catalog_sync') {
        const count = syncProducts_(ss, payload.data && payload.data.products);
        return json_({ ok: true, productsSynced: count });
      }

      let sheet = ss.getSheetByName(ACTIVITY_TAB);
      if (!sheet) sheet = ss.insertSheet(ACTIVITY_TAB);
      ensureHeaders_(sheet, ACTIVITY_HEADERS);
      const p = payload.data || {};
      const user = payload.user || {};
      const items = Array.isArray(p.items) ? p.items.slice(0, 50).map(i => ({
        id: safeText_(i.id, 40), name: safeText_(i.name, 100),
        category: safeText_(i.category, 40), quantity: safeNumber_(i.quantity, 0, 1000),
        unitPrice: safeNumber_(i.unitPrice, 0, 1000000), lineTotal: safeNumber_(i.lineTotal, 0, 10000000)
      })) : [];
      const safeDetails = {
        action: safeText_(p.action, 80), element: safeText_(p.element, 100),
        target: safeText_(p.target, 200), title: safeText_(p.title, 200),
        itemCount: safeNumber_(p.itemCount, 0, 1000), items: items,
        category: safeText_(p.category, 50), result: safeText_(p.result, 40),
        guestName: safeText_(p.guestName, 80), guestEmail: safeText_(p.guestEmail, 254),
        guestPhone: safeText_(p.guestPhone, 30)
      };
      const first = items[0] || {};
      const row = [
        new Date().toISOString(), eventName, safeText_(payload.sessionId, 100),
        safeText_(user.id, 100), safeText_(user.email || p.guestEmail, 254),
        safeText_(payload.page, 300), safeText_(first.id || p.productId, 40),
        safeText_(first.name || p.productName, 100), safeText_(first.category || p.category, 50),
        safeNumber_(p.quantity != null ? p.quantity : first.quantity, 0, 1000),
        safeNumber_(p.unitPrice != null ? p.unitPrice : first.unitPrice, 0, 1000000),
        safeNumber_(p.total, 0, 10000000), safeText_(p.bookingDate, 20),
        safeText_(p.bookingTime, 30), safeText_(p.guestCount, 30),
        safeText_(p.referenceId, 100), JSON.stringify(safeDetails)
      ];
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Could not record event' });
  }
}

function syncProducts_(ss, products) {
  if (!Array.isArray(products)) throw new Error('products must be an array');
  const sheet = ss.getSheetByName(PRODUCTS_TAB) || ss.insertSheet(PRODUCTS_TAB);
  ensureHeaders_(sheet, PRODUCT_HEADERS);
  const now = new Date().toISOString();
  const rows = products.slice(0, 200).map(p => [
    safeText_(p.id, 40), safeText_(p.name, 100), safeText_(p.category, 50),
    safeNumber_(p.price, 0, 1000000), safeText_(p.description, 500),
    safeText_(p.badge, 80), safeText_(p.image, 1000), true, now
  ]);
  // Replace the catalog snapshot, rather than append duplicates on every page visit.
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, PRODUCT_HEADERS.length).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, PRODUCT_HEADERS.length).setValues(rows);
  return rows.length;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}
function safeText_(value, maxLen) {
  if (value === null || value === undefined) return '';
  let s = String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen || 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function safeNumber_(value, min, max) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : '';
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
