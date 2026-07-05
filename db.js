/**
 * db.js - Supabase 数据库模块（共享）
 * 所有页面通过 <script src="../db.js"> 引入
 */
var SUPABASE_URL = 'https://vxbsdiatvoydqpxpwpbl.supabase.co';
var SUPABASE_KEY = 'sb_publishable_wtwZzjyT171YTV1nU7wvcQ_3P1iAQh3';

// Supabase REST API 封装（不用 SDK，直接用 fetch）
function sbFetch(table, method, body, query) {
  var url = SUPABASE_URL + '/rest/v1/' + table;
  if (query) {
    var parts = [];
    for (var k in query) {
      if (query.hasOwnProperty(k)) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
    }
    if (parts.length) url += '?' + parts.join('&');
  }
  var opts = {
    method: method || 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts).then(function(r) {
    if (!r.ok) throw new Error('Supabase error: ' + r.status);
    // DELETE/204 and some PATCH responses have no body
    if (r.status === 204 || r.status === 205) return null;
    return r.json();
  });
}

// ===== 用户身份管理 =====
function getNickname() {
  return localStorage.getItem('user_nickname') || '';
}

function isLoggedIn() {
  return !!getNickname();
}

function login(nickname) {
  localStorage.setItem('user_nickname', nickname);
  DB.nickname = nickname;
}

function logout() {
  localStorage.removeItem('user_nickname');
  DB.nickname = '';
}

// 显示登录弹窗（如果未登录）
function ensureLogin(callback) {
  if (isLoggedIn()) {
    if (callback) callback(getNickname());
    return;
  }
  showLoginModal(callback);
}

// 登录弹窗 UI
function showLoginModal(callback) {
  // 移除已有弹窗
  var existing = document.getElementById('login-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.setAttribute('style', 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:"Noto Sans SC",system-ui,sans-serif;');

  var card = document.createElement('div');
  card.setAttribute('style', 'background:#fff;border-radius:20px;padding:36px 32px 28px;width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.15);');

  card.innerHTML = '<div style="font-size:3rem;margin-bottom:12px;">&#x1F31F;</div>'
    + '<h2 style="margin:0 0 6px;font-size:1.3rem;color:#1F2937;font-family:"ZCOOL KuaiLe",sans-serif;">欢迎来到打卡乐园</h2>'
    + '<p style="margin:0 0 20px;font-size:0.85rem;color:#9CA3AF;">输入你的昵称，开始学习之旅吧！</p>'
    + '<input id="login-input" type="text" placeholder="请输入昵称" maxlength="12" style="width:100%;padding:12px 16px;border:2px solid #FDE8EF;border-radius:12px;font-size:1rem;outline:none;text-align:center;font-family:inherit;box-sizing:border-box;transition:border-color 0.2s;" onfocus="this.style.borderColor=\'#FF6B9D\'" onblur="this.style.borderColor=\'#FDE8EF\'">'
    + '<button id="login-btn" style="margin-top:16px;width:100%;padding:14px;border:none;border-radius:12px;font-size:1.1rem;font-weight:700;color:#fff;background:linear-gradient(135deg,#FF6B9D,#A855F7,#38BDF8);cursor:pointer;font-family:"ZCOOL KuaiLe",sans-serif;letter-spacing:0.05em;transition:transform 0.15s,box-shadow 0.15s;" onmouseenter="this.style.transform=\'scale(1.02)\';this.style.boxShadow=\'0 8px 24px rgba(168,85,247,0.3)\'" onmouseleave="this.style.transform=\'scale(1)\';this.style.boxShadow=\'none\'">开始打卡</button>';

  modal.appendChild(card);
  document.body.appendChild(modal);

  var input = document.getElementById('login-input');
  var btn = document.getElementById('login-btn');

  // 自动聚焦
  setTimeout(function() { input.focus(); }, 100);

  function doLogin() {
    var name = input.value.trim();
    if (!name) {
      input.style.borderColor = '#F87171';
      input.setAttribute('placeholder', '昵称不能为空哦~');
      input.focus();
      return;
    }
    login(name);
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s';
    setTimeout(function() { modal.remove(); }, 300);
    if (callback) callback(name);
  }

  btn.addEventListener('click', doLogin);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
  });
}

// ===== 数据库操作 =====
var DB = {
  nickname: getNickname(),

  // 获取用户信息（通过昵称）
  getUser: function() {
    if (!DB.nickname) return Promise.resolve(null);
    return sbFetch('users', 'GET', null, {
      'nickname': 'eq.' + DB.nickname,
      'select': '*'
    }).then(function(data) {
      return data && data.length > 0 ? data[0] : null;
    });
  },

  // 初始化用户（如果不存在则创建）
  initUser: function() {
    if (!DB.nickname) return Promise.resolve(null);
    return DB.getUser().then(function(user) {
      if (user) return user;
      return sbFetch('users', 'POST', {
        user_code: 'U' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        nickname: DB.nickname,
        total_coins: 0
      }).then(function(data) {
        return data && data.length > 0 ? data[0] : null;
      });
    });
  },

  // 更新用户字段
  updateUser: function(updates) {
    if (!DB.nickname) return Promise.resolve(null);
    return sbFetch('users', 'PATCH', updates, {
      'nickname': 'eq.' + DB.nickname
    }).then(function(data) {
      return data && data.length > 0 ? data[0] : null;
    });
  },

  // 获取单日打卡数据
  getCheckin: function(date) {
    if (!DB.nickname) return Promise.resolve(null);
    return DB.getUser().then(function(user) {
      if (!user) return null;
      return sbFetch('checkins', 'GET', null, {
        'user_code': 'eq.' + user.user_code,
        'date': 'eq.' + date,
        'select': '*'
      }).then(function(data) {
        return data && data.length > 0 ? data[0] : null;
      });
    });
  },

  saveCheckin: function(date, completedTasks, completedCount, totalCount, coinsEarned) {
    if (!DB.nickname) return Promise.resolve(null);
    // 获取用户的 user_code 来关联
    return DB.getUser().then(function(user) {
      var userCode = user ? user.user_code : DB.nickname;
      return sbFetch('checkins', 'GET', null, {
        'user_code': 'eq.' + userCode,
        'date': 'eq.' + date,
        'select': '*'
      }).then(function(data) {
        if (data && data.length > 0) {
          return sbFetch('checkins', 'PATCH', {
            completed_tasks: completedTasks,
            completed_count: completedCount,
            total_count: totalCount,
            coins_earned: coinsEarned,
            updated_at: new Date().toISOString()
          }, { 'id': 'eq.' + data[0].id });
        } else {
          return sbFetch('checkins', 'POST', {
            user_code: userCode,
            date: date,
            completed_tasks: completedTasks,
            completed_count: completedCount,
            total_count: totalCount,
            coins_earned: coinsEarned
          });
        }
      });
    });
  },

  // 获取所有打卡数据（用于日历）
  getAllCheckins: function() {
    if (!DB.nickname) return Promise.resolve([]);
    return DB.getUser().then(function(user) {
      if (!user) return [];
      return sbFetch('checkins', 'GET', null, {
        'user_code': 'eq.' + user.user_code,
        'select': '*',
        'order': 'date.desc'
      });
    });
  },

  // 统一统计助手函数
  getUserStats: function() {
    return DB.getAllCheckins().then(function(checkins) {
      var totalDays = checkins.length;
      var totalCoins = checkins.reduce(function(sum, c) { return sum + (c.coins_earned || 0); }, 0);
      return { totalDays: totalDays, totalCoins: totalCoins };
    });
  },

  // 通过 custom_rewards._stats 读写统计数据（避免不存在的列）
  getStats: function() {
    if (!DB.nickname) return Promise.resolve({ won_prizes: [], box_opens: 0, total_earned_coins: 0 });
    return DB.getUser().then(function(user) {
      if (!user || !user.custom_rewards) return { won_prizes: [], box_opens: 0, total_earned_coins: 0 };
      var cr = typeof user.custom_rewards === 'string' ? JSON.parse(user.custom_rewards) : user.custom_rewards;
      return cr._stats || { won_prizes: [], box_opens: 0, total_earned_coins: 0 };
    });
  },
  addStats: function(updates) {
    if (!DB.nickname) return Promise.resolve(false);
    return DB.getUser().then(function(user) {
      if (!user) return false;
      var cr = user.custom_rewards ? (typeof user.custom_rewards === 'string' ? JSON.parse(user.custom_rewards) : user.custom_rewards) : {};
      if (!cr._stats) cr._stats = { won_prizes: [], box_opens: 0, total_earned_coins: 0 };
      for (var k in updates) { if (updates.hasOwnProperty(k)) cr._stats[k] = updates[k]; }
      return sbFetch('users', 'PATCH', { custom_rewards: cr }, { 'user_code': 'eq.' + user.user_code });
    });
  },

  // 清空用户全量数据（打卡记录 + 个人数据）
  clearUserData: function() {
    if (!DB.nickname) return Promise.resolve(false);
    return DB.getUser().then(function(user) {
      if (!user) return false;
      // 1. 删除所有打卡记录
      return sbFetch('checkins', 'DELETE', null, {
        'user_code': 'eq.' + user.user_code
      }).then(function() {
        // 2. 重置用户字段（包括统计累计数）
        return sbFetch('users', 'PATCH', {
          total_coins: 0,
          claimed_achievements: {},
          used_prizes: {},
          daily_free_date: '',
          custom_rewards: { _stats: { won_prizes: [], box_opens: 0, total_earned_coins: 0 } }
        }, {
          'user_code': 'eq.' + user.user_code
        });
      }).then(function() {
        // 3. 清空 localStorage（所有作用域下的 key）
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && (key.indexOf('_prizes') !== -1 || key.indexOf('unlocked_') !== -1 ||
              key.indexOf('_achievements') !== -1 || key.indexOf('checkin_') !== -1 ||
              key.indexOf('_data') !== -1 || key.indexOf('daily_free') !== -1 ||
              key.indexOf('box_opens') !== -1 || key.indexOf('scoped_') !== -1 ||
              key.indexOf('_used') !== -1 || key === 'app_v3_migrated')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(function(k) { try { localStorage.removeItem(k); } catch(e) {} });
        return true;
      });
    });
  }
};
