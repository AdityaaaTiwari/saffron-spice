const menuItems = [
  {id:1,name:'Smoky Paneer Tikka',category:'Starters',price:289,badge:'GUEST FAVOURITE',description:'Charred cottage cheese, warming spices, mint chutney.',image:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=850&q=85'},
  {id:2,name:'Signature Butter Paneer',category:'Mains',price:349,badge:'HOUSE SPECIAL',description:'Silky tomato gravy, soft paneer, a little bit of magic.',image:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=850&q=85'},
  {id:3,name:'Saffron Dum Biryani',category:'Mains',price:329,badge:'SLOW COOKED',description:'Fragrant basmati, whole spices, crispy fried onions.',image:'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=850&q=85'},
  {id:4,name:'Gulab Jamun',category:'Desserts',price:149,badge:'SWEET ENDING',description:'Warm milk dumplings, rose syrup, pistachio dust.',image:'https://images.unsplash.com/photo-1666190092159-3a5c3c0e2d8f?auto=format&fit=crop&w=850&q=85'},
  {id:5,name:'Masala Chai',category:'Drinks',price:89,badge:'BREWED WITH LOVE',description:'Slow-brewed tea, fresh ginger, cardamom and comfort.',image:'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=850&q=85'},
  {id:6,name:'Crispy Aloo Tikki',category:'Starters',price:199,badge:'A CLASSIC',description:'Golden potato patties, tangy chutneys, crunchy sev.',image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=850&q=85'}
];
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
  foodGrid.innerHTML = visible.map(item=>`<article class="food-card"><div class="food-photo"><img src="${item.image}" alt="${item.name}" loading="lazy"><span class="food-badge">${item.badge}</span><button class="add-food" data-add="${item.id}" aria-label="Add ${item.name} to bag">+</button></div><div class="food-info"><div class="food-title-row"><h3>${item.name}</h3><span class="food-price">${money(item.price)}</span></div><p>${item.description}</p><div class="food-category">${item.category}</div></div></article>`).join('');
}
function showToast(message){ toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2300); }
function addToCart(id){cart.set(id,(cart.get(id)||0)+1);renderCart();showToast(`${menuItems.find(i=>i.id===id).name} added to your bag`);}
function changeQuantity(id,delta){const next=(cart.get(id)||0)+delta;if(next<=0)cart.delete(id);else cart.set(id,next);renderCart();}
function renderCart(){
  const count=[...cart.values()].reduce((sum,qty)=>sum+qty,0);const total=[...cart.entries()].reduce((sum,[id,qty])=>sum+menuItems.find(item=>item.id===id).price*qty,0);
  cartCount.textContent=count;cartTotal.textContent=money(total);
  if(!count){cartItems.innerHTML='<div class="empty-cart">Your bag is looking a little empty.<br><span>Let’s fix that with something delicious.</span></div>';return;}
  cartItems.innerHTML=[...cart.entries()].map(([id,qty])=>{const item=menuItems.find(i=>i.id===id);return `<div class="cart-item"><img src="${item.image}" alt=""><div><h4>${item.name}</h4><small>${money(item.price)} each</small><div class="quantity-controls"><button data-quantity="${id}" data-delta="-1" aria-label="Remove one ${item.name}">−</button><span>${qty}</span><button data-quantity="${id}" data-delta="1" aria-label="Add one ${item.name}">+</button></div></div><span class="cart-item-total">${money(item.price*qty)}</span></div>`;}).join('');
}
function openCart(){cartOverlay.classList.add('open');cartOverlay.setAttribute('aria-hidden','false');document.body.classList.add('cart-open');document.getElementById('closeCart').focus();}
function closeCart(){cartOverlay.classList.remove('open');cartOverlay.setAttribute('aria-hidden','true');document.body.classList.remove('cart-open');document.getElementById('openCart').focus();}

document.getElementById('filters').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;document.querySelectorAll('.filter').forEach(filter=>filter.classList.toggle('active',filter===button));renderMenu(button.dataset.category);});
foodGrid.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)addToCart(Number(button.dataset.add));});
cartItems.addEventListener('click',event=>{const button=event.target.closest('[data-quantity]');if(button)changeQuantity(Number(button.dataset.quantity),Number(button.dataset.delta));});
document.getElementById('openCart').addEventListener('click',openCart);
document.getElementById('closeCart').addEventListener('click',closeCart);
cartOverlay.addEventListener('click',event=>{if(event.target===cartOverlay)closeCart();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&cartOverlay.classList.contains('open'))closeCart();});
document.getElementById('checkoutButton').addEventListener('click',()=>{if(cart.size===0){showToast('Your bag is empty — pick a favourite first.');return;}showToast('Checkout is a demo. Connect a payment service to accept orders.');});
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>{const target=document.querySelector(button.dataset.scroll);if(target)target.scrollIntoView({behavior:'smooth'});document.getElementById('navLinks').classList.remove('open');document.getElementById('menuToggle').setAttribute('aria-expanded','false');}));
const menuToggle=document.getElementById('menuToggle');menuToggle.addEventListener('click',()=>{const nav=document.getElementById('navLinks');const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
document.querySelectorAll('#navLinks a').forEach(link=>link.addEventListener('click',()=>{document.getElementById('navLinks').classList.remove('open');menuToggle.setAttribute('aria-expanded','false');}));
const dateInput=document.getElementById('bookingDate');const today=new Date();const localDate=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().split('T')[0];dateInput.min=localDate;
document.getElementById('reservationForm').addEventListener('submit',event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;const data=new FormData(event.currentTarget);const message=document.getElementById('formMessage');message.textContent=`Thanks, ${data.get('guestName')}! Your table request for ${data.get('guestCount')} on ${data.get('bookingDate')} at ${data.get('bookingTime')} is ready in this demo. No real booking has been sent.`;message.classList.add('show');message.scrollIntoView({behavior:'smooth',block:'nearest'});});
document.getElementById('year').textContent=new Date().getFullYear();
renderMenu();renderCart();
