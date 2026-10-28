(() => {
  const cfg = window.SIKAIN_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
  const db = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(n)||0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaultSettings = {store_name:'SIKAIN',slogan:'Lokal na Lasang Atin.',store_address:'19 Manalili St., Central Signal Village, Taguig City',facebook_url:'',logo_url:'',theme_color:'#e76f24',background_color:'#fffaf5',font_family:'system',banner_url:'',maps_api_key:'',delivery_base_fee:30,delivery_per_km:10,max_delivery_km:10};
  const sampleProducts = [
    {id:'demo-1',name:'DonTapa',price:69,category:'Rice Meals',description:'Malinamnam na tapa na may kanin.',image_url:'',available:true},
    {id:'demo-2',name:'DonSisig',price:69,category:'Rice Meals',description:'Sizzling-style sisig, lutong bahay.',image_url:'',available:true},
    {id:'demo-3',name:'DonHungarian',price:69,category:'Rice Meals',description:'Hungarian sausage meal.',image_url:'',available:true},
    {id:'demo-4',name:'DonPorkchop',price:69,category:'Rice Meals',description:'Paboritong pork chop meal.',image_url:'',available:true},
    {id:'demo-5',name:'DonBurger',price:59,category:'Snacks',description:'Burger na swak sa budget.',image_url:'',available:true},
    {id:'demo-6',name:'DonFries',price:49,category:'Snacks',description:'Crispy fries, perfect pang-meryenda.',image_url:'',available:true}
  ];
  let products = [], cart = [], settings = {...defaultSettings}, category = 'All', distanceKm = null, deliveryFee = 0, lastOrderCode = '', session = null;
  let demoOrders = [];
  const toast = msg => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),3000); };
  const demoRead = key => { try{return JSON.parse(localStorage.getItem('sikain_'+key)||'null')}catch{return null} };
  const demoWrite = (key,val) => localStorage.setItem('sikain_'+key,JSON.stringify(val));
  async function loadSettings(){
    if(db){ const {data,error}=await db.from('store_settings').select('key,value'); if(!error&&data) data.forEach(r=>settings[r.key]=r.value); }
    else settings={...defaultSettings,...(demoRead('settings')||{})};
    applySettings();
  }
  function applySettings(){
    document.documentElement.style.setProperty('--brand',settings.theme_color||defaultSettings.theme_color);
    document.documentElement.style.setProperty('--bg',settings.background_color||defaultSettings.background_color);
    document.documentElement.style.setProperty('--font',settings.font_family==='system'?'system-ui,sans-serif':settings.font_family||'system-ui,sans-serif');
    $('#brandFallback').textContent=settings.store_name||'SIKAIN'; $('#footerName').textContent=settings.store_name||'SIKAIN';
    $('#brandSlogan').textContent=settings.slogan||''; $('.hero h1').textContent=settings.slogan||'Lokal na Lasang Atin.';
    $('#storeAddress').textContent=settings.store_address||defaultSettings.store_address; $('#footerAddress').textContent=settings.store_address||defaultSettings.store_address;
    if(settings.logo_url){$('#brandLogo').src=settings.logo_url;$('#brandLogo').hidden=false;$('#brandFallback').hidden=true;}else{$('#brandLogo').hidden=true;$('#brandFallback').hidden=false;}
    if(settings.banner_url){$('.hero').style.backgroundImage=`linear-gradient(90deg,rgba(45,27,16,.78),rgba(45,27,16,.1)),url("${settings.banner_url.replace(/["\\]/g,'')}")`;}else{$('.hero').style.backgroundImage='linear-gradient(90deg,rgba(45,27,16,.82),rgba(45,27,16,.15)),linear-gradient(135deg,#d85f1d,#ffcf8c)';}
    if(settings.facebook_url){$('#facebookLink').href=settings.facebook_url;$('#facebookLink').hidden=false;}else $('#facebookLink').hidden=true;
  }
  async function loadProducts(){
    if(db){const {data,error}=await db.from('products').select('*').order('created_at',{ascending:false}); if(error){toast('Hindi ma-load ang menu: '+error.message);products=[];}else products=data||[];}
    else products=demoRead('products')||sampleProducts;
    renderCategories(); renderProducts(); renderAdminProducts();
  }
  function renderCategories(){const cats=['All',...new Set(products.filter(p=>p.available).map(p=>p.category||'Others'))];$('#categories').innerHTML=cats.map(c=>`<button class="chip ${c===category?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderCategories();renderProducts();});}
  function photo(p){return p.image_url||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2e5d9"/><text x="50%" y="48%" text-anchor="middle" font-size="60">🍽️</text><text x="50%" y="68%" text-anchor="middle" font-size="22" fill="#765b49">${String(p.name||'SIKAIN').replace(/[<&>]/g,'')}</text></svg>`);}
  function renderProducts(){const q=$('#searchMenu').value.trim().toLowerCase();const shown=products.filter(p=>p.available&& (category==='All'||(p.category||'Others')===category) && `${p.name} ${p.description||''} ${p.category||''}`.toLowerCase().includes(q));$('#menuGrid').innerHTML=shown.length?shown.map(p=>`<article class="food-card"><img loading="lazy" src="${esc(photo(p))}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${photo({name:'SIKAIN'})}'"><div class="food-content"><h3>${esc(p.name)}</h3><p>${esc(p.description||'Masarap na lutong SIKAIN.')}</p><div class="food-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${esc(p.id)}">+ Add to Cart</button></div></div></article>`).join(''):'<div class="empty-state">Walang nahanap na pagkain. Subukan ang ibang search o category.</div>';
    $$('[data-add]').forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===b.dataset.add);if(!p)return;const old=cart.find(x=>String(x.id)===String(p.id));if(old)old.qty++;else cart.push({...p,qty:1});renderCart();toast(p.name+' naidagdag sa cart.');});}
  function subtotal(){return cart.reduce((s,p)=>s+(Number(p.price)||0)*p.qty,0)}
  function renderCart(){const count=cart.reduce((s,p)=>s+p.qty,0);$('#cartCount').textContent=count;$('#cartItems').innerHTML=cart.length?cart.map(p=>`<div class="cart-row"><img src="${esc(photo(p))}" alt="${esc(p.name)}"><div><h3>${esc(p.name)}</h3><p>${money(p.price)} bawat isa</p><div class="qty"><button data-qty="${esc(p.id)}" data-delta="-1" aria-label="Bawasan">−</button><strong>${p.qty}</strong><button data-qty="${esc(p.id)}" data-delta="1" aria-label="Dagdagan">+</button></div></div><div class="cart-end"><strong>${money(p.price*p.qty)}</strong><br><button class="remove-btn" data-remove="${esc(p.id)}">Remove</button></div></div>`).join(''):'<div class="empty-state"><h3>Wala pang laman ang cart</h3><p>Pumili muna ng pagkain sa menu.</p><button class="primary-btn" data-goshop>Go to menu</button></div>';
    $$('[data-qty]').forEach(b=>b.onclick=()=>{const p=cart.find(x=>String(x.id)===b.dataset.qty);if(!p)return;p.qty+=Number(b.dataset.delta);if(p.qty<1)cart=cart.filter(x=>x!==p);renderCart();});$$('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>String(x.id)!==b.dataset.remove);renderCart();});const go=$('[data-goshop]');if(go)go.onclick=()=>showView('shop');$('#subtotal').textContent=money(subtotal());$('#deliveryTotal').textContent=money(deliveryFee);$('#grandTotal').textContent=money(subtotal()+deliveryFee);}
  function showView(view){$$('.view').forEach(v=>v.hidden=true);const map={shop:'#shopView',cart:'#cartView',track:'#trackView',admin:'#adminView'};$(map[view]||map.shop).hidden=false;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='cart')renderCart();if(view==='admin')refreshAdmin();window.scrollTo({top:0,behavior:'smooth'});}
  $$('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('#adminOpen').onclick=()=>showView('admin');$('#searchMenu').addEventListener('input',renderProducts);
  $('#orderType').onchange=()=>{const delivery=$('#orderType').value==='delivery';$('#deliveryFields').hidden=!delivery;if(!delivery){deliveryFee=0;distanceKm=null;$('#distanceMessage').textContent='Pickup selected.';}renderCart();};
  
async function getRoadDistance(address) {
  async function findLocation(query) {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='
      + encodeURIComponent(query);

    const response = await fetch(url);
    if (!response.ok) throw new Error('Hindi mahanap ang lokasyon. Subukan ulit.');

    const results = await response.json();
    if (!results.length) {
      throw new Error('Hindi mahanap ang address. Ilagay ang mas kumpletong address.');
    }

    return {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon)
    };
  }

  if (!settings.store_address) {
    throw new Error('I-set muna ang address ng tindahan sa settings.');
  }

  const store = await findLocation(settings.store_address);
  const customer = await findLocation(address);

  const routeUrl =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${store.lon},${store.lat};${customer.lon},${customer.lat}?overview=false`;

  const response = await fetch(routeUrl);
  if (!response.ok) throw new Error('Hindi makuha ang road distance.');

  const result = await response.json();
  if (result.code !== 'Ok' || !result.routes?.length) {
    throw new Error('Walang mahanap na ruta papunta sa address.');
  }

  return result.routes[0].distance / 1000;
}

let deliveryMap = null;
let deliveryMarker = null;

async function setupDeliveryMap() {
  const mapElement = document.getElementById('deliveryMap');
  if (!mapElement) return;

  if (!deliveryMap) {
    if (typeof L === 'undefined') {
  alert('Hindi nag-load ang Leaflet map library. I-refresh ang website at subukan ulit.');
  return;
}

deliveryMap = L.map('deliveryMap').setView([14.517, 121.05], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(deliveryMap);

    deliveryMap.on('click', async function (event) {
      const lat = event.latlng.lat;
      const lon = event.latlng.lng;

      if (deliveryMarker) {
        deliveryMarker.setLatLng(event.latlng);
      } else {
        deliveryMarker = L.marker(event.latlng).addTo(deliveryMap);
      }

      const message = document.getElementById('distanceMessage');
      message.textContent = 'Hinahanap ang address ng napiling lokasyon...';

      try {
        const url =
          'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
          lat + '&lon=' + lon;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Hindi makuha ang address.');

        const result = await response.json();
        if (!result.display_name) {
          throw new Error('Walang address para sa lokasyong ito.');
        }

        document.getElementById('customerAddress').value =
          result.display_name;

        message.textContent =
          'Napili na ang lokasyon. Pindutin ang Kalkulahin ang delivery fee.';
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  deliveryMap.invalidateSize();
}

document.getElementById('orderType').addEventListener('change', async function () {
  const fields = document.getElementById('deliveryFields');

  if (this.value === 'delivery') {
    fields.hidden = false;
    await new Promise(resolve => setTimeout(resolve, 100));
    await setupDeliveryMap();
  } else {
    fields.hidden = true;
  }
});

  $('#checkDistance').onclick=async()=>{const address=$('#customerAddress').value.trim();if(!address){toast('Ilagay muna ang delivery address.');return;}$('#distanceMessage').textContent='Kinukuwenta ang road distance…';$('#checkDistance').disabled=true;try{distanceKm=await getRoadDistance(address);if(distanceKm>Number(settings.max_delivery_km||10)){deliveryFee=0;$('#distanceMessage').textContent=`${distanceKm.toFixed(1)} km ang layo. Lampas ito sa maximum na ${settings.max_delivery_km} km.`;toast('Lampas sa delivery coverage.');}else{deliveryFee=Number(settings.delivery_base_fee||0)+distanceKm*Number(settings.delivery_per_km||0);$('#distanceMessage').textContent=`Tinatayang ${distanceKm.toFixed(1)} km sa kalsada. Delivery fee: ${money(deliveryFee)}.`;}renderCart();}catch(e){$('#distanceMessage').textContent=e.message;toast(e.message);}finally{$('#checkDistance').disabled=false;}};
  function makeCode(){return 'SK-'+Math.random().toString(36).slice(2,8).toUpperCase();}
  $('#checkoutForm').onsubmit=async e=>{e.preventDefault();if(!cart.length){toast('Magdagdag muna ng pagkain sa cart.');return;}const f=new FormData(e.currentTarget);const orderType=f.get('order_type');const address=String(f.get('address')||'').trim();if(orderType==='delivery'&&!address){toast('Ilagay ang delivery address.');return;}if(orderType==='delivery'&&distanceKm===null){toast('Pindutin muna ang Kalkulahin ang delivery fee.');return;}if(orderType==='delivery'&&distanceKm>Number(settings.max_delivery_km||10)){toast('Lampas sa delivery coverage ang address.');return;}
    const code=makeCode();const payload={order_code:code,customer_name:String(f.get('customer_name')).trim(),phone:String(f.get('phone')).trim(),order_type:orderType,address:orderType==='delivery'?address:'Store pickup',payment_method:String(f.get('payment_method')),notes:String(f.get('notes')||''),items:cart.map(p=>({id:p.id,name:p.name,price:Number(p.price),qty:p.qty,line_total:Number(p.price)*p.qty})),subtotal:Number(subtotal().toFixed(2)),delivery_fee:orderType==='delivery'?Number(deliveryFee.toFixed(2)):0,total:Number((subtotal()+(orderType==='delivery'?deliveryFee:0)).toFixed(2)),distance_km:orderType==='delivery'?distanceKm:null,status:'Pending'};
    const btn=$('#checkoutForm button[type="submit"]');btn.disabled=true;btn.textContent='Isinusumite…';try{if(db){const {error}=await db.from('orders').insert(payload);if(error)throw error;}else{const orders=demoRead('orders')||[];orders.unshift({...payload,id:Date.now(),created_at:new Date().toISOString()});demoWrite('orders',orders);}
      lastOrderCode=code;cart=[];deliveryFee=0;distanceKm=null;renderCart();$('#trackCode').value=code;$('#trackResult').innerHTML=`<div class="panel"><h2>Salamat sa order mo!</h2><p>Order number: <strong>${esc(code)}</strong></p><p>I-save ang order number para ma-check ang status.</p><button class="primary-btn" id="viewMyOrder">Tingnan ang order</button></div>`;$('#viewMyOrder').onclick=()=>showView('track');document.getElementById('checkoutForm')?.reset();$('#deliveryFields').hidden=true;toast('Na-submit ang order! Order no. '+code);showView('track');try {
  await lookupOrder(code);
} catch (lookupError) {
  console.error('Order saved, but tracking failed:', lookupError);
}
    
}catch(err){
  console.error('SIKAIN Place Order error:', err);
  toast('Order error: '+(err?.message || String(err) || 'Hindi alam ang sanhi.'));
}finally{
  btn.disabled=false;
  btn.textContent='Place Order';
}};

  async function lookupOrder(code){let order=null;if(db){const {data,error}=await db.rpc('track_sikain_order',{code_input:code});if(!error)order=data;}else order=(demoRead('orders')||[]).find(o=>o.order_code.toLowerCase()===code.toLowerCase());const el=$('#trackResult');el.innerHTML=order?`<div class="panel"><span class="status-pill">${esc(order.status)}</span><h2>Order ${esc(order.order_code)}</h2><p>${esc(order.customer_name||'Customer')} · ${esc(order.order_type||'')}</p><p>${Array.isArray(order.items)?order.items.map(i=>`${esc(i.qty)}× ${esc(i.name)}`).join('<br>'):''}</p><h3>Total: ${money(order.total)}</h3><p class="muted small">Order status: Pending → Preparing → Ready → Completed.</p></div>`:'<div class="panel">Hindi makita ang order. I-check ang order number at subukan ulit.</div>';}
  $('#trackForm').onsubmit=e=>{e.preventDefault();lookupOrder($('#trackCode').value.trim());};
  $('#adminLogin').onsubmit=async e=>{e.preventDefault();if(!db){$('#loginMessage').textContent='Demo mode: ikonekta muna ang Supabase at gumawa ng admin account. Walang secure admin login sa demo mode.';return;}const f=new FormData(e.currentTarget);const {data,error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error){$('#loginMessage').textContent=error.message;return;}session=data.session;await refreshAdmin();};
  $('#adminLogout').onclick=async()=>{if(db)await db.auth.signOut();session=null;$('#adminContent').hidden=true;$('#adminLogin').hidden=false;$('#adminLogout').hidden=true;toast('Naka-log out na.');};
  async function refreshAdmin(){if(!db){$('#adminLogin').hidden=false;$('#adminContent').hidden=true;return;}const {data}=await db.auth.getSession();session=data.session;if(session){$('#adminLogin').hidden=true;$('#adminContent').hidden=false;$('#adminLogout').hidden=false;await loadProducts();await loadOrders();fillSettingsForms();}else{$('#adminLogin').hidden=false;$('#adminContent').hidden=true;$('#adminLogout').hidden=true;}}
  async function loadOrders(){let orders=[];$('#ordersList').innerHTML = '<p>Orders na nakuha: ' + orders.length + '</p>';if(db){
const {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false}).limit(100);
console.log('SIKAIN admin orders:', data);
if (error) console.error('SIKAIN orders error:', error);
if(error){$('#ordersList').innerHTML=`<p class="muted">Hindi ma-load ang orders: ${esc(error.message)}</p>`;return;}orders=data||[];}else orders=demoRead('orders')||[];$('#ordersList').innerHTML=orders.length?orders.map(o=>`<article class="order-card"><div class="order-top"><div><h3>${esc(o.order_code)}</h3><span class="muted small">${esc(o.created_at?new Date(o.created_at).toLocaleString('en-PH'): '')}</span></div><span class="status-pill">${esc(o.status)}</span></div><p><strong>${esc(o.customer_name)}</strong> · ${esc(o.phone)}<br>${esc(o.order_type)} · ${esc(o.address||'')}<br>Payment: ${esc(o.payment_method||'')}</p><ul>${(o.items||[]).map(i=>`<li>${esc(i.qty)} × ${esc(i.name)} — ${money(i.line_total??i.price*i.qty)}</li>`).join('')}</ul><p>${esc(o.notes||'')}</p><h3>Total: ${money(o.total)}</h3><div class="order-actions"><select data-status-for="${esc(o.id)}" aria-label="Order status"><option ${o.status==='Pending'?'selected':''}>Pending</option><option ${o.status==='Preparing'?'selected':''}>Preparing</option><option ${o.status==='Ready'?'selected':''}>Ready</option><option ${o.status==='Completed'?'selected':''}>Completed</option><option ${o.status==='Cancelled'?'selected':''}>Cancelled</option></select><button class="outline-btn" data-update-order="${esc(o.id)}">Update status</button><button class="primary-btn" data-print="${esc(o.id)}">Print receipt</button></div></article>`).join(''):'<div class="empty-state">Wala pang orders.</div>';
    $$('[data-update-order]').forEach(b=>b.onclick=async()=>{const id=b.dataset.updateOrder;const status=$(`[data-status-for="${CSS.escape(id)}"]`).value;let error=null;if(db){({error}=await db.from('orders').update({status}).eq('id',id));}else{const arr=demoRead('orders')||[];const o=arr.find(x=>String(x.id)===String(id));if(o)o.status=status;demoWrite('orders',arr);}if(error)toast(error.message);else{toast('Na-update ang order.');loadOrders();}});
    $$('[data-print]').forEach(b=>b.onclick=()=>{const o=orders.find(x=>String(x.id)===b.dataset.print);if(o)printReceipt(o);});
  }
  $('#refreshOrders').onclick=loadOrders;
  function printReceipt(o){const lines=(o.items||[]).map(i=>`<tr><td>${esc(i.qty)}x ${esc(i.name)}</td><td style="text-align:right">${money(i.line_total??i.price*i.qty)}</td></tr>`).join('');const w=window.open('','_blank','width=360,height=650');if(!w){toast('Payagan ang pop-up para makapag-print.');return;}w.document.write(`<!doctype html><html><head><title>Receipt ${esc(o.order_code)}</title><style>body{font:12px monospace;width:280px;margin:8px auto;color:#000}h2,p{text-align:center;margin:5px 0}hr{border:0;border-top:1px dashed #000;margin:10px 0}table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top}.total{font-size:15px;font-weight:bold}</style></head><body><h2>${esc(settings.store_name||'SIKAIN')}</h2><p>${esc(settings.slogan||'Lokal na Lasang Atin.')}</p><p>${esc(settings.store_address||'')}</p><hr><p>ORDER RECEIPT</p><p>${esc(o.order_code)}</p><p>${esc(o.created_at?new Date(o.created_at).toLocaleString('en-PH'):new Date().toLocaleString('en-PH'))}</p><hr><p style="text-align:left">Customer: ${esc(o.customer_name)}<br>Phone: ${esc(o.phone)}<br>Type: ${esc(o.order_type)}<br>Address: ${esc(o.address||'')}<br>Payment: ${esc(o.payment_method||'')}</p><hr><table>${lines}</table><hr><table><tr><td>Subtotal</td><td style="text-align:right">${money(o.subtotal)}</td></tr><tr><td>Delivery</td><td style="text-align:right">${money(o.delivery_fee)}</td></tr><tr class="total"><td>TOTAL</td><td style="text-align:right">${money(o.total)}</td></tr></table><hr><p>Salamat sa pag-order!</p><p>${esc(o.notes||'')}</p><script>window.onload=()=>{window.print();};<\/script></body></html>`);w.document.close();}
  function renderAdminProducts(){const el=$('#adminProducts');if(!el)return;el.innerHTML=products.length?products.map(p=>`<div class="admin-product"><img src="${esc(photo(p))}" alt=""><div><h3>${esc(p.name)} ${p.available?'':'(Unavailable)'}</h3><p>${esc(p.category||'Others')} · ${money(p.price)}</p><p>${esc(p.description||'')}</p></div><div class="button-row"><button class="outline-btn" data-edit-product="${esc(p.id)}">Edit</button><button class="outline-btn" data-delete-product="${esc(p.id)}">Delete</button></div></div>`).join(''):'<p class="muted">Wala pang menu items.</p>';
    $$('[data-edit-product]').forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===b.dataset.editProduct);if(!p)return;const f=$('#productForm');f.hidden=false;$('#productFormTitle').textContent='Edit food';for(const k of ['id','name','price','category','image_url','description'])f.elements[k].value=p[k]??'';f.elements.available.checked=!!p.available;f.scrollIntoView({behavior:'smooth'});});
    $$('[data-delete-product]').forEach(b=>b.onclick=async()=>{if(!confirm('Sigurado bang buburahin ang menu item na ito?'))return;let error=null;if(db){({error}=await db.from('products').delete().eq('id',b.dataset.deleteProduct));}else{products=products.filter(p=>String(p.id)!==b.dataset.deleteProduct);demoWrite('products',products);}if(error)toast(error.message);else{toast('Na-delete ang menu item.');await loadProducts();}});
  }
  $('#newProduct').onclick=()=>{const f=$('#productForm');f.reset();f.hidden=false;f.elements.id.value='';f.elements.available.checked=true;$('#productFormTitle').textContent='Add food';f.scrollIntoView({behavior:'smooth'});};$('#cancelProduct').onclick=()=>$('#productForm').hidden=true;
async function uploadFile(file, folder) {
  if (!file) return null;
  if (!db) throw new Error('Kailangan ng Supabase para sa image upload.');

  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await db.storage
    .from('food-photos')
    .upload(path, file, {
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return db.storage.from('food-photos').getPublicUrl(path).data.publicUrl;
}

  $('#productForm').onsubmit=async e=>{e.preventDefault();if(!db){toast('Demo mode lang: hindi pa permanent ang menu changes. Ikonekta ang Supabase para ma-save online.');return;}const f=e.currentTarget;const fd=new FormData(f);const id=String(fd.get('id')||'');let image_url=String(fd.get('image_url')||'').trim();try{if(f.elements.photo_file.files[0])image_url=await uploadFile(f.elements.photo_file.files[0],'foods');const payload={name:String(fd.get('name')).trim(),price:Number(fd.get('price')),category:String(fd.get('category')||'Others').trim()||'Others',image_url,description:String(fd.get('description')||''),available:f.elements.available.checked};let result;if(id)result=await db.from('products').update(payload).eq('id',id);else result=await db.from('products').insert(payload);if(result.error)throw result.error;f.hidden=true;f.reset();toast('Na-save ang menu item.');await loadProducts();}catch(err){toast('Hindi na-save: '+err.message);}};
  function fillSettingsForms(){const a=$('#appearanceForm'),d=$('#deliveryForm');for(const k of ['store_name','slogan','logo_url','theme_color','background_color','font_family','banner_url'])if(a.elements[k])a.elements[k].value=settings[k]??defaultSettings[k]??'';for(const k of ['store_address','facebook_url','maps_api_key','delivery_base_fee','delivery_per_km','max_delivery_km'])if(d.elements[k])d.elements[k].value=settings[k]??defaultSettings[k]??'';}
  async function saveSettings(values){if(db){for(const [key,value] of Object.entries(values)){const {error}=await db.from('store_settings').upsert({key,value},{onConflict:'key'});if(error)throw error;}}else{settings={...settings,...values};demoWrite('settings',settings);}settings={...settings,...values};applySettings();}
  $('#appearanceForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const fd=new FormData(f);try{let logo_url=String(fd.get('logo_url')||'').trim(),banner_url=String(fd.get('banner_url')||'').trim();if(f.elements.logo_file.files[0])logo_url=await uploadFile(f.elements.logo_file.files[0],'logos');if(f.elements.banner_file.files[0])banner_url=await uploadFile(f.elements.banner_file.files[0],'banners');await saveSettings({store_name:String(fd.get('store_name')).trim(),slogan:String(fd.get('slogan')).trim(),logo_url,theme_color:String(fd.get('theme_color')),background_color:String(fd.get('background_color')),font_family:String(fd.get('font_family')),banner_url});toast('Na-save ang website appearance.');}catch(err){toast('Hindi na-save: '+err.message);}};
  $('#deliveryForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f);try{await saveSettings({store_address:String(fd.get('store_address')).trim(),facebook_url:String(fd.get('facebook_url')).trim(),maps_api_key:String(fd.get('maps_api_key')).trim(),delivery_base_fee:Number(fd.get('delivery_base_fee')),delivery_per_km:Number(fd.get('delivery_per_km')),max_delivery_km:Number(fd.get('max_delivery_km'))});toast('Na-save ang store at delivery settings.');}catch(err){toast('Hindi na-save: '+err.message);}};
  $$('[data-admin-tab]').forEach(b=>b.onclick=()=>{$$('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('.admin-section').forEach(s=>s.hidden=true);$('#admin'+b.dataset.adminTab[0].toUpperCase()+b.dataset.adminTab.slice(1)).hidden=false;});
  async function init(){if(!configured)toast('Preview mode: i-setup ang Supabase para gumana ang real orders at admin.');await loadSettings();await loadProducts();renderCart();if(db){db.auth.onAuthStateChange((_event,s)=>{session=s;});}}
  init();
})();
