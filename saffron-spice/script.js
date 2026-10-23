// Google Sheets logger: paste the deployed Google Apps Script /exec URL below.
const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw3UNw5BcEFAbY_Z9kN2L7qBhCWsJMfuKAKlJYn1KMIrN4rvhVJRzMQbAC5a6vAAz3uAw/exec';
const activitySessionId = (() => {
  const key = 'saffron_activity_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(key, id);
  }
  return id;
})();
let authenticatedUser = null;
function trackActivity(eventName, data = {}, user = authenticatedUser) {
  if (!SHEETS_WEB_APP_URL || SHEETS_WEB_APP_URL.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    // Keep the site functional until the Apps Script endpoint is configured.
    console.info('[Saffron activity preview]', eventName, data);
    return;
  }
  const payload = {
    event: eventName,
    sessionId: activitySessionId,
    page: `${location.pathname}${location.hash}`.slice(0, 300),
    user: user ? { id: user.id || '', email: user.email || '' } : {},
    data
  };
  // text/plain avoids a browser CORS preflight for Apps Script; response is intentionally not read.
  fetch(SHEETS_WEB_APP_URL, {
    method: 'POST', mode: 'no-cors', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload), keepalive: true
  }).catch(error => console.warn('Activity logging failed', error));
}

// Called by the authentication integration once a provider confirms an auth result.
window.SaffronTracker = {
  trackAuthEvent(eventName, user = {}) {
    const allowed = ['signup_success', 'login_success', 'login_failure', 'logout', 'profile_update'];
    if (!allowed.includes(eventName)) return;
    const safeUser = { id: user.id || '', email: user.email || '' };
    if (eventName === 'login_success' || eventName === 'signup_success' || eventName === 'profile_update') authenticatedUser = safeUser;
    if (eventName === 'logout' || eventName === 'login_failure') authenticatedUser = null;
    trackActivity(eventName, { result: eventName.endsWith('failure') ? 'failed' : 'success' }, safeUser);
  },
  trackActivity
};

const menuItems = [
  {id:1,name:'Smoky Paneer Tikka',category:'Starters',price:289,badge:'GUEST FAVOURITE',description:'Charred cottage cheese, warming spices, mint chutney.',image:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=850&q=85'},
  {id:2,name:'Signature Butter Paneer',category:'Mains',price:349,badge:'HOUSE SPECIAL',description:'Silky tomato gravy, soft paneer, a little bit of magic.',image:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=850&q=85'},
  {id:3,name:'Saffron Dum Biryani',category:'Mains',price:329,badge:'SLOW COOKED',description:'Fragrant basmati, whole spices, crispy fried onions.',image:'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=850&q=85'},
  {id:4,name:'Gulab Jamun',category:'Desserts',price:149,badge:'SWEET ENDING',description:'Warm milk dumplings, rose syrup, pistachio dust.',image:'https://images.unsplash.com/photo-1666190092159-3a5c3c0e2d8f?auto=format&fit=crop&w=850&q=85'},
  {id:5,name:'Masala Chai',category:'Drinks',price:89,badge:'BREWED WITH LOVE',description:'Slow-brewed tea, fresh ginger, cardamom and comfort.',image:'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=850&q=85'},
  {id:6,name:'Crispy Aloo Tikki',category:'Starters',price:199,badge:'A CLASSIC',description:'Golden potato patties, tangy chutneys, crunchy sev.',image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=850&q=85'}
];

// Activity logging uses the single configured tracker above.

const cart = new Map();
const foodGrid = document.getElementById('foodGrid');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const toast = document.getElementById('toast');
let toastTimer;

function money(value){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value); }
function renderMenu(category='All'){
  const visible = category === 'All' ? menuItems : menuItems.filter(item=>item.category===category);
  trackActivity('menu_filter', { category, itemCount: visible.length });
  visible.forEach(item => trackActivity('product_impression', { productId: item.id, productName: item.name, category: item.category, unitPrice: item.price }));
  foodGrid.innerHTML = visible.map(item=>`<article class="food-card"><div class="food-photo"><img src="${item.image}" alt="${item.name}" loading="lazy"><span class="food-badge">${item.badge}</span><button class="add-food" data-add="${item.id}" aria-label="Add ${item.name} to bag">+</button></div><div class="food-info"><div class="food-title-row"><h3>${item.name}</h3><span class="food-price">${money(item.price)}</span></div><p>${item.description}</p><div class="food-category">${item.category}</div></div></article>`).join('');
}
function showToast(message){ toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2300); }
function addToCart(id){const item=menuItems.find(i=>i.id===id);cart.set(id,(cart.get(id)||0)+1);renderCart();trackActivity('add_to_cart',{productId:item.id,productName:item.name,category:item.category,quantity:cart.get(id),unitPrice:item.price,total:item.price*cart.get(id)});showToast(`${item.name} added to your bag`);}
function changeQuantity(id,delta){const item=menuItems.find(i=>i.id===id);const next=(cart.get(id)||0)+delta;if(next<=0)cart.delete(id);else cart.set(id,next);renderCart();trackActivity('cart_quantity_change',{productId:item.id,productName:item.name,category:item.category,quantity:Math.max(0,next),unitPrice:item.price,total:item.price*Math.max(0,next)});}
function renderCart(){
  const count=[...cart.values()].reduce((sum,qty)=>sum+qty,0);const total=[...cart.entries()].reduce((sum,[id,qty])=>sum+menuItems.find(item=>item.id===id).price*qty,0);
  cartCount.textContent=count;cartTotal.textContent=money(total);
  if(!count){cartItems.innerHTML='<div class="empty-cart">Your bag is looking a little empty.<br><span>Let’s fix that with something delicious.</span></div>';return;}
  cartItems.innerHTML=[...cart.entries()].map(([id,qty])=>{const item=menuItems.find(i=>i.id===id);return `<div class="cart-item"><img src="${item.image}" alt=""><div><h4>${item.name}</h4><small>${money(item.price)} each</small><div class="quantity-controls"><button data-quantity="${id}" data-delta="-1" aria-label="Remove one ${item.name}">−</button><span>${qty}</span><button data-quantity="${id}" data-delta="1" aria-label="Add one ${item.name}">+</button></div></div><span class="cart-item-total">${money(item.price*qty)}</span></div>`;}).join('');
}
function openCart(){trackActivity('cart_open', { itemCount: [...cart.values()].reduce((a,b)=>a+b,0) });cartOverlay.classList.add('open');cartOverlay.setAttribute('aria-hidden','false');document.body.classList.add('cart-open');document.getElementById('closeCart').focus();}
function closeCart(){trackActivity('cart_close', { itemCount: [...cart.values()].reduce((a,b)=>a+b,0) });cartOverlay.classList.remove('open');cartOverlay.setAttribute('aria-hidden','true');document.body.classList.remove('cart-open');document.getElementById('openCart').focus();}

document.getElementById('filters').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;document.querySelectorAll('.filter').forEach(filter=>filter.classList.toggle('active',filter===button));renderMenu(button.dataset.category);});
foodGrid.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)addToCart(Number(button.dataset.add));});
cartItems.addEventListener('click',event=>{const button=event.target.closest('[data-quantity]');if(button)changeQuantity(Number(button.dataset.quantity),Number(button.dataset.delta));});
document.getElementById('openCart').addEventListener('click',openCart);
document.getElementById('closeCart').addEventListener('click',closeCart);
cartOverlay.addEventListener('click',event=>{if(event.target===cartOverlay)closeCart();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&cartOverlay.classList.contains('open'))closeCart();});
document.getElementById('checkoutButton').addEventListener('click',()=>{if(cart.size===0){showToast('Your bag is empty — pick a favourite first.');return;}const items=[...cart.entries()].map(([id,quantity])=>{const i=menuItems.find(x=>x.id===id);return {id:i.id,name:i.name,category:i.category,quantity,unitPrice:i.price,lineTotal:i.price*quantity};});const total=items.reduce((sum,i)=>sum+i.lineTotal,0);trackActivity('checkout_attempt',{items,itemCount:items.length,total});showToast('Checkout is a demo. Connect a payment service to accept orders.');});
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>{trackActivity('ui_interaction',{action:'scroll_cta',element:button.textContent.trim().slice(0,100),target:button.dataset.scroll});const target=document.querySelector(button.dataset.scroll);if(target)target.scrollIntoView({behavior:'smooth'});document.getElementById('navLinks').classList.remove('open');document.getElementById('menuToggle').setAttribute('aria-expanded','false');}));
const menuToggle=document.getElementById('menuToggle');menuToggle.addEventListener('click',()=>{const nav=document.getElementById('navLinks');const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
document.querySelectorAll('#navLinks a').forEach(link=>link.addEventListener('click',()=>{trackActivity('ui_interaction',{action:'navigation_link',element:link.textContent.trim().slice(0,100),target:link.getAttribute('href')});document.getElementById('navLinks').classList.remove('open');menuToggle.setAttribute('aria-expanded','false');}));
const dateInput=document.getElementById('bookingDate');const today=new Date();const localDate=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().split('T')[0];dateInput.min=localDate;
document.getElementById('reservationForm').addEventListener('submit',event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;const data=new FormData(event.currentTarget);trackActivity('reservation_request',{guestName:data.get('guestName'),guestPhone:data.get('guestPhone'),guestEmail:data.get('guestEmail'),bookingDate:data.get('bookingDate'),bookingTime:data.get('bookingTime'),guestCount:data.get('guestCount'),result:'demo_request'});const message=document.getElementById('formMessage');message.textContent=`Thanks, ${data.get('guestName')}! Your table request was captured in this demo. No confirmed booking has been made.`;message.classList.add('show');message.scrollIntoView({behavior:'smooth',block:'nearest'});});
document.getElementById('year').textContent=new Date().getFullYear();

// Supabase Auth (publishable key is intended for browser use; never use a service-role key here).
const SUPABASE_URL = 'https://ohoksetlifocyfrwysax.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sjNPR8uXBWpE9K9xQSaPyA_wTWUNyFu';
let supabaseClient = null;
let authIsSignup = false;
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');
const authButton = document.getElementById('openAuth');
function showAuth() { authOverlay.classList.add('open'); authOverlay.setAttribute('aria-hidden','false'); }
function hideAuth() { authOverlay.classList.remove('open'); authOverlay.setAttribute('aria-hidden','true'); }
function setAuthMessage(message) { authMessage.textContent = message; }
function updateAuthUI(user) {
  authButton.textContent = user ? (user.email || 'Account') + ' · Log out' : 'Log in';
  if (typeof trackActivity === 'function') {
    if (user) { authenticatedUser = {id:user.id, email:user.email || ''}; trackActivity('login_success', {provider:'supabase'}, authenticatedUser); }
    else authenticatedUser = null;
  }
}
if (window.supabase && window.supabase.createClient) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  supabaseClient.auth.getSession().then(({data}) => updateAuthUI(data.session?.user || null));
  supabaseClient.auth.onAuthStateChange((_event, session) => updateAuthUI(session?.user || null));
}
document.getElementById('openAuth').addEventListener('click', async () => {
  if (!supabaseClient) { showAuth(); setAuthMessage('Auth library did not load. Refresh and try again.'); return; }
  const {data} = await supabaseClient.auth.getSession();
  if (data.session) {
    const {error} = await supabaseClient.auth.signOut();
    setAuthMessage(error ? error.message : 'You are logged out.');
    updateAuthUI(null);
    return;
  }
  authIsSignup = false;
  document.getElementById('authTitle').innerHTML = 'Your table, <em>your account.</em>';
  document.getElementById('authSubmit').textContent = 'Log in ↗';
  document.getElementById('authMode').textContent = 'New here? Create account';
  setAuthMessage('');
  showAuth();
});
document.getElementById('closeAuth').addEventListener('click', hideAuth);
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) hideAuth(); });
document.getElementById('authMode').addEventListener('click', () => {
  authIsSignup = !authIsSignup;
  document.getElementById('authTitle').innerHTML = authIsSignup ? 'Join our <em>table.</em>' : 'Your table, <em>your account.</em>';
  document.getElementById('authSubmit').textContent = authIsSignup ? 'Create account ↗' : 'Log in ↗';
  document.getElementById('authMode').textContent = authIsSignup ? 'Already have an account? Log in' : 'New here? Create account';
  document.getElementById('authPassword').autocomplete = authIsSignup ? 'new-password' : 'current-password';
  setAuthMessage('');
});
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabaseClient) { setAuthMessage('Supabase client is unavailable. Check your internet connection.'); return; }
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const submit = document.getElementById('authSubmit');
  submit.disabled = true;
  setAuthMessage(authIsSignup ? 'Creating account…' : 'Signing in…');
  try {
    const result = authIsSignup
      ? await supabaseClient.auth.signUp({email, password})
      : await supabaseClient.auth.signInWithPassword({email, password});
    if (result.error) throw result.error;
    if (authIsSignup && !result.data.session) setAuthMessage('Account created. Check your email to confirm, then log in.');
    else { setAuthMessage(authIsSignup ? 'Account created and signed in.' : 'Login successful.'); updateAuthUI(result.data.user || result.data.session?.user || null); setTimeout(hideAuth, 900); }
  } catch (err) { setAuthMessage(err.message || 'Authentication failed.'); }
  finally { submit.disabled = false; }
});


trackActivity('page_view', { title: document.title });
trackActivity('product_catalog_sync', { products: menuItems.map(({id,name,category,price,description,badge,image})=>({id,name,category,price,description,badge,image})) });
renderMenu();renderCart();
