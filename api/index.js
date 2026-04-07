const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SECURE_API_KEY = process.env.API_KEY || 'PB_SECURE_API_KEY_2026';

module.exports = async (req, res) => {
  if (typeof req.body === "string") {
    try { req.body = JSON.parse(req.body); } catch {}
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.json({ success: false, error: 'POST only' });

  try {
    const { action, data = {}, apiKey } = req.body;
    if (apiKey !== SECURE_API_KEY) return res.json({ success: false, error: 'Unauthorized' });

    let result;
    switch (action) {
      case 'login':                result = await loginUser(data); break;
      case 'signup':               result = await signupUser(data); break;
      case 'adminLogin':           result = await adminLogin(data); break;
      case 'staffLogin':           result = await staffLogin(data); break;
      case 'updateProfile':        result = await updateProfile(data); break;
      case 'getMenu':              result = await getMenu(data); break;
      case 'adminGetMenu':         result = await adminGetMenu(); break;
      case 'addMenuItem':          result = await addMenuItem(data); break;
      case 'updateMenuItem':       result = await updateMenuItem(data); break;
      case 'deleteMenuItem':       result = await deleteMenuItem(data); break;
      case 'updateMenuOrder':      result = await updateMenuOrder(data); break;
      case 'createOrder':          result = await createOrder(data); break;
      case 'getUserOrders':        result = await getUserOrders(data); break;
      case 'adminGetOrders':       result = await adminGetOrders(); break;
      case 'updateOrderStatus':    result = await updateOrderStatus(data); break;
      case 'rejectOrder':          result = await rejectOrder(data); break;
      case 'bulkOrdersWithBalance':result = await bulkOrdersWithBalance(data); break;
      case 'adminBulkCreate':      result = await adminBulkCreate(data); break;
      case 'applyCoupon':          result = await applyCoupon(data); break;
      case 'createCoupon':         result = await createCoupon(data); break;
      case 'adminGetCoupons':      result = await adminGetCoupons(); break;
      case 'deleteCoupon':         result = await deleteCoupon(data); break;
      case 'checkSubscriber':      result = await checkSubscriber(data); break;
      case 'adminGetSubscribers':  result = await adminGetSubscribers(); break;
      case 'addSubscriber':        result = await addSubscriber(data); break;
      case 'updateSubscriber':     result = await updateSubscriber(data); break;
      case 'removeSubscriber':     result = await removeSubscriber(data); break;
      case 'getUserByPhone':       result = await getUserByPhone(data); break;
      case 'promoteToSubscriber':  result = await promoteToSubscriber(data); break;
      case 'createRider':          result = await createRider(data); break;
      case 'updateRider':          result = await updateRider(data); break;
      case 'deleteRider':          result = await deleteRider(data); break;
      case 'riderLogin':           result = await riderLogin(data); break;
      case 'getRiderOrders':       result = await getRiderOrders(data); break;
      case 'getRiders':            result = await getRiders(); break;
      case 'assignRider':          result = await assignRider(data); break;
      case 'createStaff':          result = await createStaff(data); break;
      case 'updateStaff':          result = await updateStaff(data); break;
      case 'deleteStaff':          result = await deleteStaff(data); break;
      case 'getStaff':             result = await getStaff(); break;
      case 'getKhata':             result = await getKhata(data); break;
      case 'getSubscriberBalance': result = await getSubscriberBalance(data); break;
      case 'rechargeWallet':       result = await rechargeWallet(data); break;
      case 'adminGetAllKhata':     result = await adminGetAllKhata(); break;
      case 'addKhataEntry':        result = await addKhataEntry(data); break;
      case 'getOrderCutoff':       result = await getOrderCutoff(); break;
      case 'setOrderCutoff':       result = await setOrderCutoff(data); break;
      case 'getWeeklySchedule':    result = await getWeeklySchedule(); break;
      case 'setWeeklySchedule':    result = await setWeeklySchedule(data); break;
      case 'getKhataEnabled':      result = await getKhataEnabled(); break;
      case 'setKhataEnabled':      result = await setKhataEnabled(data); break;
      case 'getAnalytics':         result = await getAnalytics(); break;
      case 'getUsers':             result = await getUsers(); break;
      case 'resetAdminPassword':   result = await resetAdminPassword(data); break;
      case 'forceUdharOrder':      result = await forceUdharOrder(data); break;
      case 'deleteOldData':        result = await deleteOldData(data); break;
      default: return res.json({ success: false, error: 'Unknown action: ' + action });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('API Error:', err);
    return res.json({ success: false, error: err.message });
  }
};

// âââââââââââââââââââââââââââââââââââââââââââ
// HELPERS
// âââââââââââââââââââââââââââââââââââââââââââ
function getIST() {
  return new Date(Date.now() + 5.5 * 3600000);
}
function istDateStr(d) {
  return String(d.getUTCDate()).padStart(2,'0') + '/' +
         String(d.getUTCMonth()+1).padStart(2,'0') + '/' +
         d.getUTCFullYear();
}
function istTimeStr(d) {
  let h = d.getUTCHours(), m = d.getUTCMinutes();
  const p = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ' ' + p;
}
function cleanPhone(p) {
  return String(p || '').replace(/\D/g, '');
}

// âââââââââââââââââââââââââââââââââââââââââââ
// AUTH
// âââââââââââââââââââââââââââââââââââââââââââ
async function signupUser(data) {
  if (!data.phone || !data.password || !data.name) throw new Error('Name, phone, password required');
  const ph = cleanPhone(data.phone);
  const { data: existing } = await supabase.from('users').select('phone').eq('phone', ph).maybeSingle();
  if (existing) throw new Error('Phone already registered');
  const hashed = await bcrypt.hash(String(data.password), 10);
  const { data: user, error } = await supabase.from('users').insert({
    name: data.name, phone: ph,
    email: data.email || '', address: data.address || '',
    password: hashed, role: 'customer'
  }).select().single();
  if (error) throw new Error(error.message);
  return { userId: user.user_id, name: user.name, phone: user.phone, email: user.email || '', address: user.address || '' };
}

async function loginUser(data) {
  if (!data.phone || !data.password) throw new Error('Phone and password required');
  const ph = cleanPhone(data.phone);
  const { data: user } = await supabase.from('users').select('*').eq('phone', ph).maybeSingle();
  if (!user) throw new Error('User not found');
  const match = await bcrypt.compare(String(data.password), user.password);
  if (!match) throw new Error('Incorrect password');
  return { userId: user.user_id, name: user.name, phone: user.phone, email: user.email || '', address: user.address || '' };
}

async function adminLogin(data) {
  if (!data.email || !data.password) throw new Error('Email and password required');
  const email = String(data.email).trim().toLowerCase();
  const { data: setting } = await supabase.from('admin_settings').select('*').eq('admin_id', email).maybeSingle();
  if (!setting) throw new Error('Admin not found');
  const match = await bcrypt.compare(String(data.password), setting.password_hash);
  if (!match) throw new Error('Incorrect password');
  return { email, name: 'Admin', role: 'admin' };
}

async function resetAdminPassword(data) {
  if (!data.newPassword || String(data.newPassword).length < 6) throw new Error('Password must be 6+ characters');
  const hashed = await bcrypt.hash(String(data.newPassword), 10);
  const email = data.email || 'visaryhal2022@vishal.com';
  const { error } = await supabase.from('admin_settings')
    .update({ password_hash: hashed })
    .eq('admin_id', email);
  if (error) throw new Error(error.message);
  return { success: true, message: 'Password updated' };
}

async function updateProfile(data) {
  if (!data.userId) throw new Error('userId required');
  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.address !== undefined) updates.address = data.address;
  if (data.newPassword) updates.password = await bcrypt.hash(String(data.newPassword), 10);
  const { error } = await supabase.from('users').update(updates).eq('user_id', data.userId);
  if (error) throw new Error(error.message);
  return true;
}

async function staffLogin(data) {
  if (!data.username || !data.password) throw new Error('Username and password required');
  const { data: s } = await supabase.from('staff').select('*').eq('username', data.username).maybeSingle();
  if (!s) throw new Error('Invalid credentials');
  const match = await bcrypt.compare(String(data.password), s.password);
  if (!match) throw new Error('Invalid credentials');
  if (s.status !== 'active') throw new Error('Account is inactive');
  return { username: s.username, name: s.name, role: 'staff' };
}

// âââââââââââââââââââââââââââââââââââââââââââ
// MENU
// âââââââââââââââââââââââââââââââââââââââââââ
async function getMenu(data) {
  const ist = getIST();
  const h = ist.getUTCHours() + ist.getUTCMinutes() / 60;
  const menuType = h < 11.5 ? 'morning' : 'evening';
  const { data: items, error } = await supabase.from('menu')
    .select('*').eq('availability', true).eq('menu_type', menuType)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (items || []).map(formatMenuItem);
}

async function adminGetMenu() {
  const { data: items, error } = await supabase.from('menu')
    .select('*').order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (items || []).map(formatMenuItem);
}

function formatMenuItem(i) {
  let variants = [];
  try { variants = i.variant ? JSON.parse(i.variant) : []; } catch { variants = []; }
  return {
    itemId: i.item_id, name: i.name, category: i.category || '',
    price: Number(i.price) || 0, variants,
    imageUrl: i.image_url || '', menuType: i.menu_type || 'morning',
    availability: i.availability, sortOrder: i.sort_order || 9999,
    highlight: i.highlight || ''
  };
}

async function addMenuItem(data) {
  if (!data.name) throw new Error('Item name required');
  const { data: items } = await supabase.from('menu').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const maxSort = items?.[0]?.sort_order || 0;
  const { data: item, error } = await supabase.from('menu').insert({
    name: data.name, category: data.category || '',
    price: Number(data.price) || 0,
    variant: data.variants ? JSON.stringify(data.variants) : null,
    image_url: data.imageUrl || '',
    menu_type: data.menuType || 'morning',
    availability: true,
    highlight: data.highlight || '',
    sort_order: data.sortOrder || (maxSort + 1)
  }).select().single();
  if (error) throw new Error(error.message);
  return { itemId: item.item_id };
}

async function updateMenuItem(data) {
  if (!data.itemId) throw new Error('itemId required');
  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.price !== undefined) updates.price = Number(data.price);
  if (data.variants !== undefined) updates.variant = JSON.stringify(data.variants);
  if (data.imageUrl !== undefined) updates.image_url = data.imageUrl;
  if (data.menuType !== undefined) updates.menu_type = data.menuType;
  if (data.availability !== undefined) updates.availability = data.availability === 'TRUE' || data.availability === true;
  if (data.highlight !== undefined) updates.highlight = data.highlight;
  if (data.sortOrder !== undefined) updates.sort_order = Number(data.sortOrder);
  const { error } = await supabase.from('menu').update(updates).eq('item_id', data.itemId);
  if (error) throw new Error(error.message);
  return true;
}

async function deleteMenuItem(data) {
  if (!data.itemId) throw new Error('itemId required');
  const { error } = await supabase.from('menu').delete().eq('item_id', data.itemId);
  if (error) throw new Error(error.message);
  return true;
}

async function updateMenuOrder(data) {
  if (!data.items || !Array.isArray(data.items)) throw new Error('items array required');
  for (const item of data.items) {
    await supabase.from('menu').update({ sort_order: Number(item.sortOrder) }).eq('item_id', item.itemId);
  }
  return true;
}

// âââââââââââââââââââââââââââââââââââââââââââ
// ORDERS
// âââââââââââââââââââââââââââââââââââââââââââ
async function createOrder(data) {
  if (!data.userId) throw new Error('userId required');
  const items = Array.isArray(data.items) ? data.items : JSON.parse(data.items || '[]');
  if (!items.length) throw new Error('Cart is empty');
  const ist = getIST();
  const { data: order, error } = await supabase.from('orders').insert({
    user_id: data.userId,
    name: data.name, phone: cleanPhone(data.phone), address: data.address,
    items: items,
    total_amount: Number(data.totalAmount) || 0,
    delivery_charge: Number(data.deliveryCharge) || 0,
    final_amount: Number(data.finalAmount) || 0,
    coupon_code: data.couponCode || '',
    discount: Number(data.discount) || 0,
    user_type: data.userType || 'daily',
    payment_status: 'pending',
    order_status: 'pending',
    order_date: istDateStr(ist),
    order_time: istTimeStr(ist)
  }).select().single();
  if (error) throw new Error(error.message);
  if (data.userType === 'subscriber' && data.payFromWallet) {
    const ph = cleanPhone(data.phone);
    const amount = Number(data.finalAmount) || 0;
    await deductWalletBalance(ph, amount, `Order ${order.order_id}`, data.userId);
  }
  if (data.couponCode) await incrementCouponUsage(data.couponCode, cleanPhone(data.phone));
  return { orderId: order.order_id };
}

async function getUserOrders(data) {
  if (!data.userId) throw new Error('userId required');
  const { data: orders, error } = await supabase
    .from('orders').select('*').eq('user_id', data.userId)
    .order('order_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (orders || []).map(formatOrder);
}

async function adminGetOrders() {
  const { data: orders, error } = await supabase
    .from('orders').select('*')
    .order('order_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (orders || []).map(formatOrder);
}

// ─────────────────────────────────────────────────────────────
// DATE / TIME NORMALIZERS
// Supabase returns order_date as DATE ("2026-04-07") and
// order_time as TIME ("09:35:00") when column types are DATE/TIME.
// Frontend always expects "DD/MM/YYYY" and "HH:MM AM/PM".
// These functions handle both raw Supabase values AND already-
// formatted strings (so existing data is never broken).
// ─────────────────────────────────────────────────────────────
function normOrderDate(v) {
  if (!v) return '';
  const s = String(v).trim();
  // Already DD/MM/YYYY — return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // YYYY-MM-DD (Supabase DATE type)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyy, mm, dd] = s.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  // ISO datetime — apply IST offset
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const ist = new Date(new Date(s).getTime() + 5.5 * 3600000);
    if (!isNaN(ist.getTime())) {
      return String(ist.getUTCDate()).padStart(2,'0') + '/' +
             String(ist.getUTCMonth()+1).padStart(2,'0') + '/' +
             ist.getUTCFullYear();
    }
  }
  return s; // fallback — return as-is
}

function normOrderTime(v) {
  if (!v) return '';
  const s = String(v).trim();
  // Already HH:MM AM/PM — return as-is
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(s)) return s;
  // HH:MM:SS (Supabase TIME type) or HH:MM
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    let h = parseInt(m[1]), mn = parseInt(m[2]);
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return String(h).padStart(2,'0') + ':' + String(mn).padStart(2,'0') + ' ' + p;
  }
  // ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const ist = new Date(new Date(s).getTime() + 5.5 * 3600000);
    if (!isNaN(ist.getTime())) {
      let h = ist.getUTCHours(), mn = ist.getUTCMinutes();
      const p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return String(h).padStart(2,'0') + ':' + String(mn).padStart(2,'0') + ' ' + p;
    }
  }
  return s; // fallback
}

function formatOrder(o) {
  return {
    orderId: o.order_id,
    userId: o.user_id,
    name: o.name, phone: o.phone, address: o.address,
    items: typeof o.items === 'string' ? o.items : JSON.stringify(o.items),
    totalAmount: o.total_amount,
    deliveryCharge: o.delivery_charge,
    finalAmount: Number(o.final_amount) || 0,
    couponCode: o.coupon_code || '',
    discount: o.discount || 0,
    userType: o.user_type || 'daily',
    paymentStatus: o.payment_status || 'pending',
    orderStatus: o.order_status || 'pending',
    date: normOrderDate(o.order_date),   // always "DD/MM/YYYY"
    time: normOrderTime(o.order_time),   // always "HH:MM AM/PM"
    riderId: o.rider_id || ''
  };
}

async function updateOrderStatus(data) {
  if (!data.orderId) throw new Error('orderId required');
  const updates = { order_status: data.status };
  if (data.paymentStatus) updates.payment_status = data.paymentStatus;
  if (data.riderId) updates.rider_id = data.riderId;
  const { error } = await supabase.from('orders').update(updates).eq('order_id', data.orderId);
  if (error) throw new Error(error.message);
  return true;
}

async function rejectOrder(data) {
  if (!data.orderId) throw new Error('orderId required');
  const { error } = await supabase.from('orders')
    .update({ order_status: 'rejected' }).eq('order_id', data.orderId);
  if (error) throw new Error(error.message);
  return true;
}

async function forceUdharOrder(data) {
  if (!data.userId) throw new Error('userId required');
  const items = Array.isArray(data.items) ? data.items : JSON.parse(data.items || '[]');
  const ist = getIST();
  const { data: order, error } = await supabase.from('orders').insert({
    user_id: data.userId,
    name: data.name, phone: cleanPhone(data.phone), address: data.address || '',
    items: items,
    total_amount: Number(data.totalAmount) || 0,
    delivery_charge: 0, final_amount: Number(data.finalAmount) || 0,
    coupon_code: '', discount: 0, user_type: 'subscriber',
    payment_status: 'pending', order
