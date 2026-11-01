(() => {
  const cfg = window.SIKAIN_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
  const db = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(n)||0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaultSettings = {store_name:'SIKAIN',slogan:'Lokal na Lasang Atin.',store_address:'19 Manalili St., Central Signal Village, Taguig City',facebook_url:'',logo_url:'',theme_color:'#e76f24',background_color:'#fffaf5',font_family:'system',banner_url:'',maps_api_key:'',delivery_base_fee:30,delivery_per_km:10,max_delivery_km:10,website_open:true};
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
  if(db){
    const {data,error}=await db
      .from('store_settings')
      .select('key,value');

    if(error){
      console.error('SIKAIN SETTINGS ERROR:',error);
      toast('Hindi ma-load ang settings: '+error.message);
    } else if(data){
      data.forEach(r=>settings[r.key]=r.value);
    }
  } else {
    settings={...defaultSettings,...(demoRead('settings')||{})};
  }

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
    applyWebsiteStatus();
  }

  function ensureWebsiteOrderingNotice(){
    let notice=$('#websiteOrderingNotice');
    if(notice) return notice;
    notice=document.createElement('div');
    notice.id='websiteOrderingNotice';
    notice.className='panel';
    notice.setAttribute('role','status');
    notice.style.cssText='margin:16px 0;padding:16px;border:1px solid #e76f24;background:#fff1e5;color:#71330f;font-weight:700;text-align:center;';
    notice.textContent='Pansamantalang sarado ang online ordering. Maaari mong tingnan ang menu at bumalik mamaya.';
    const menuGrid=$('#menuGrid');
    if(menuGrid) menuGrid.insertAdjacentElement('beforebegin',notice);
    else if($('#shopView')) $('#shopView').prepend(notice);
    return notice;
  }

  function applyWebsiteStatus(){
    const isOpen=settings.website_open !== false;
    const notice=ensureWebsiteOrderingNotice();
    if(notice) notice.hidden=isOpen;
    const status=$('#websiteOpenStatus');
    const toggle=$('#websiteOpenToggle');
    if(status) status.textContent=isOpen?'OPEN — Tumatanggap ng orders.':'CLOSED — Hindi muna tumatanggap ng orders.';
    if(toggle){
      toggle.textContent=isOpen?'CLOSE ORDERING':'OPEN ORDERING';
      toggle.disabled=false;
      toggle.setAttribute('aria-pressed',String(!isOpen));
    }
    $$('[data-add]').forEach(button=>{
      button.disabled=!isOpen;
      button.textContent=isOpen?'+ Add to Cart':'Ordering Closed';
      button.title=isOpen?'':'Pansamantalang sarado ang online ordering.';
    });
  }

  const websiteToggle=$('#websiteOpenToggle');
  if(websiteToggle){
    websiteToggle.onclick=async()=>{
      const nextOpen=settings.website_open===false;
      websiteToggle.disabled=true;
      websiteToggle.textContent='Saving...';
      try{
        await saveSettings({website_open:nextOpen});
        applyWebsiteStatus();
        toast(nextOpen?'Bukas na ulit ang online ordering.':'Sarado na ang online ordering.');
      }catch(error){
        applyWebsiteStatus();
        toast('Hindi na-save ang website status: '+(error.message||String(error)));
      }
    };
  }

async function loadProducts(){
    if(db){
      const {data,error}=await db.from('products').select('*').order('created_at',{ascending:false});
      if(error){
        toast('Hindi ma-load ang menu: '+error.message);
        products=[];
      } else {
        products=data||[];
      }
    } else {
      products=demoRead('products')||sampleProducts;
    }

    renderCategories();
    renderProducts();
    renderAdminProducts();
    applyWebsiteStatus();

    ensureLoyaltyCustomerUI();

    console.log('SIKAIN CUSTOMER MENU:', products.length);
    console.log('SIKAIN AVAILABLE MENU:', products.filter(p => p.available === true).length);
}
  function renderCategories(){const cats=['All',...new Set(products.filter(p=>p.available).map(p=>p.category||'Others'))];$('#categories').innerHTML=cats.map(c=>`<button class="chip ${c===category?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderCategories();renderProducts();});}
  function photo(p){return p.image_url||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2e5d9"/><text x="50%" y="48%" text-anchor="middle" font-size="60">🍽️</text><text x="50%" y="68%" text-anchor="middle" font-size="22" fill="#765b49">${String(p.name||'SIKAIN').replace(/[<&>]/g,'')}</text></svg>`);}
  function renderProducts(){const q=$('#searchMenu').value.trim().toLowerCase();const shown=products.filter(p=>p.available == true && (category==='All'||(p.category||'Others')===category) && `${p.name} ${p.description||''} ${p.category||''}`.toLowerCase().includes(q));$('#menuGrid').innerHTML=shown.length?shown.map(p=>`<article class="food-card"><img loading="lazy" src="${esc(photo(p))}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${photo({name:'SIKAIN'})}'"><div class="food-content"><h3>${esc(p.name)}</h3><p>${esc(p.description||'Masarap na lutong SIKAIN.')}</p><div class="food-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${esc(p.id)}" ${settings.website_open===false?'disabled':''}>${settings.website_open===false?'Ordering Closed':'+ Add to Cart'}</button></div></div></article>`).join(''):'<div class="empty-state">Walang nahanap na pagkain. Subukan ang ibang search o category.</div>';
    $$('[data-add]').forEach(b=>b.onclick=()=>{if(settings.website_open===false){toast('Sarado muna ang online ordering.');return;}const p=products.find(x=>String(x.id)===b.dataset.add);if(!p)return;const old=cart.find(x=>String(x.id)===String(p.id));if(old)old.qty++;else cart.push({...p,qty:1});renderCart();toast(p.name+' naidagdag sa cart.');});}
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
  $('#checkoutForm').onsubmit=async e=>{e.preventDefault();if(settings.website_open===false){toast('Sarado muna ang online ordering. Hindi muna makakapag-submit ng order.');return;}if(!cart.length){toast('Magdagdag muna ng pagkain sa cart.');return;}const f=new FormData(e.currentTarget);const orderType=f.get('order_type');const address=String(f.get('address')||'').trim();if(orderType==='delivery'&&!address){toast('Ilagay ang delivery address.');return;}if(orderType==='delivery'&&distanceKm===null){toast('Pindutin muna ang Kalkulahin ang delivery fee.');return;}if(orderType==='delivery'&&distanceKm>Number(settings.max_delivery_km||10)){toast('Lampas sa delivery coverage ang address.');return;}
    const code=makeCode();const payload={order_code:code,customer_name:String(f.get('customer_name')).trim(),phone:String(f.get('phone')).trim(),order_type:orderType,address:orderType==='delivery'?address:'Store pickup',payment_method:String(f.get('payment_method')),notes:String(f.get('notes')||''),items:cart.map(p=>({id:p.id,name:p.name,price:Number(p.price),qty:p.qty,line_total:Number(p.price)*p.qty})),subtotal:Number(subtotal().toFixed(2)),delivery_fee:orderType==='delivery'?Number(deliveryFee.toFixed(2)):0,total:Number((subtotal()+(orderType==='delivery'?deliveryFee:0)).toFixed(2)),distance_km:orderType==='delivery'?distanceKm:null,status:'Pending'};
    const btn=$('#checkoutForm button[type="submit"]');btn.disabled=true;btn.textContent='Isinusumite…';try{if(db){
  const { error } = await db.rpc('place_sikain_order', {
    order_payload: payload
  });
  if(error) throw error;
  await loadProducts();
}else{const orders=demoRead('orders')||[];orders.unshift({...payload,id:Date.now(),created_at:new Date().toISOString()});demoWrite('orders',orders);}
      lastOrderCode=code;saveMyOrderCode(code);cart=[];deliveryFee=0;distanceKm=null;renderCart();await loadMyOrderHistory();$('#trackCode').value=code;$('#trackResult').innerHTML=`<div class="panel"><h2>Salamat sa order mo!</h2><p>Order number: <strong>${esc(code)}</strong></p><p>I-save ang order number para ma-check ang status.</p><button class="primary-btn" id="viewMyOrder">Tingnan ang order</button></div>`;$('#viewMyOrder').onclick=()=>showView('track');document.getElementById('checkoutForm')?.reset();$('#deliveryFields').hidden=true;toast('Na-submit ang order! Order no. '+code);showView('track');try {
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

  function ensureMyOrderHistoryUI(){
    if($('#myOrderHistoryList')) return;
    const menuGrid=$('#menuGrid');
    if(!menuGrid) return;
    const section=document.createElement('section');
    section.id='myOrderHistory';
    section.className='panel';
    section.style.marginTop='24px';
    section.innerHTML='<h2>My Order History</h2><p class="muted">Mga order na ginawa sa browser/device na ito.</p><div id="myOrderHistoryList"><p class="muted">Wala ka pang order na naka-save dito.</p></div>';
    menuGrid.insertAdjacentElement('afterend',section);
  }
  function getMyOrderCodes(){const saved=demoRead('my_order_codes');return Array.isArray(saved)?saved.filter(x=>typeof x==='string'&&x.trim()):[];}
  function saveMyOrderCode(code){const codes=getMyOrderCodes();if(code&&!codes.includes(code))codes.unshift(code);demoWrite('my_order_codes',codes.slice(0,30));}
  async function fetchOrderByCode(code){
    if(db){
      const {data,error}=await db.rpc('track_sikain_order',{code_input:code});
      if(error) throw error;
      return Array.isArray(data)?(data[0]||null):data;
    }
    return (demoRead('orders')||[]).find(o=>String(o.order_code||'').toLowerCase()===code.toLowerCase())||null;
  }
  
async function lookupOrder(code) {
  const el = $('#trackResult');

  if (!code) {
    el.innerHTML = '<div class="panel">Ilagay ang order number.</div>';
    return;
  }

  el.innerHTML = '<div class="panel">Hinahanap ang order...</div>';

  try {
    const order = await fetchOrderByCode(code);
    console.log('SIKAIN TRACK ORDER:', order);
console.log('SIKAIN CREATED AT:', order?.created_at);

    if (!order) {
      el.innerHTML = '<div class="panel">Hindi makita ang order. I-check ang order number at subukan ulit.</div>';
      return;
    }

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    const validDate = createdAt && !Number.isNaN(createdAt.getTime());

    const waiting = Math.max(0, Number(settings.waiting_minutes ?? 5));
    const cooking = Math.max(1, Number(settings.cooking_minutes ?? 15));
    const delivery = Math.max(1, Number(settings.delivery_minutes ?? 20));

    const readyMinutes = waiting + cooking;
    const totalMinutes = readyMinutes +
      (String(order.order_type || '').toLowerCase() === 'delivery' ? delivery : 0);

    const formatDate = date =>
      date.toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

    const readyAt = validDate
      ? new Date(createdAt.getTime() + readyMinutes * 60000)
      : null;

    const arrivalAt = validDate
      ? new Date(createdAt.getTime() + totalMinutes * 60000)
      : null;

    const timeInfo = validDate
      ? `
        <div class="order-time-info">
          <p><strong>Order date/time:</strong> ${esc(formatDate(createdAt))}</p>
          <p><strong>Waiting time:</strong> ${waiting} minutes</p>
          <p><strong>Cooking time:</strong> ${cooking} minutes</p>
          <p><strong>Estimated ready time:</strong> ${esc(formatDate(readyAt))}</p>
          ${String(order.order_type || '').toLowerCase() === 'delivery'
            ? `<p><strong>Estimated delivery time:</strong> ${esc(formatDate(arrivalAt))}</p>`
            : ''}
          <p class="muted small">Tantiyang oras lamang ito at maaaring magbago depende sa dami ng orders at biyahe.</p>
        </div>
      `
      : '<p class="muted small">Hindi pa available ang petsa at oras ng order mula sa tracking data.</p>';

    el.innerHTML = `
      <div class="panel">
        <span class="status-pill">${esc(order.status || 'Pending')}</span>
        <h2>Order ${esc(order.order_code || code)}</h2>
        <p>${esc(order.customer_name || 'Customer')} · ${esc(order.order_type || '')}</p>
        ${timeInfo}
        <p>${Array.isArray(order.items)
          ? order.items.map(i => `${esc(i.qty)}× ${esc(i.name)}`).join('<br>')
          : ''}</p>
        <h3>Total: ${money(order.total)}</h3>
        <p class="muted small">Order status: Pending → Preparing → Ready → Completed.</p>
      </div>
    `;
  } catch (err) {
    console.error('SIKAIN track order error:', err);
    el.innerHTML = '<div class="panel">Hindi ma-check ang order ngayon. Subukan ulit mamaya.</div>';
  }
}

  
async function loadMyOrderHistory() {
  ensureMyOrderHistoryUI();

  const el = $('#myOrderHistoryList');
  if (!el) return;

  el.innerHTML = `
    <button type="button" class="outline-btn"
      id="refreshMyOrderHistory"
      style="width:100%;margin-bottom:12px">
      🔄 Refresh History
    </button>
    <div id="myOrderHistoryResults">
      <p class="muted">Kinukuha ang order history...</p>
    </div>
  `;

  const refreshBtn = $('#refreshMyOrderHistory');
  const resultsEl = $('#myOrderHistoryResults');

  refreshBtn.onclick = loadMyOrderHistory;

  const codes = getMyOrderCodes();

  if (!codes.length) {
    resultsEl.innerHTML =
      '<p class="muted">Wala pang order na naka-save sa device na ito.</p>';
    return;
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Kinukuha ang latest status...';

  try {
    const results = await Promise.all(
      codes.map(async code => {
        try {
          return await fetchOrderByCode(code);
        } catch (err) {
          console.warn('History lookup failed for', code, err);
          return null;
        }
      })
    );

    const orders = results.filter(Boolean);

    if (!orders.length) {
      resultsEl.innerHTML = `
        <p class="muted">
          Hindi makuha ang history ngayon.
          Pindutin ang Refresh History para subukan ulit.
        </p>`;
      return;
    }

    resultsEl.innerHTML = orders.map(o => {
      const code = o.order_code || '';
      const status = o.status || 'Pending';
      const items = Array.isArray(o.items)
        ? o.items.map(i =>
            `${esc(i.qty)} × ${esc(i.name)}`
          ).join(', ')
        : 'Order details';

      return `
        <article class="order-card" style="margin-bottom:12px">
          <h3>Order ${esc(code)}</h3>
          <p><strong>Status:</strong>
            <span class="status-pill">${esc(status)}</span>
          </p>
          <p>${items}</p>
          <p><strong>Total:</strong> ${money(o.total)}</p>
          <button type="button"
            class="outline-btn"
            data-view-history-order="${esc(code)}"
            style="width:100%">
            Tingnan ang Order Status
          </button>
        </article>
      `;
    }).join('');

    $$('[data-view-history-order]', resultsEl).forEach(button => {
      button.onclick = async () => {
        const code = button.dataset.viewHistoryOrder;
        $('#trackCode').value = code;
        showView('track');
        await lookupOrder(code);
      };
    });

  } catch (err) {
    console.error('Load order history failed:', err);
    resultsEl.innerHTML =
      '<p class="muted">May problema sa pagkuha ng history. Subukan ulit.</p>';
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Refresh History';
  }
}

  $('#trackForm').onsubmit=e=>{e.preventDefault();lookupOrder($('#trackCode').value.trim());};
  $('#adminLogin').onsubmit=async e=>{e.preventDefault();if(!db){$('#loginMessage').textContent='Demo mode: ikonekta muna ang Supabase at gumawa ng admin account. Walang secure admin login sa demo mode.';return;}const f=new FormData(e.currentTarget);const {data,error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error){$('#loginMessage').textContent=error.message;return;}session=data.session;await refreshAdmin();};
  $('#adminLogout').onclick=async()=>{if(db)await db.auth.signOut();session=null;$('#adminContent').hidden=true;$('#adminLogin').hidden=false;$('#adminLogout').hidden=true;toast('Naka-log out na.');};
  async function refreshAdmin(){if(!db){$('#adminLogin').hidden=false;$('#adminContent').hidden=true;return;}const {data}=await db.auth.getSession();session=data.session;if(session){$('#adminLogin').hidden=true;$('#adminContent').hidden=false;$('#adminLogout').hidden=false;await loadProducts();ensureLoyaltyAdminUI();await loadOrders();fillSettingsForms();applyWebsiteStatus();}else{$('#adminLogin').hidden=false;$('#adminContent').hidden=true;$('#adminLogout').hidden=true;}}
  


async function loadOrders(){
  const el = $('#ordersList');
  el.innerHTML = '<p>Kinukuha ang orders...</p>';

  try {
    if (!db) {
      el.innerHTML = '<p>Walang koneksyon sa Supabase.</p>';
      return;
    }

    const { data: orders, error } = await db
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      el.innerHTML = '<p>Wala pang orders.</p>';
      return;
    }

    el.innerHTML = orders.map(o => `
      <article class="order-card">
        <h3>${esc(o.order_code || 'Walang order number')}</h3>
        <p>${esc(o.customer_name || 'Customer')} · ${esc(o.phone || '')}</p>
        <p>${esc(o.order_type || '')} · ${esc(o.address || '')}</p>
        <p>Total: ${money(o.total)}</p>

        <label>Status ng order:</label>
        <select data-status-for="${esc(o.id)}">
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending — Bagong order</option>
          <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Cooking — Niluluto na</option>
          <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready — Handa na</option>
          <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Delivered — Na-deliver na</option>
          <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled — Kinansela</option>
        </select>

        <button type="button" class="outline-btn" data-update-order="${esc(o.id)}">
          Update Status
        </button>
      </article>
    `).join('');

    $$('[data-update-order]').forEach(button => {
      button.onclick = async () => {
        const id = button.dataset.updateOrder;
        const card = button.closest('.order-card');
        const select = card.querySelector('[data-status-for]');
        const status = select.value;

        button.disabled = true;
        button.textContent = 'Saving...';

        try {
          const { data, error } = await db
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select('id, status');

          if (error) throw error;

          if (!data || data.length === 0) {
            throw new Error(
              'Walang order na na-update. Suriin ang Supabase UPDATE at SELECT policies.'
            );
          }

          toast('Na-update ang status: ' + status);
          await loadOrders();

        } catch (err) {
          toast('Hindi na-update: ' + err.message);
        } finally {
          button.disabled = false;
          button.textContent = 'Update Status';
        }
      };
    });

  } catch (err) {
    el.innerHTML =
      '<p>Hindi ma-load ang orders: ' + esc(err.message) + '</p>';
    console.error('SIKAIN loadOrders error:', err);
  }
}



  $('#refreshOrders').onclick=loadOrders;
  function printReceipt(o){const lines=(o.items||[]).map(i=>`<tr><td>${esc(i.qty)}x ${esc(i.name)}</td><td style="text-align:right">${money(i.line_total??i.price*i.qty)}</td></tr>`).join('');const w=window.open('','_blank','width=360,height=650');if(!w){toast('Payagan ang pop-up para makapag-print.');return;}w.document.write(`<!doctype html><html><head><title>Receipt ${esc(o.order_code)}</title><style>body{font:12px monospace;width:280px;margin:8px auto;color:#000}h2,p{text-align:center;margin:5px 0}hr{border:0;border-top:1px dashed #000;margin:10px 0}table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top}.total{font-size:15px;font-weight:bold}</style></head><body><h2>${esc(settings.store_name||'SIKAIN')}</h2><p>${esc(settings.slogan||'Lokal na Lasang Atin.')}</p><p>${esc(settings.store_address||'')}</p><hr><p>ORDER RECEIPT</p><p>${esc(o.order_code)}</p><p>${esc(o.created_at?new Date(o.created_at).toLocaleString('en-PH'):new Date().toLocaleString('en-PH'))}</p><hr><p style="text-align:left">Customer: ${esc(o.customer_name)}<br>Phone: ${esc(o.phone)}<br>Type: ${esc(o.order_type)}<br>Address: ${esc(o.address||'')}<br>Payment: ${esc(o.payment_method||'')}</p><hr><table>${lines}</table><hr><table><tr><td>Subtotal</td><td style="text-align:right">${money(o.subtotal)}</td></tr><tr><td>Delivery</td><td style="text-align:right">${money(o.delivery_fee)}</td></tr><tr class="total"><td>TOTAL</td><td style="text-align:right">${money(o.total)}</td></tr></table><hr><p>Salamat sa pag-order!</p><p>${esc(o.notes||'')}</p><script>window.onload=()=>{window.print();};<\/script></body></html>`);w.document.close();}
  function renderAdminProducts(){const el=$('#adminProducts');if(!el)return;el.innerHTML=products.length?products.map(p=>`<div class="admin-product"><img src="${esc(photo(p))}" alt=""><div><h3>${esc(p.name)} ${p.available?'':'(Unavailable)'}</h3><p>${esc(p.category||'Others')} · ${money(p.price)}</p><p>${esc(p.description||'')}</p></div><div class="button-row"><button class="outline-btn" data-edit-product="${esc(p.id)}">Edit</button><button class="outline-btn" data-delete-product="${esc(p.id)}">Delete</button></div></div>`).join(''):'<p class="muted">Wala pang menu items.</p>';
    $$('[data-edit-product]').forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===b.dataset.editProduct);if(!p)return;const f=$('#productForm');f.hidden=false;$('#productFormTitle').textContent='Edit food';ensureStockField();
for(const k of ['id','name','price','category','image_url','description'])f.elements[k].value=p[k]??'';
f.elements.stock_qty.value=p.stock_qty??999;
f.elements.available.checked=!!p.available;f.scrollIntoView({behavior:'smooth'});});
    $$('[data-delete-product]').forEach(b=>b.onclick=async()=>{if(!confirm('Sigurado bang buburahin ang menu item na ito?'))return;let error=null;if(db){({error}=await db.from('products').delete().eq('id',b.dataset.deleteProduct));}else{products=products.filter(p=>String(p.id)!==b.dataset.deleteProduct);demoWrite('products',products);}if(error)toast(error.message);else{toast('Na-delete ang menu item.');await loadProducts();}});
  }
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
function ensureStockField(){
  const f = $('#productForm');
  if (!f || f.elements.stock_qty) return;

  const wrap = document.createElement('div');
  const label = document.createElement('label');
  const input = document.createElement('input');

  label.textContent = 'Stock Quantity';
  input.type = 'number';
  input.name = 'stock_qty';
  input.min = '0';
  input.step = '1';
  input.value = '999';
  input.required = true;

  wrap.append(label, input);

  const submit = f.querySelector('button[type="submit"]');
  if (submit) f.insertBefore(wrap, submit);
  else f.appendChild(wrap);
}

$('#productForm').onsubmit = async e => {
  e.preventDefault();

  const f = e.currentTarget;

  if (!db) {
    toast('Walang Supabase connection. I-check ang config.js.');
    console.error('SIKAIN: Supabase database is not connected.');
    return;
  }

  const fd = new FormData(f);
  const id = String(fd.get('id') || '').trim();

  try {
    let image_url = String(fd.get('image_url') || '').trim();

    const photoInput = f.elements.photo_file;
    const photo = photoInput?.files?.[0];

    if (photo) {
      image_url = await uploadFile(photo, 'foods');
    }

    const name = String(fd.get('name') || '').trim();
    const price = Number(fd.get('price'));
    const category =
      String(fd.get('category') || 'Others').trim() || 'Others';

    if (!name) {
      toast('Ilagay ang pangalan ng pagkain.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast('Ilagay ang tamang presyo.');
      return;
    }

    const payload = {
      name,
      price,
      category,
      image_url,
      description: String(fd.get('description') || '').trim(),
      available: Boolean(f.elements.available?.checked),
      stock_qty: Number(fd.get('stock_qty') || 0)
    };

    console.log('SIKAIN: Saving product:', payload);

    let result;

    if (id) {
      result = await db
        .from('products')
        .update(payload)
        .eq('id', id);
    } else {
      result = await db
        .from('products')
        .insert(payload);
    }

    if (result.error) {
      console.error('SIKAIN product save error:', result.error);
      throw result.error;
    }

    toast('Na-save ang menu item.');
    f.hidden = true;
    f.reset();

    await loadProducts();

  } catch (err) {
    console.error('SIKAIN product save failed:', err);
    toast('Hindi na-save: ' + (err.message || String(err)));
  }
};

$('#newProduct').onclick=()=>{
  const f=$('#productForm');
  f.reset();
  ensureStockField();
f.elements.stock_qty.value=999;
  f.elements.id.value='';
  f.elements.available.checked=true;
  $('#productFormTitle').textContent='Add food';
  f.hidden=false;
  f.scrollIntoView({behavior:'smooth',block:'start'});
};

$('#cancelProduct').onclick=()=>{
  const f=$('#productForm');
  f.hidden=true;
  f.reset();
};

 
function ensureDeliveryTimeFields() {
  const form = $('#deliveryForm');
  if (!form || form.elements.waiting_minutes) return;

  const grid = document.createElement('div');
  grid.className = 'form-grid';
  grid.innerHTML = `
    <label>
      Waiting time (minutes)
      <input type="number" name="waiting_minutes" min="0" max="180" value="5" required>
    </label>
    <label>
      Cooking time (minutes)
      <input type="number" name="cooking_minutes" min="1" max="240" value="15" required>
    </label>
    <label>
      Delivery time (minutes)
      <input type="number" name="delivery_minutes" min="1" max="240" value="20" required>
    </label>
  `;

  const submit = form.querySelector('button[type="submit"]');
  if (submit) form.insertBefore(grid, submit);
  else form.appendChild(grid);
}

function fillSettingsForms() {
  ensureDeliveryTimeFields();

  const a = $('#appearanceForm');
  const d = $('#deliveryForm');

  for (const k of [
    'store_name', 'slogan', 'logo_url', 'theme_color',
    'background_color', 'font_family', 'banner_url'
  ]) {
    if (a.elements[k]) {
      a.elements[k].value = settings[k] ?? defaultSettings[k] ?? '';
    }
  }

  const timeDefaults = {
    waiting_minutes: 5,
    cooking_minutes: 15,
    delivery_minutes: 20
  };

  for (const k of [
    'store_address', 'facebook_url', 'maps_api_key',
    'delivery_base_fee', 'delivery_per_km', 'max_delivery_km',
    'waiting_minutes', 'cooking_minutes', 'delivery_minutes'
  ]) {
    if (d.elements[k]) {
      d.elements[k].value =
        settings[k] ?? timeDefaults[k] ?? defaultSettings[k] ?? '';
    }
  }
}

  async function saveSettings(values){if(db){for(const [key,value] of Object.entries(values)){const {error}=await db.from('store_settings').upsert({key,value},{onConflict:'key'});if(error)throw error;}}else{settings={...settings,...values};demoWrite('settings',settings);}settings={...settings,...values};applySettings();}
  $('#appearanceForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const fd=new FormData(f);try{let logo_url=String(fd.get('logo_url')||'').trim(),banner_url=String(fd.get('banner_url')||'').trim();if(f.elements.logo_file.files[0])logo_url=await uploadFile(f.elements.logo_file.files[0],'logos');if(f.elements.banner_file.files[0])banner_url=await uploadFile(f.elements.banner_file.files[0],'banners');await saveSettings({store_name:String(fd.get('store_name')).trim(),slogan:String(fd.get('slogan')).trim(),logo_url,theme_color:String(fd.get('theme_color')),background_color:String(fd.get('background_color')),font_family:String(fd.get('font_family')),banner_url});toast('Na-save ang website appearance.');}catch(err){toast('Hindi na-save: '+err.message);}};
  
$('#deliveryForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.currentTarget;
  const fd = new FormData(f);

  try {
    await saveSettings({
      store_address: String(fd.get('store_address') || '').trim(),
      facebook_url: String(fd.get('facebook_url') || '').trim(),
      maps_api_key: String(fd.get('maps_api_key') || '').trim(),
      delivery_base_fee: Number(fd.get('delivery_base_fee')),
      delivery_per_km: Number(fd.get('delivery_per_km')),
      max_delivery_km: Number(fd.get('max_delivery_km')),
      waiting_minutes: Number(fd.get('waiting_minutes')),
      cooking_minutes: Number(fd.get('cooking_minutes')),
      delivery_minutes: Number(fd.get('delivery_minutes'))
    });

    toast('Na-save ang store, delivery at time settings.');
  } catch (err) {
    toast('Hindi na-save: ' + err.message);
  }
};

  $$('[data-admin-tab]').forEach(b=>b.onclick=()=>{$$('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('.admin-section').forEach(s=>s.hidden=true);$('#admin'+b.dataset.adminTab[0].toUpperCase()+b.dataset.adminTab.slice(1)).hidden=false;});

  // =====================================
  // SIKAIN LOYALTY REWARDS
  // Customer verification uses phone + a completed order code.
  // =====================================
 
function ensureLoyaltyCustomerUI() {
  if ($('#sikainLoyaltyCustomer')) return;

  const menuGrid = $('#menuGrid');
  if (!menuGrid) return;

  const section = document.createElement('section');
  section.id = 'sikainLoyaltyCustomer';
  section.className = 'panel';
  section.style.cssText = 'margin:24px 0;padding:22px;overflow:hidden;';

  section.innerHTML = `
    <style>
      #sikainLoyaltyCustomer {
        background:linear-gradient(145deg,#fff8ec,#fff0dc);
        border:2px solid #e76f24;
        border-radius:20px;
      }

      .sikain-wheel-area {
        position:relative;
        width:min(82vw,340px);
        margin:30px auto 20px;
        padding-top:12px;
      }

      #loyaltyWheel {
        width:100%;
        aspect-ratio:1;
        border-radius:50%;
        display:block;
        transition:transform 5.5s cubic-bezier(.12,.75,.12,1);
        filter:drop-shadow(0 7px 9px #0003);
      }

      .sikain-wheel-pointer {
        position:absolute;
        z-index:5;
        top:-7px;
        left:50%;
        transform:translateX(-50%);
        width:0;
        height:0;
        border-left:19px solid transparent;
        border-right:19px solid transparent;
        border-top:40px solid #d92323;
        filter:drop-shadow(0 3px 2px #0005);
      }

      .sikain-wheel-center {
        position:absolute;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        width:76px;
        height:76px;
        border-radius:50%;
        background:#fff;
        border:6px solid #8b451f;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900;
        color:#e76f24;
        box-shadow:0 3px 8px #0003;
        z-index:2;
      }

      .sikain-wheel-spin {
        width:100%;
        max-width:300px;
        padding:15px;
        border:0;
        border-radius:30px;
        background:linear-gradient(135deg,#e76f24,#ff9c35);
        color:white;
        font-size:18px;
        font-weight:900;
        cursor:pointer;
        box-shadow:0 5px 12px #0002;
      }

      .sikain-wheel-spin:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .sikain-progress {
        height:15px;
        border-radius:20px;
        background:#ead9c8;
        overflow:hidden;
        margin:10px 0;
      }

      .sikain-progress-fill {
        height:100%;
        background:linear-gradient(90deg,#e76f24,#ffbd43);
        border-radius:20px;
        transition:width .4s;
      }

      .sikain-wheel-result {
        padding:18px;
        border-radius:16px;
        background:#fff;
        border:2px dashed #e76f24;
        margin-top:16px;
      }

      .sikain-wheel-prize-list {
        display:flex;
        flex-wrap:wrap;
        justify-content:center;
        gap:7px;
        margin:14px 0;
      }

      .sikain-wheel-prize-list span {
        background:#fff;
        border:1px solid #e8c6a8;
        border-radius:20px;
        padding:6px 11px;
        font-size:12px;
        font-weight:700;
      }
    </style>

    <div style="text-align:center">
      <div style="font-size:36px">🎡</div>
      <h2>SIKAIN LUCKY WHEEL</h2>
      <p>Order more. Collect points. Win free food!</p>
    </div>

    <form id="loyaltyCheckForm" class="form-grid">
      <label>Cellphone number
        <input name="phone" required inputmode="tel"
          maxlength="30" placeholder="09XXXXXXXXX">
      </label>

      <label>Completed order number
        <input name="order_code" required maxlength="30"
          placeholder="Hal. SK-ABC123">
      </label>

      <div class="wide">
        <button class="primary-btn" type="submit">
          CHECK MY REWARDS
        </button>
      </div>
    </form>

    <div id="loyaltyCustomerResult" aria-live="polite"></div>
  `;

  menuGrid.insertAdjacentElement('afterend', section);

  $('#loyaltyCheckForm').onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get('phone') || '').trim();
    const order_code = String(fd.get('order_code') || '').trim();
    const result = $('#loyaltyCustomerResult');

    result.textContent = 'Checking your rewards...';

    try {
      const { data, error } = await db.rpc(
        'sikain_get_loyalty_progress',
        {
          p_phone: phone,
          p_order_code: order_code
        }
      );

      if (error) throw error;

      const progress = Array.isArray(data) ? data[0] : data;

      if (!progress) {
        throw new Error(
          'Walang loyalty record. Siguraduhing Completed na ang order.'
        );
      }

      const completed = Number(progress.completed_orders || 0);
      const spins = Number(progress.spins_available || 0);

      const { data: setting, error: settingError } = await db
        .from('sikain_loyalty_settings')
        .select('event_open,orders_per_spin')
        .eq('id', 1)
        .maybeSingle();

      if (settingError) throw settingError;

      const threshold = Math.max(
        1,
        Number(setting?.orders_per_spin || 5)
      );

      const eventOpen = !!setting?.event_open;

      const remainder = completed % threshold;
      const current = remainder === 0 && completed > 0
        ? threshold
        : remainder;

      const percentage = Math.min(
        100,
        current / threshold * 100
      );

      const { data: prizeRows, error: prizeError } = await db
  .from('sikain_loyalty_prizes')
  .select('id,product_id,prize_name,prize_type,prize_value,prize_image,prize_quantity,win_probability,products(id,name,available,stock_qty)')
  .eq('enabled', true);

if (prizeError) throw prizeError;

const wheelPrizes = (prizeRows || []).filter(x => {
  const quantity = Number(x.prize_quantity || 0);
  const hasQuantity = quantity === 0 || quantity > 0;
  const product = x.products;

  const productAvailable = !x.product_id ||
    (product &&
      product.available === true &&
      (product.stock_qty == null || Number(product.stock_qty) > 0));

  return hasQuantity &&
    productAvailable &&
    Number(x.win_probability || 0) > 0;
});

const prizeLabel = x =>
  String(x.prize_name || x.products?.name || 'SIKAIN Reward');

      if (!wheelPrizes.length && eventOpen && spins > 0) {
        throw new Error(
          'Wala pang enabled prizes. Makipag-ugnayan sa SIKAIN.'
        );
      }

      const colors = [
        '#e76f24',
        '#ffc247',
        '#df5545',
        '#6dbb91',
        '#548bc4',
        '#a77bc5',
        '#f08caa',
        '#d7a83c',
        '#55aeb0',
        '#edaa55'
      ];

      result.innerHTML = `
        <div style="margin-top:22px;text-align:center">

          <h3>YOUR LOYALTY PROGRESS</h3>

          <div style="display:flex;justify-content:space-around;gap:10px">
            <div>
              <strong style="font-size:25px">${completed}</strong>
              <p class="small muted">Completed orders</p>
            </div>

            <div>
              <strong style="font-size:25px">${spins}</strong>
              <p class="small muted">Available spins</p>
            </div>
          </div>

          <p><strong>Progress: ${current}/${threshold}</strong></p>

          <div class="sikain-progress">
            <div class="sikain-progress-fill"
              style="width:${percentage}%"></div>
          </div>

          <p class="small muted">
            ${current >= threshold
              ? 'Congratulations! Naabot mo na ang required orders.'
              : `${threshold - current} more completed orders bago ang next spin.`}
          </p>

          <p style="font-weight:bold;color:${eventOpen ? '#16834a' : '#c0392b'}">
            ${eventOpen ? '● EVENT OPEN' : '● EVENT CLOSED'}
          </p>

          <h3 style="margin-top:25px">SPIN TO WIN!</h3>

          <div class="sikain-wheel-area">
            <div class="sikain-wheel-pointer"></div>

            <canvas id="loyaltyWheel"
              width="700" height="700"></canvas>

            <div class="sikain-wheel-center">SIKAIN</div>
          </div>

          <div class="sikain-wheel-prize-list">
           ${wheelPrizes.map(x =>
  `<span>🎁 ${esc(prizeLabel(x))}</span>`
).join('')}
          </div>

          <button type="button"
            class="sikain-wheel-spin"
            id="loyaltySpinButton"
            ${(!eventOpen || spins < 1 || !wheelPrizes.length) ? 'disabled' : ''}>
            🎡 SPIN THE WHEEL
          </button>

          <div id="loyaltyWinResult"></div>

        </div>
      `;

      // DRAW THE ACTUAL PRIZE WHEEL
      const canvas = $('#loyaltyWheel');
      const ctx = canvas.getContext('2d');

      
const wheelImageCache = {};

function drawWheel() {
  const cx = 350;
  const cy = 350;
  const radius = 330;
  const count = wheelPrizes.length;

  ctx.clearRect(0, 0, 700, 700);

  if (!count) {
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const slice = Math.PI * 2 / count;

  wheelPrizes.forEach((item, i) => {
    const start = -Math.PI / 2 + i * slice;
    const middle = start + slice / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(middle);

    const imageUrl = item.prize_image || item.products?.image_url || '';
    const imageX = 190;
    const imageSize = 76;

    if (imageUrl) {
      if (!(imageUrl in wheelImageCache)) {
        const img = new Image();
        wheelImageCache[imageUrl] = img;
        img.onload = () => drawWheel();
        img.onerror = () => {
          wheelImageCache[imageUrl] = null;
          drawWheel();
        };
        img.src = imageUrl;
      }

      const img = wheelImageCache[imageUrl];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(imageX, 0, imageSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          img,
          imageX - imageSize / 2,
          -imageSize / 2,
          imageSize,
          imageSize
        );
        ctx.restore();
      } else {
        ctx.font = '42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎁', imageX, 0);
      }
    } else {
      ctx.font = '42px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎁', imageX, 0);
    }

    let name = prizeLabel(item);
    if (name.length > 17) name = name.slice(0, 15) + '...';

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 23px Arial';
    ctx.fillText(name, radius - 25, 0, 125);

    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#8b451f';
  ctx.lineWidth = 15;
  ctx.stroke();

  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24;
    const x = cx + Math.cos(a) * 340;
    const y = cy + Math.sin(a) * 340;

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
  }
}

drawWheel();


      const spinButton = $('#loyaltySpinButton');

      spinButton.onclick = async () => {
        spinButton.disabled = true;
        spinButton.textContent = '🎡 SPINNING...';

        try {
          // Supabase decides the actual winning prize
          const { data: win, error: spinError } = await db.rpc(
            'sikain_spin_wheel',
            {
              p_phone: phone,
              p_order_code: order_code
            }
          );

          if (spinError) throw spinError;

          const prize = Array.isArray(win) ? win[0] : win;

          if (!prize) {
            throw new Error('Walang reward result.');
          }

          const winningName = String(prize.product_name || '');

const prizeIndex = wheelPrizes.findIndex(x => {
  if (prize.product_id) {
    return String(x.product_id) === String(prize.product_id);
  }

  return !x.product_id && prizeLabel(x) === winningName;
});

          if (prizeIndex < 0) {
            throw new Error(
              'Hindi makita ang winning prize sa wheel.'
            );
          }

          // Align winning segment with fixed top arrow
          const sliceDegrees = 360 / wheelPrizes.length;

          const centerDegrees =
            prizeIndex * sliceDegrees + sliceDegrees / 2 - 90;

          const targetDegrees =
            ((-90 - centerDegrees) % 360 + 360) % 360;

          const rotation = 360 * 7 + targetDegrees;

          const wheel = $('#loyaltyWheel');
          wheel.style.transform = `rotate(${rotation}deg)`;

          setTimeout(() => {
            $('#loyaltyWinResult').innerHTML = `
              <div class="sikain-wheel-result">

                <div style="font-size:45px">🎉🏆🎉</div>

                <h2 style="color:#e76f24">
                  CONGRATULATIONS!
                </h2>

                <p>You won:</p>

                <h2>${esc(prize.product_name)}</h2>

                <p>Your SIKAIN reward code:</p>

                <strong style="
                  font-size:22px;
                  letter-spacing:2px;
                  color:#e76f24">
                  ${esc(prize.reward_code)}
                </strong>

                <p class="small muted">
                  Ipakita ang code sa cashier.
                  Isang beses lang ito puwedeng i-redeem.
                </p>

                <button type="button"
                  class="outline-btn"
                  id="loyaltyCheckAgain">
                  CHECK UPDATED REWARDS
                </button>

              </div>
            `;

            spinButton.textContent = '🎉 YOU WON!';

            $('#loyaltyCheckAgain').onclick = () => {
              $('#loyaltyCheckForm').requestSubmit();
            };

          }, 5700);

        } catch (err) {
          console.error('SIKAIN spin error:', err);

          toast('Hindi makapag-spin: ' +
            (err.message || String(err)));

          spinButton.disabled = false;
          spinButton.textContent = '🎡 SPIN THE WHEEL';
        }
      };

    } catch (err) {
      console.error('Loyalty error:', err);

      result.innerHTML = `
        <p style="color:#b42318">
          ${esc(err.message || String(err))}
        </p>
      `;
    }
  };
}


  
function ensureLoyaltyAdminUI() {
  const tabs = $('.admin-tabs');
  const content = $('#adminContent');
  if (!tabs || !content || $('#adminLoyalty')) return;

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab-btn';
  tab.textContent = '🎡 Loyalty Rewards';
  tab.onclick = () => {
    $$('.admin-tabs .tab-btn').forEach(x =>
      x.classList.toggle('active', x === tab)
    );
    $$('.admin-section').forEach(x => x.hidden = true);
    $('#adminLoyalty').hidden = false;
    loadLoyaltyAdmin();
  };
  tabs.appendChild(tab);

  const section = document.createElement('section');
  section.id = 'adminLoyalty';
  section.className = 'admin-section';
  section.hidden = true;

  section.innerHTML = `
    <h2>SIKAIN Loyalty Rewards</h2>

    <div class="panel" style="padding:16px;margin-bottom:16px">
      <h3>Event control</h3>
      <p id="loyaltyEventStatus">Loading event...</p>
      <button type="button" id="loyaltyEventToggle" class="primary-btn">Loading...</button>

      <label>Completed orders required per spin
        <input id="loyaltyOrdersRequired" type="number" min="1" max="100" value="5">
      </label>
      <button type="button" id="saveLoyaltySettings" class="outline-btn">Save event settings</button>
    </div>

    <div class="panel" style="padding:16px;margin-bottom:16px">
      <h3>Add existing menu prize</h3>
      <label>Select menu product
        <select id="loyaltyPrizeProduct">
          <option value="">Choose a product...</option>
        </select>
      </label>
      <button type="button" id="addLoyaltyPrize" class="primary-btn">+ Add menu prize</button>
    </div>

    <div class="panel" style="padding:16px;margin-bottom:16px">
      <h3>Add custom prize</h3>

      <label>Prize name
        <input id="customPrizeName" placeholder="Example: Free Softdrinks">
      </label>

      <label>Prize type
        <select id="customPrizeType">
          <option value="product">Product / Free item</option>
          <option value="cash">Cash</option>
          <option value="discount">Discount</option>
          <option value="voucher">Voucher</option>
          <option value="custom">Custom reward</option>
        </select>
      </label>

      <label>Prize value (₱ or discount amount)
        <input id="customPrizeValue" type="number" min="0" step="0.01" value="0">
      </label>

      <label>Winning probability / weight
        <input id="customPrizeProbability" type="number" min="0.01" step="0.01" value="1">
      </label>

      <label>Available quantity (0 = unlimited)
        <input id="customPrizeQuantity" type="number" min="0" step="1" value="0">
      </label>

      <label>Prize image
        <input id="customPrizeImage" type="file" accept="image/*">
      </label>

      <button type="button" id="addCustomLoyaltyPrize" class="primary-btn">
        + Save custom prize
      </button>
    </div>

    <div class="panel" style="padding:16px;margin-bottom:16px">
      <h3>Manage wheel prizes</h3>
      <p class="small muted">
        Ang probability ay relative weight. Mas mataas ang value, mas mataas ang chance.
        Ang quantity na 0 ay unlimited.
      </p>
      <div id="loyaltyPrizeList">Loading prizes...</div>
    </div>

    <div class="panel" style="padding:16px">
      <h3>Redeem reward</h3>
      <label>Reward code
        <input id="loyaltyRedeemCode" placeholder="SIKAIN-XXXXXXXX">
      </label>
      <button type="button" id="redeemLoyaltyReward" class="primary-btn">
        Mark as Redeemed
      </button>
    </div>
  `;

  content.appendChild(section);

  $('#loyaltyEventToggle').onclick = async () => {
    const { data, error } = await db.from('sikain_loyalty_settings')
      .select('event_open').eq('id', 1).single();

    if (error) return toast(error.message);

    const { error: updateError } = await db.from('sikain_loyalty_settings')
      .update({
        event_open: !data.event_open,
        updated_at: new Date().toISOString()
      }).eq('id', 1);

    if (updateError) return toast(updateError.message);
    await loadLoyaltyAdmin();
  };

  $('#saveLoyaltySettings').onclick = async () => {
    const n = Number($('#loyaltyOrdersRequired').value);

    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return toast('Ilagay ang 1 hanggang 100.');
    }

    const { error } = await db.from('sikain_loyalty_settings')
      .update({
        orders_per_spin: n,
        updated_at: new Date().toISOString()
      }).eq('id', 1);

    if (error) toast(error.message);
    else toast('Na-save ang loyalty settings.');
  };

  $('#addLoyaltyPrize').onclick = async () => {
    const product_id = $('#loyaltyPrizeProduct').value;
    if (!product_id) return toast('Pumili muna ng product.');

    const { error } = await db.from('sikain_loyalty_prizes')
      .upsert({ product_id, enabled: true }, { onConflict: 'product_id' });

    if (error) toast(error.message);
    else {
      toast('Naidagdag ang menu prize.');
      await loadLoyaltyAdmin();
    }
  };

  $('#addCustomLoyaltyPrize').onclick = async () => {
    const name = $('#customPrizeName').value.trim();
    const type = $('#customPrizeType').value;
    const value = Number($('#customPrizeValue').value);
    const probability = Number($('#customPrizeProbability').value);
    const quantity = Number($('#customPrizeQuantity').value);
    const file = $('#customPrizeImage').files[0];

    if (!name) return toast('Ilagay ang prize name.');
    if (!Number.isFinite(value) || value < 0) return toast('Invalid prize value.');
    if (!Number.isFinite(probability) || probability <= 0) return toast('Probability must be above 0.');
    if (!Number.isInteger(quantity) || quantity < 0) return toast('Invalid quantity.');

    let imageUrl = null;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = 'loyalty/' + Date.now() + '-' + safeName;

      const { error: uploadError } = await db.storage
        .from('food-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) return toast('Image upload error: ' + uploadError.message);

      const { data: imageData } = db.storage
        .from('food-photos')
        .getPublicUrl(path);

      imageUrl = imageData.publicUrl;
    }

    const { error } = await db.from('sikain_loyalty_prizes')
      .insert({
        product_id: null,
        prize_name: name,
        prize_type: type,
        prize_value: value,
        prize_image: imageUrl,
        win_probability: probability,
        prize_quantity: quantity,
        enabled: true
      });

    if (error) return toast(error.message);

    toast('Naidagdag ang custom prize!');
    $('#customPrizeName').value = '';
    $('#customPrizeValue').value = '0';
    $('#customPrizeProbability').value = '1';
    $('#customPrizeQuantity').value = '0';
    $('#customPrizeImage').value = '';

    await loadLoyaltyAdmin();
  };

  $('#redeemLoyaltyReward').onclick = async () => {
    const code = $('#loyaltyRedeemCode').value.trim();
    if (!code) return toast('Ilagay ang reward code.');

    const { data, error } = await db.rpc(
      'sikain_redeem_loyalty_reward',
      { p_code: code }
    );

    if (error) toast('Hindi na-redeem: ' + error.message);
    else {
      toast('Redeemed: ' + data);
      $('#loyaltyRedeemCode').value = '';
    }
  };
}


 
async function loadLoyaltyAdmin() {
  if (!db) return;

  const { data: settingsRow, error: settingsError } = await db
    .from('sikain_loyalty_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (settingsError) return toast(settingsError.message);

  $('#loyaltyEventStatus').textContent =
    settingsRow.event_open ? 'Event status: OPEN' : 'Event status: CLOSED';

  $('#loyaltyEventToggle').textContent =
    settingsRow.event_open ? 'CLOSE EVENT' : 'OPEN EVENT';

  $('#loyaltyOrdersRequired').value = settingsRow.orders_per_spin || 5;

  const select = $('#loyaltyPrizeProduct');

  select.innerHTML = '<option value="">Choose a product...</option>' +
    products.map(p =>
      `<option value="${esc(p.id)}">${esc(p.name)} — ${money(p.price)}</option>`
    ).join('');

  const { data: prizes, error } = await db
    .from('sikain_loyalty_prizes')
    .select('id,product_id,enabled,prize_name,prize_type,prize_value,prize_image,win_probability,prize_quantity,products(id,name,price,image_url,available,stock_qty)')
    .order('created_at', { ascending: false });

  if (error) return toast(error.message);

  $('#loyaltyPrizeList').innerHTML = prizes?.length
    ? prizes.map(pr => {
        const p = pr.products || {};
        const name = pr.prize_name || p.name || 'Deleted product';
        const type = pr.prize_type || 'product';
        const probability = Number(pr.win_probability || 0);
        const quantity = Number(pr.prize_quantity || 0);
        const image = pr.prize_image || p.image_url || '';

        return `
          <div class="admin-product" style="display:flex;gap:10px;align-items:center;margin:12px 0;padding:10px;border-bottom:1px solid #ddd">
            ${image ? `<img src="${esc(image)}" alt="" style="width:65px;height:65px;object-fit:cover;border-radius:8px">` : ''}
            <div style="flex:1;min-width:0">
              <strong>${esc(name)}</strong>
              <p>${esc(type)} · Value: ${money(Number(pr.prize_value || p.price || 0))}</p>
              <p>Weight: ${probability} · Quantity: ${quantity === 0 ? 'Unlimited' : quantity}</p>
              <p>${pr.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <button type="button" class="outline-btn" data-prize-edit="${esc(pr.id)}">Edit</button>
            <button type="button" class="outline-btn" data-prize-toggle="${esc(pr.id)}" data-enabled="${pr.enabled}">${pr.enabled ? 'Disable' : 'Enable'}</button>
            <button type="button" class="outline-btn" data-prize-delete="${esc(pr.id)}">Remove</button>
          </div>
        `;
      }).join('')
    : '<p class="muted">Wala pang prizes.</p>';

  $$('[data-prize-edit]').forEach(b => b.onclick = async () => {
    const pr = prizes.find(x => String(x.id) === b.dataset.prizeEdit);
    if (!pr) return;

    const name = prompt('Prize name:', pr.prize_name || pr.products?.name || '');
    if (name === null) return;
    if (!name.trim()) return toast('Kailangan ang prize name.');

    const probabilityText = prompt('Winning probability / weight:', String(pr.win_probability ?? 1));
    if (probabilityText === null) return;

    const quantityText = prompt('Quantity (0 = unlimited):', String(pr.prize_quantity ?? 0));
    if (quantityText === null) return;

    const valueText = prompt('Prize value:', String(pr.prize_value ?? 0));
    if (valueText === null) return;

    const probability = Number(probabilityText);
    const quantity = Number(quantityText);
    const value = Number(valueText);

    if (!Number.isFinite(probability) || probability <= 0) return toast('Invalid probability.');
    if (!Number.isInteger(quantity) || quantity < 0) return toast('Invalid quantity.');
    if (!Number.isFinite(value) || value < 0) return toast('Invalid value.');

    const { error: updateError } = await db
      .from('sikain_loyalty_prizes')
      .update({
        prize_name: name.trim(),
        win_probability: probability,
        prize_quantity: quantity,
        prize_value: value
      })
      .eq('id', pr.id);

    if (updateError) toast(updateError.message);
    else {
      toast('Na-update ang prize.');
      await loadLoyaltyAdmin();
    }
  });

  $$('[data-prize-toggle]').forEach(b => b.onclick = async () => {
    const { error: e } = await db
      .from('sikain_loyalty_prizes')
      .update({ enabled: b.dataset.enabled !== 'true' })
      .eq('id', b.dataset.prizeToggle);

    if (e) toast(e.message);
    else await loadLoyaltyAdmin();
  });

  $$('[data-prize-delete]').forEach(b => b.onclick = async () => {
    if (!confirm('Sigurado ka bang aalisin ang prize na ito?')) return;

    const { error: e } = await db
      .from('sikain_loyalty_prizes')
      .delete()
      .eq('id', b.dataset.prizeDelete);

    if (e) toast(e.message);
    else {
      toast('Naalis ang prize.');
      await loadLoyaltyAdmin();
    }
  });
}


(async function initCustomerPage() {
  console.log('SIKAIN: Starting customer page...');

  try {
    console.log('SIKAIN: Loading settings...');
    await loadSettings();
    console.log('SIKAIN: Settings loaded.');

  } catch (error) {
    console.error('SIKAIN SETTINGS INIT ERROR:', error);
  }

  try {
    console.log('SIKAIN: Loading products...');
    await loadProducts();
    console.log('SIKAIN: Products loaded.');

  } catch (error) {
    console.error('SIKAIN PRODUCTS INIT ERROR:', error);
  }
})();
