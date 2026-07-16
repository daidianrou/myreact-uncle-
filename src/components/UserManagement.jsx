import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Phone, User, X, Edit2, Trash2, Eye, AlertCircle, CheckCircle, Lock, MessageSquare, Check, Ban, Unlock, Download, CreditCard, Clock, CalendarPlus, MapPin } from 'lucide-react';

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
};

const statusLabels = {
  active: '活跃',
  inactive: '禁用',
};

const cardTypes = {
  day: { label: '天卡', days: 1, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  week: { label: '周卡', days: 7, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  month: { label: '月卡', days: 30, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  season: { label: '季卡', days: 90, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  year: { label: '年卡', days: 365, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function UserManagement({ isDark, isAdmin, users, setUsers, reservations, setReservations, notifications, setNotifications, rooms }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hoveredUserId, setHoveredUserId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userForCard, setUserForCard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '123456',
    remark: '',
  });

  const [quickEditRemark, setQuickEditRemark] = useState(null);
  const [quickRemarkValue, setQuickRemarkValue] = useState('');
  const [exportUserData, setExportUserData] = useState(true);
  
  const [cardFormData, setCardFormData] = useState({
    cardType: '',
    extendDays: 0,
    isExtend: false,
    fixedRoomId: null,
    fixedSeatId: null,
    handledBy: '',
    amountReceived: '',
  });

  const filteredUsers = users.filter(
    (user) =>
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.remark || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showToastMessage = (message, type = 'success') => {
    setShowToast({ show: true, message, type });
    setTimeout(() => setShowToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const exportToCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const headers = ['ID', '姓名', '手机号', '会员卡', '到期时间', '状态', '经手人', '收到金额', '收款渠道'];
    const rows = users.map(u => [
      u.id,
      u.name || '',
      u.phone || '',
      getCardStatus(u).label,
      u.cardExpire || '',
      statusLabels[u.status] || u.status,
      u.handledBy || '',
      u.amountReceived || '',
      u.paymentChannel || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `用户记录_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddUser = () => {
    if (!formData.name || !formData.phone || !formData.password) {
      showToastMessage('请填写姓名和手机号', 'error');
      return;
    }
    if (!/^1\d{10}$/.test(formData.phone)) {
      showToastMessage('请输入正确的 11 位手机号', 'error');
      return;
    }
    if (users.some(u => u.phone === formData.phone)) {
      showToastMessage('该手机号已存在', 'error');
      return;
    }

    const maxId = users.reduce((m, u) => Math.max(m, u.id), 0);
    const newUser = {
      id: maxId + 1,
      ...formData,
      status: 'active',
      role: 'user',
    };

    setUsers([...users, newUser]);
    setShowAddModal(false);
    setFormData({ name: '', phone: '', password: '123456', remark: '' });
    showToastMessage('用户添加成功！');
  };

  const handleEditUser = () => {
    if (!formData.name || !formData.phone || !formData.password) {
      showToastMessage('请填写姓名和手机号', 'error');
      return;
    }
    if (!/^1\d{10}$/.test(formData.phone)) {
      showToastMessage('请输入正确的 11 位手机号', 'error');
      return;
    }
    if (users.some(u => u.phone === formData.phone && u.id !== editingUser.id)) {
      showToastMessage('该手机号已存在', 'error');
      return;
    }

    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    setShowAddModal(false);
    setEditingUser(null);
    setFormData({ name: '', phone: '', password: '123456', remark: '' });
    showToastMessage('用户信息更新成功！');
  };

  const handleDeleteUser = () => {
    const deletedUser = users.find(u => u.id === userToDelete);
    
    if (deletedUser) {
      if (exportUserData) {
        const userReservations = reservations ? reservations.filter(r => r.userId === deletedUser.id) : [];
        const userNotifications = notifications ? notifications.filter(n => n.userId === deletedUser.id) : [];
        
        const exportData = {
          user: deletedUser,
          reservations: userReservations,
          notifications: userNotifications,
          exportDate: new Date().toISOString(),
          exportedBy: '管理员',
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `用户数据_${deletedUser.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      if (setReservations) {
        setReservations(reservations.filter(r => r.userId !== deletedUser.id));
      }
      
      if (setNotifications) {
        setNotifications(notifications.filter(n => 
          n.userId !== deletedUser.id && 
          n.userId !== String(deletedUser.id) &&
          n.userId !== `user_${deletedUser.id}`
        ));
      }
    }
    
    setUsers(users.filter(u => u.id !== userToDelete));
    setShowConfirmModal(false);
    setShowDetailModal(false);
    setUserToDelete(null);
    showToastMessage('用户已删除，数据已导出！');
  };

  const handleSaveQuickRemark = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, remark: quickRemarkValue } : u));
    setQuickEditRemark(null);
    showToastMessage('备注已更新');
  };

  const startQuickEdit = (user) => {
    setQuickEditRemark(user.id);
    setQuickRemarkValue(user.remark || '');
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    showToastMessage(newStatus === 'active' ? `${user.name} 已启用` : `${user.name} 已禁用`);
  };

  const handleOpenCardModal = (user) => {
    setUserForCard(user);
    setCardFormData({
      cardType: '',
      extendDays: 0,
      isExtend: false,
      fixedRoomId: user.fixedRoomId || null,
      fixedSeatId: user.fixedSeatId || null,
      handledBy: user.handledBy || '',
      amountReceived: user.amountReceived || '',
    });
    setShowCardModal(true);
  };

  const handleSaveCard = () => {
    if (!userForCard) return;
    
    let newCardType = cardFormData.cardType;
    let newExpireDate = null;
    let newStartDate = userForCard.cardStartDate;
    
    if (cardFormData.isExtend) {
      if (cardFormData.extendDays <= 0) {
        showToastMessage('请输入延期天数', 'error');
        return;
      }
      const baseDate = userForCard.cardExpire ? new Date(userForCard.cardExpire) : new Date();
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + cardFormData.extendDays);
      newExpireDate = newDate.toISOString().split('T')[0];
      newCardType = userForCard.cardType || 'day';
    } else {
      if (!cardFormData.cardType) {
        showToastMessage('请选择卡类型', 'error');
        return;
      }
      const cardInfo = cardTypes[cardFormData.cardType];
      const now = new Date();
      newStartDate = now.toISOString().split('T')[0];
      now.setDate(now.getDate() + cardInfo.days);
      newExpireDate = now.toISOString().split('T')[0];
    }
    
    setUsers(users.map(u => u.id === userForCard.id ? { 
      ...u, 
      cardType: newCardType, 
      cardExpire: newExpireDate,
      cardStartDate: newStartDate,
      fixedRoomId: cardFormData.fixedRoomId,
      fixedSeatId: cardFormData.fixedSeatId,
      handledBy: cardFormData.handledBy,
      amountReceived: cardFormData.amountReceived,
      paymentChannel: cardFormData.paymentChannel,
    } : u));
    setShowCardModal(false);
    setUserForCard(null);
    
    const actionText = cardFormData.isExtend 
      ? `已为 ${userForCard.name} 延期 ${cardFormData.extendDays} 天`
      : `已为 ${userForCard.name} 设置 ${cardTypes[cardFormData.cardType].label}`;
    showToastMessage(actionText);
  };

  const getCardStatus = (user) => {
    if (!user.cardType || !user.cardExpire) {
      return { status: 'none', label: '未开通', color: 'bg-gray-200 text-gray-500' };
    }
    const expireDate = new Date(user.cardExpire);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expireDate.setHours(0, 0, 0, 0);
    
    if (expireDate < today) {
      return { status: 'expired', label: '已过期', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
    }
    
    const diffDays = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return { status: 'expiring', label: `即将到期 (${diffDays}天)`, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
    }
    
    return { status: 'active', label: `${cardTypes[user.cardType].label} · ${diffDays}天后到期`, color: cardTypes[user.cardType].color };
  };

  const confirmDelete = (userId) => {
    setUserToDelete(userId);
    setShowConfirmModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      phone: user.phone,
      password: user.password,
      remark: user.remark || '',
    });
    setShowAddModal(true);
  };

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6 relative">
      {showToast.show && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          showToast.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {showToast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {showToast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>用户管理</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              导出Excel
            </button>
          )}
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', phone: '', password: '123456' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            添加用户
          </button>
        </div>
      </div>

      <div className={`relative mb-6 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="搜索用户..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-20`}>用户</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-32`}>手机号</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-28`}>会员卡</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-28`}>到期时间</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-16`}>状态</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-20`}>经手人</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-28`}>收到金额</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-24`}>收款渠道</th>
              <th className={`px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'} w-32`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden text-lg">
                      {user.avatar ? (
                        user.avatar.startsWith('data:') || user.avatar.startsWith('http') ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.avatar
                        )
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ID: {user.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {user.phone}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {(() => {
                    const cardStatus = getCardStatus(user);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cardStatus.color} whitespace-nowrap`}>
                        {cardStatus.label}
                      </span>
                    );
                  })()}
                </td>
                <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1">
                    <CalendarPlus className="w-3 h-3" />
                    {user.cardExpire ? user.cardExpire : '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                    }`}
                    title={user.status === 'active' ? '点击禁用该用户' : '点击启用该用户'}
                  >
                    {user.status === 'active' ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {statusLabels[user.status]}
                  </button>
                </td>
                <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {user.handledBy || '-'}
                </td>
                <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {user.amountReceived ? (
                    <div 
                      className="relative cursor-pointer inline-block"
                      onMouseEnter={() => setHoveredUserId(user.id)}
                      onMouseLeave={() => setHoveredUserId(null)}
                    >
                      {hoveredUserId === user.id ? (
                        <span className="font-medium text-green-600 dark:text-green-400">¥{user.amountReceived}</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          isDark 
                            ? 'bg-gray-700 text-gray-400' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          ******
                        </span>
                      )}
                    </div>
                  ) : '-'}
                </td>
                <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {user.paymentChannel || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDetail(user)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      title="查看详情"
                    >
                      <Eye className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      title="编辑"
                    >
                      <Edit2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                    <button
                      onClick={() => handleOpenCardModal(user)}
                      className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                      title="会员卡管理"
                    >
                      <CreditCard className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                    </button>
                    <button
                      onClick={() => confirmDelete(user.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">{editingUser ? '编辑用户' : '添加用户'}</h3>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingUser(null);
                setFormData({ name: '', phone: '' });
              }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>手机号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="请输入手机号"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>密码</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="请输入密码"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>备注</label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="例如：VIP、勤奋用户等"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    setFormData({ name: '', phone: '', password: '123456' });
                  }}
                  className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                >
                  取消
                </button>
                <button
                  onClick={editingUser ? handleEditUser : handleAddUser}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  {editingUser ? '保存修改' : '添加用户'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">用户详情</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>用户 ID: {selectedUser.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>手机号</span>
                <span>{selectedUser.phone}</span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>密码</span>
                <span className="font-mono">{selectedUser.password}</span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>状态</span>
                <span className={`px-2 py-1 rounded-full text-sm ${statusColors[selectedUser.status]}`}>
                  {statusLabels[selectedUser.status]}
                </span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  <MessageSquare className="w-4 h-4 inline mr-1" />备注
                </span>
                <span className={selectedUser.remark ? '' : `${isDark ? 'text-gray-500' : 'text-gray-400'} italic`}>
                  {selectedUser.remark || '暂无备注'}
                </span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  <MapPin className="w-4 h-4 inline mr-1" />固定座位
                </span>
                <span className={selectedUser.fixedRoomId ? 'text-purple-600 dark:text-purple-400' : `${isDark ? 'text-gray-500' : 'text-gray-400'} italic`}>
                  {selectedUser.fixedRoomId && selectedUser.fixedSeatId 
                    ? `${rooms.find(r => r.id === selectedUser.fixedRoomId)?.name || '未知房间'} - ${selectedUser.fixedSeatId}号座位`
                    : '未分配'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  selectedUser.status === 'active'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {selectedUser.status === 'active' ? <Ban className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {selectedUser.status === 'active' ? '禁用' : '启用'}
              </button>
              <button
                onClick={() => {
                  handleOpenEdit(selectedUser);
                  setShowDetailModal(false);
                }}
                className={`flex-1 py-2 border rounded-lg flex items-center justify-center gap-2 ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => confirmDelete(selectedUser.id)}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConfirmModal(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-80 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">确认删除</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>确定要删除该用户吗？此操作不可撤销。</p>
              <label className={`mt-3 flex items-center justify-center gap-2 cursor-pointer select-none ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={exportUserData}
                  onChange={(e) => setExportUserData(e.target.checked)}
                  className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${isDark ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                <Download className="w-4 h-4" />
                <span className="text-sm">导出该用户数据</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setUserToDelete(null);
                }}
                className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && userForCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCardModal(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
                会员卡管理
              </h3>
              <button onClick={() => { setShowCardModal(false); setUserForCard(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex items-center gap-4 mb-6 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-medium">{userForCard.name}</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>用户 ID: {userForCard.id}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>当前会员卡状态</label>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {(() => {
                  const cardStatus = getCardStatus(userForCard);
                  return (
                    <>
                      <CreditCard className={`w-4 h-4 ${cardStatus.status === 'none' ? (isDark ? 'text-gray-500' : 'text-gray-400') : cardStatus.status === 'expired' ? 'text-red-500' : cardStatus.status === 'expiring' ? 'text-yellow-500' : 'text-green-500'}`} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cardStatus.color}`}>
                        {cardStatus.label}
                      </span>
                      {userForCard.cardExpire && (
                        <span className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          到期时间: {userForCard.cardExpire}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setCardFormData({ ...cardFormData, isExtend: false })}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  !cardFormData.isExtend
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                设置会员卡
              </button>
              <button
                onClick={() => setCardFormData({ ...cardFormData, isExtend: true })}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  cardFormData.isExtend
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }`}
              >
                延期
              </button>
            </div>

            <div className="space-y-4">
              {!cardFormData.isExtend ? (
                <div className="space-y-3">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>选择卡类型</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(cardTypes).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setCardFormData({ ...cardFormData, cardType: key })}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          cardFormData.cardType === key
                            ? `${value.color} ring-2 ring-offset-2 ${isDark ? 'ring-offset-gray-800' : 'ring-offset-white'} ring-blue-500`
                            : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                        }`}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    选择后将从今天开始计算有效期
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>延期天数</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={cardFormData.extendDays}
                      onChange={(e) => setCardFormData({ ...cardFormData, extendDays: Math.max(1, parseInt(e.target.value) || 0) })}
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="请输入延期天数"
                    />
                    <span className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>天</span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    从{userForCard.cardExpire ? `${userForCard.cardExpire}` : '今天'}开始计算
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>选择固定座位（可选）</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>自习室</label>
                    <select
                      value={cardFormData.fixedRoomId || ''}
                      onChange={(e) => {
                        const roomId = e.target.value ? parseInt(e.target.value) : null;
                        setCardFormData({ ...cardFormData, fixedRoomId: roomId, fixedSeatId: null });
                      }}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                    >
                      <option value="">请选择房间</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>座位号</label>
                    <select
                      value={cardFormData.fixedSeatId || ''}
                      onChange={(e) => {
                        const seatId = e.target.value ? parseInt(e.target.value) : null;
                        setCardFormData({ ...cardFormData, fixedSeatId: seatId });
                      }}
                      disabled={!cardFormData.fixedRoomId}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${!cardFormData.fixedRoomId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">请选择座位</option>
                      {cardFormData.fixedRoomId && (
                        Array.from({ length: rooms.find(r => r.id === cardFormData.fixedRoomId)?.seatCount || 0 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}号座位</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  设置后用户将在会员卡有效期内拥有该座位的使用权
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>办卡信息</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>经手人</label>
                    <input
                      type="text"
                      value={cardFormData.handledBy}
                      onChange={(e) => setCardFormData({ ...cardFormData, handledBy: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="请输入经手人"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>收到金额</label>
                    <input
                      type="number"
                      value={cardFormData.amountReceived}
                      onChange={(e) => setCardFormData({ ...cardFormData, amountReceived: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="请输入金额"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>收款渠道</label>
                    <select
                      value={cardFormData.paymentChannel || ''}
                      onChange={(e) => setCardFormData({ ...cardFormData, paymentChannel: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                    >
                      <option value="">请选择</option>
                      <option value="微信">微信</option>
                      <option value="支付宝">支付宝</option>
                      <option value="现金">现金</option>
                      <option value="银行卡">银行卡</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCardModal(false); setUserForCard(null); }}
                className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
              >
                取消
              </button>
              <button
                onClick={handleSaveCard}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  cardFormData.isExtend
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {cardFormData.isExtend ? '确认延期' : '确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
