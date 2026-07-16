import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, ChevronDown, X, Settings, HelpCircle, UserCircle, LogOut, Edit2, Check, Phone, Image, Palette, RefreshCw, CreditCard } from 'lucide-react';
import { formatTimeAgo } from '../utils/timeUtils';

const AVATAR_PRESETS = [
  { emoji: '🐼', bg: 'bg-pink-100', fg: 'text-pink-500', ring: 'ring-pink-300' },
  { emoji: '🐱', bg: 'bg-amber-100', fg: 'text-amber-500', ring: 'ring-amber-300' },
  { emoji: '🐶', bg: 'bg-orange-100', fg: 'text-orange-500', ring: 'ring-orange-300' },
  { emoji: '🦊', bg: 'bg-red-100', fg: 'text-red-500', ring: 'ring-red-300' },
  { emoji: '🐨', bg: 'bg-slate-100', fg: 'text-slate-600', ring: 'ring-slate-300' },
  { emoji: '🦁', bg: 'bg-yellow-100', fg: 'text-yellow-600', ring: 'ring-yellow-300' },
  { emoji: '🐯', bg: 'bg-orange-200', fg: 'text-orange-600', ring: 'ring-orange-400' },
  { emoji: '🐰', bg: 'bg-rose-100', fg: 'text-rose-400', ring: 'ring-rose-300' },
  { emoji: '🦄', bg: 'bg-purple-100', fg: 'text-purple-500', ring: 'ring-purple-300' },
  { emoji: '🐸', bg: 'bg-emerald-100', fg: 'text-emerald-500', ring: 'ring-emerald-300' },
  { emoji: '🦉', bg: 'bg-indigo-100', fg: 'text-indigo-500', ring: 'ring-indigo-300' },
  { emoji: '🐧', bg: 'bg-sky-100', fg: 'text-sky-600', ring: 'ring-sky-300' },
  { emoji: '🐳', bg: 'bg-cyan-100', fg: 'text-cyan-500', ring: 'ring-cyan-300' },
  { emoji: '🦋', bg: 'bg-fuchsia-100', fg: 'text-fuchsia-500', ring: 'ring-fuchsia-300' },
  { emoji: '🌸', bg: 'bg-pink-200', fg: 'text-pink-600', ring: 'ring-pink-400' },
  { emoji: '⭐', bg: 'bg-yellow-100', fg: 'text-yellow-500', ring: 'ring-yellow-300' },
];

function resolveAvatar(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith('data:') || avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return { type: 'image', src: avatar };
  }
  const preset = AVATAR_PRESETS.find(p => p.emoji === avatar);
  if (preset) return { type: 'preset', ...preset };
  return null;
}

function AvatarView({ value, size = 'md', isDark = false, className = '' }) {
  const sizeCls = size === 'sm' ? 'w-8 h-8 text-base' : size === 'lg' ? 'w-20 h-20 text-4xl' : 'w-12 h-12 text-2xl';
  const resolved = resolveAvatar(value);
  if (resolved?.type === 'image') {
    return (
      <div className={`${sizeCls} rounded-full overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 ${className}`}>
        <img src={resolved.src} alt="avatar" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (resolved?.type === 'preset') {
    return (
      <div className={`${sizeCls} rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : resolved.bg} ring-2 ring-white dark:ring-gray-800 ${className}`}>
        <span>{resolved.emoji}</span>
      </div>
    );
  }
  return (
    <div className={`${sizeCls} rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 ${className}`}>
      <User className="w-1/2 h-1/2 text-white" />
    </div>
  );
}

export default function Header({ isDark, currentUser, isAdmin, newUserRegistered, setNewUserRegistered, users, updateCurrentUser, notifications, setNotifications, showProfileModal, setShowProfileModal, searchQuery, setSearchQuery, setCurrentPage, jumpTarget, setJumpTarget, feedbacks, onRefresh }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [showNewUserAlert, setShowNewUserAlert] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', avatar: '' });
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    if (showProfileModal) {
      setShowModal('profile');
      setIsEditingProfile(false);
      setEditForm({
        name: currentUser?.name || '',
        phone: currentUser?.phone || ''
      });
    }
  }, [showProfileModal, currentUser]);
  
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (newUserRegistered && isAdmin) {
      const latestUser = users[users.length - 1];
      if (latestUser) {
        const newNotification = {
          id: Date.now(),
          title: '新用户注册',
          message: `${latestUser.name} 已注册账户，手机号：${latestUser.phone}`,
          timestamp: Date.now(),
          read: false,
          type: 'newUser',
          isAllUsers: false,
          userId: null
        };
        setNotifications([newNotification, ...notifications]);
        setShowNewUserAlert(true);
        setTimeout(() => {
          setShowNewUserAlert(false);
        }, 5000);
      }
      setNewUserRegistered(false);
    }
  }, [newUserRegistered, isAdmin, users, notifications, setNotifications, setNewUserRegistered]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleMenuItemClick = (item) => {
    setShowUserMenu(false);
    setShowModal(item);
    if (item === 'profile') {
      setIsEditingProfile(false);
      setShowAvatarPicker(false);
      setEditForm({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        avatar: currentUser?.avatar || '',
      });
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setShowAvatarPicker(false);
    setEditForm({
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      avatar: currentUser?.avatar || '',
    });
  };

  const handleSaveProfile = () => {
    if (!editForm.name.trim()) {
      alert('姓名不能为空');
      return;
    }
    updateCurrentUser({
      name: editForm.name,
      phone: editForm.phone,
      avatar: editForm.avatar,
    });
    setIsEditingProfile(false);
    setShowAvatarPicker(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setShowAvatarPicker(false);
    setEditForm({
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      avatar: currentUser?.avatar || '',
    });
  };

  const handlePickPresetAvatar = (emoji) => {
    setEditForm({ ...editForm, avatar: emoji });
    setShowAvatarPicker(false);
  };

  const handleCustomAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('图片太大，请选择小于 2MB 的图片');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setEditForm({ ...editForm, avatar: dataUrl });
        setShowAvatarPicker(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredNotifications = notifications.filter(notification => {
    if (notification.isAllUsers) return true;
    if (notification.forAdmin) return !!isAdmin;
    if (!isAdmin && notification.userId === currentUser?.id) return true;
    if (isAdmin && notification.userId === null) return true;
    return false;
  });
  
  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  return (
    <>
      {showNewUserAlert && isAdmin && (
        <div className={`px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-between shadow-lg`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">🎉</span>
            <span className="font-medium">有新用户注册！请查看用户管理页面了解详情。</span>
          </div>
          <button 
            onClick={() => setShowNewUserAlert(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <header className={`h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">{formatDate(currentTime)}</div>
          <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} font-mono text-lg`}>
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`relative ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索座位、用户、预约..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-400'}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="刷新数据"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={`absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-2 z-50`}>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>通知中心</h3>
                  <button
                    onClick={markAllAsRead}
                    className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-500'} hover:underline cursor-pointer`}
                  >
                    全部已读
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        const updated = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n);
                        setNotifications(updated);
                        setShowNotifications(false);
                        const isFeedbackReply =
                          (notification.meta && notification.meta.type === 'feedback_replied') ||
                          (notification.title && notification.title.includes('管理员已回复')) ||
                          (notification.message && notification.message.includes('管理员已回复'));
                        const isNewFeedback =
                          (notification.meta && notification.meta.type === 'new_feedback') ||
                          (notification.title && notification.title.includes('收到新留言'));
                        let targetId = notification.meta?.feedbackId;
                        if (isFeedbackReply && !targetId && !isAdmin && feedbacks && currentUser) {
                          const mineReplied = feedbacks
                            .filter(f => f.userId === currentUser.id && f.reply)
                            .sort((a, b) => new Date(b.reply.createdAt || b.createdAt) - new Date(a.reply.createdAt || a.createdAt));
                          if (mineReplied.length > 0) targetId = mineReplied[0].id;
                        }
                        if (isFeedbackReply || isNewFeedback) {
                          setCurrentPage('settings');
                          setTimeout(() => {
                            setJumpTarget({
                              page: 'settings',
                              section: 'feedbacks',
                              feedbackId: targetId,
                              autoOpenReply: isNewFeedback && !!targetId,
                            });
                          }, 80);
                        }
                      }}
                      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${notification.read ? '' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                        <div className="flex-1">
                          <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {notification.title}
                          </h4>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <span className={`text-xs mt-1 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {notification.timestamp ? formatTimeAgo(notification.timestamp) : notification.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <AvatarView value={currentUser?.avatar} size="sm" isDark={isDark} />
              <span className="font-medium">{currentUser?.name || '用户'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-2 z-50`}>
                <button
                  onClick={() => handleMenuItemClick('profile')}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'} cursor-pointer`}
                >
                  <UserCircle className="w-4 h-4" />
                  个人资料
                </button>
                <button
                  onClick={() => handleMenuItemClick('settings')}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'} cursor-pointer`}
                >
                  <Settings className="w-4 h-4" />
                  账户设置
                </button>
                <button
                  onClick={() => handleMenuItemClick('help')}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'} cursor-pointer`}
                >
                  <HelpCircle className="w-4 h-4" />
                  帮助中心
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <button
                  onClick={() => handleMenuItemClick('logout')}
                  className={`w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-500'} cursor-pointer`}
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setShowModal(null);
          if (setShowProfileModal) {
            setShowProfileModal(false);
          }
        }}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {showModal === 'profile' && '个人资料'}
                {showModal === 'settings' && '账户设置'}
                {showModal === 'help' && '帮助中心'}
                {showModal === 'logout' && '退出登录'}
              </h3>
              <button onClick={() => {
                setShowModal(null);
                if (setShowProfileModal) {
                  setShowProfileModal(false);
                }
              }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showModal === 'profile' && (
              <div className="space-y-4">
                {!isEditingProfile ? (
                  <>
                    <div className="flex items-center gap-4">
                      <AvatarView value={currentUser?.avatar} size="lg" isDark={isDark} />
                      <div>
                        <h4 className="font-semibold text-lg">{currentUser?.name || '用户'}</h4>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{currentUser?.phone || '未绑定手机号'}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {currentUser?.avatar ? '已设置头像' : '使用默认头像'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>用户ID</span>
                        <span>{currentUser?.id ? `#${String(currentUser.id).padStart(6, '0')}` : '#USER000'}</span>
                      </div>
                      <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>角色</span>
                        <span className={`px-2 py-1 rounded-full text-sm ${currentUser?.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                          {currentUser?.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </div>
                      <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>手机号</span>
                        </span>
                        <span>{currentUser?.phone || '未设置'}</span>
                      </div>
                      {currentUser?.role !== 'admin' && (
                        <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>会员卡</span>
                          </span>
                          <div className="text-right">
                            {(() => {
                              if (!currentUser?.cardType || !currentUser?.cardExpire) {
                                return <span className="text-gray-400">未开通</span>;
                              }
                              const cardTypes = {
                                day: '天卡',
                                week: '周卡',
                                month: '月卡',
                                season: '季卡',
                                year: '年卡',
                              };
                              const expireDate = new Date(currentUser.cardExpire);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              expireDate.setHours(0, 0, 0, 0);
                              if (expireDate < today) {
                                return (
                                  <div>
                                    <span className="text-red-500">{cardTypes[currentUser.cardType]} · 已过期</span>
                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>到期时间: {currentUser.cardExpire}</div>
                                  </div>
                                );
                              }
                              const diffDays = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
                              return (
                                <div>
                                  <span className={diffDays <= 3 ? 'text-yellow-500' : 'text-green-600 dark:text-green-400'}>
                                    {cardTypes[currentUser.cardType]} · {diffDays}天后到期
                                  </span>
                                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>到期时间: {currentUser.cardExpire}</div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleEditProfile}
                      className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑资料
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <AvatarView value={editForm.avatar} size="lg" isDark={isDark} />
                        <button
                          onClick={() => setShowAvatarPicker(v => !v)}
                          className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Palette className="w-3 h-3" />
                          {showAvatarPicker ? '收起' : '更换头像'}
                        </button>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            姓名
                          </label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="请输入姓名"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            手机号
                          </label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="请输入手机号"
                          />
                        </div>
                      </div>
                    </div>

                    {showAvatarPicker && (
                      <div className={`p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>选择系统头像</div>
                        <div className="grid grid-cols-8 gap-2 mb-3">
                          {AVATAR_PRESETS.map(p => (
                            <button
                              key={p.emoji}
                              onClick={() => handlePickPresetAvatar(p.emoji)}
                              title={p.emoji}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${isDark ? 'bg-gray-600 hover:bg-gray-500' : p.bg} hover:scale-110 transition-transform ${editForm.avatar === p.emoji ? 'ring-2 ring-blue-500' : ''}`}
                            >
                              {p.emoji}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCustomAvatarFile}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Image className="w-4 h-4" />
                            选择我的图片（≤2MB）
                          </button>
                          {editForm.avatar && (
                            <button
                              onClick={() => setEditForm({ ...editForm, avatar: '' })}
                              className={`py-2 px-3 rounded-lg text-sm ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} cursor-pointer`}
                            >
                              清除
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelEdit}
                        className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} transition-colors cursor-pointer`}
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        保存修改
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showModal === 'settings' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-medium mb-2">账户安全</h4>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>两步验证</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm">已启用</span>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-medium mb-2">语言设置</h4>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>当前语言</span>
                    <span>简体中文</span>
                  </div>
                </div>
                <button className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                  修改密码
                </button>
              </div>
            )}

            {showModal === 'help' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-medium mb-2">使用指南</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    如何预约座位、管理用户、查看统计数据等操作指南。
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-medium mb-2">常见问题</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    预约取消、座位释放、账户问题等常见问题解答。
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-medium mb-2">联系我们</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    邮箱：3465577633@qq.com
                  </p>
                </div>
              </div>
            )}

            {showModal === 'logout' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold">确认退出</h4>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>确定要退出登录吗？</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(null)}
                    className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => alert('已退出登录！')}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
