/**
 * db.js - Supabase 数据库模块（共享）
 * 所有页面通过 <script src="../db.js"> 引入
 */
var SUPABASE_URL = 'https://vxbsdiatvoydqpxpwpbl.supabase.co';
var SUPABASE_KEY = 'sb_publishable_wtwZzjyT171YTV1nU7wvcQ_3P1iAQh3';

// 自动获取或创建用户（基于 localStorage 的 user_code）
function getUserCode() {
  var code = localStorage.getItem('user_code');
  if (!code) {
    code = 'U' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    localStorage.setItem('user_code', code);
  }
  return code;
}

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
    return r.json();
  });
}

// ===== 用户数据 =====
var DB = {
  userCode: getUserCode(),

  // 获取用户信息
  getUser: function() {
    return sbFetch('users', 'GET', null, {
      'user_code': 'eq.' + DB.userCode,
      'select': '*'
    }).then(function(data) {
      return data && data.length > 0 ? data[0] : null;
    });
  },

  // 初始化用户（如果不存在则创建）
  initUser: function() {
    return DB.getUser().then(function(user) {
      if (user) return user;
      return sbFetch('users', 'POST', {
        user_code: DB.userCode,
        nickname: '小公主',
        total_coins: 0
      }).then(function(data) {
        return data && data.length > 0 ? data[0] : null;
      });
    });
  },

  // 更新用户字段
  updateUser: function(updates) {
    return sbFetch('users', 'PATCH', updates, {
      'user_code': 'eq.' + DB.userCode
    }).then(function(data) {
      return data && data.length > 0 ? data[0] : null;
    });
  },

  // ===== 打卡数据 =====
  getCheckin: function(date) {
    return sbFetch('checkins', 'GET', null, {
      'user_code': 'eq.' + DB.userCode,
      'date': 'eq.' + date,
      'select': '*'
    }).then(function(data) {
      return data && data.length > 0 ? data[0] : null;
    });
  },

  saveCheckin: function(date, completedTasks, completedCount, totalCount, coinsEarned) {
    return DB.getCheckin(date).then(function(existing) {
      if (existing) {
        return sbFetch('checkins', 'PATCH', {
          completed_tasks: completedTasks,
          completed_count: completedCount,
          total_count: totalCount,
          coins_earned: coinsEarned,
          updated_at: new Date().toISOString()
        }, { 'id': 'eq.' + existing.id });
      } else {
        return sbFetch('checkins', 'POST', {
          user_code: DB.userCode,
          date: date,
          completed_tasks: completedTasks,
          completed_count: completedCount,
          total_count: totalCount,
          coins_earned: coinsEarned
        });
      }
    });
  },

  // 获取月度打卡数据
  getMonthCheckins: function(yearMonth) {
    return sbFetch('checkins', 'GET', null, {
      'user_code': 'eq.' + DB.userCode,
      'date': 'like.' + yearMonth + '%',
      'select': '*',
      'order': 'date.asc'
    });
  },

  // 获取所有打卡数据（用于日历）
  getAllCheckins: function() {
    return sbFetch('checkins', 'GET', null, {
      'user_code': 'eq.' + DB.userCode,
      'select': '*',
      'order': 'date.desc'
    });
  }
};
