import { useState, useMemo, useEffect } from 'react';
import { Check, X, User, Calendar, Timer, Plus, Eye, AlertCircle, CheckCircle, Building2, XCircle } from 'lucide-react';

export default function SeatManagement({ isDark, isAdmin, currentUser, reservations, setReservations, users, rooms, currentRoomId, setCurrentRoomId, addNotification }) {
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatDetail, setShowSeatDetail] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '' });
  const [bookingUserId, setBookingUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const today = new Date().toISOString().split('T')[0];

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  };

  

  const activeRoom = useMemo(() => {
    return rooms.find(r => r.id === currentRoomId) || rooms[0] || null;
  }, [rooms, currentRoomId]);

  const seatCount = activeRoom ? activeRoom.seatCount : 0;

  const gridCols = useMemo(() => {
    if (seatCount <= 9) return 3;
    if (seatCount <= 16) return 4;
    if (seatCount <= 25) return 5;
    if (seatCount <= 36) return 6;
    return 8;
  }, [seatCount]);

  const isTimeSlotExpired = (dateStr, timeSlot) => {
    const now = new Date();
    const selectedDate = new Date(dateStr);
    const todayDate = new Date(today);

    if (selectedDate < todayDate) {
      return true;
    }

    if (selectedDate.toDateString() === todayDate.toDateString()) {
      const endTimeStr = timeSlot.split(' - ')[1];
      const endHour = parseInt(endTimeStr.split(':')[0]);
      const endMinute = parseInt(endTimeStr.split(':')[1]);

      const endTime = new Date(todayDate);
      endTime.setHours(endHour, endMinute, 0, 0);

      return now > endTime;
    }

    return false;
  };

  const getAvailableTimeSlots = (dateStr) => {
    return [];
  };

  const HOUR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
    const h = 8 + i;
    return { value: `${String(h).padStart(2, '0')}:00`, label: `${String(h).padStart(2, '0')}:00` };
  });

  const getEndHourOptions = (startH) => {
    const start = typeof startH === 'number' ? startH : parseInt((startH || '').split(':')[0] || '0');
    return HOUR_OPTIONS.filter(o => {
      const h = parseInt(o.value.split(':')[0]);
      return h > start && h <= 22;
    });
  };

  const isValidTimeRange = (dateStr, start, end) => {
    if (!dateStr) return false;
    
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return false;
    }
    
    if (!start || !end) return true;
    const [sh] = start.split(':').map(Number);
    const [eh] = end.split(':').map(Number);
    if (eh <= sh) return false;
    if (sh < 8 || eh > 22) return false;
    if (dateStr === new Date().toISOString().split('T')[0]) {
      const now = new Date();
      const nowHour = now.getHours();
      const nowMinute = now.getMinutes();
      if (sh < nowHour || (sh === nowHour && start.split(':')[1] <= nowMinute)) {
        return false;
      }
    }
    return true;
  };

  const showToastMessage = (message, type = 'success') => {
    setShowToast({ show: true, message, type });
    setTimeout(() => setShowToast({ show: false, message, type: 'success' }), 3000);
  };

  const getFixedUserForSeat = (seatId) => {
    return users.find(u => 
      u.fixedRoomId === currentRoomId && 
      u.fixedSeatId === seatId && 
      u.cardType && 
      u.cardExpire && 
      new Date(u.cardExpire) >= new Date(new Date().toDateString())
    );
  };

  const getSeatStatus = (seatId, date = selectedDate) => {
    const fixedUser = getFixedUserForSeat(seatId);
    if (fixedUser) return 'fixed';
    
    const activeReservation = reservations.find(
      r => r.roomId === currentRoomId && r.seatId === seatId && r.status === 'pending' && r.date === date
    );
    if (activeReservation) return 'occupied';
    return 'available';
  };

  const getSeatReservation = (seatId, date = selectedDate) => {
    return reservations.find(
      r => r.roomId === currentRoomId && r.seatId === seatId && r.status === 'pending' && r.date === date
    );
  };

  const getSeatUserInfo = (seatId, date = selectedDate) => {
    const fixedUser = getFixedUserForSeat(seatId);
    if (fixedUser) return fixedUser;
    
    const reservation = getSeatReservation(seatId, date);
    if (reservation) {
      return users.find(u => u.id === reservation.userId);
    }
    return null;
  };

  const handleSeatClick = (seatId) => {
    const status = getSeatStatus(seatId, selectedDate);
    if (status === 'occupied' || status === 'fixed') {
      setSelectedSeat(seatId);
      setShowSeatDetail(true);
    } else {
      setSelectedSeat(seatId);
      setErrorMessage('');
      setBookingUserId('');
      setFormData({ date: selectedDate, startTime: '', endTime: '' });
      setShowBookingModal(true);
    }
  };

  const [showSeatCancelConfirm, setShowSeatCancelConfirm] = useState(false);

  const handleSeatCancelReservation = () => {
    const reservation = getSeatReservation(selectedSeat);
    if (!reservation) {
      setShowSeatCancelConfirm(false);
      return;
    }
    setReservations(prev => prev.map(r =>
      r.id === reservation.id
        ? { ...r, status: 'cancelled' }
        : r
    ));
    addNotification({
      title: '预约已取消',
      message: `管理员取消了您在 ${activeRoom?.name || ''} 座位 ${selectedSeat} 的预约（${reservation.date} ${reservation.time}）`,
      isAllUsers: false,
      userId: reservation.userId
    });
    setShowSeatCancelConfirm(false);
    setShowSeatDetail(false);
    setSelectedSeat(null);
    showToastMessage('预约已取消！');
  };

  const getStatusColor = (seatId, date = selectedDate) => {
    const status = getSeatStatus(seatId, date);
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'occupied':
        return 'bg-red-500';
      case 'fixed':
        return 'bg-purple-500';
      case 'selected':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500';
    }
  };

  const handleBookSeat = () => {
    setErrorMessage('');
    
    const time = formData.startTime && formData.endTime
      ? `${formData.startTime} - ${formData.endTime}`
      : '';
    if (!formData.date || !time) {
      setErrorMessage('请填写完整的预约信息');
      return;
    }

    const selectedDate = new Date(formData.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < todayDate) {
      setErrorMessage('预约日期不能早于今天');
      return;
    }

    if (!isValidTimeRange(formData.date, formData.startTime, formData.endTime)) {
      setErrorMessage('时间选择无效：请选择08:00-22:00之间的时段，且开始时间需早于结束时间');
      return;
    }

    if (isAdmin && !bookingUserId) {
      setErrorMessage('请选择要预约的用户');
      return;
    }

    const conflictReservation = reservations.find(
      r => r.roomId === currentRoomId && r.seatId === selectedSeat && r.date === formData.date && r.time === time && r.status === 'pending'
    );

    if (conflictReservation) {
      setErrorMessage(`⚠ 时间冲突！该座位已被 ${conflictReservation.userName} 在 ${conflictReservation.date} ${conflictReservation.time} 预约，请换座位或调整时间`);
      return;
    }

    let targetUserId;
    let targetUserName;
    let targetUserObj;
    if (isAdmin) {
      targetUserObj = users.find(u => String(u.id) === String(bookingUserId));
      targetUserId = targetUserObj?.id ?? 0;
      targetUserName = targetUserObj?.name || '用户';
    } else {
      targetUserId = currentUser?.id || 0;
      targetUserName = currentUser?.name || '用户';
      targetUserObj = users.find(u => u.id === targetUserId);
    }

    /* ====== 固定座位用户冲突检测 ====== */
    const targetUser = targetUserObj || users.find(u => u.id === targetUserId);
    if (targetUser?.fixedSeatId && targetUser.cardExpire && new Date(targetUser.cardExpire) >= new Date(new Date().toDateString())) {
      setErrorMessage(`⚠ ${targetUserName} 已有固定座位 ${targetUser.fixedSeatId}（有效期至 ${targetUser.cardExpire}），会员卡有效期内无需预约其他座位`);
      return;
    }

    const newId = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) + 1 : 1;
    const newReservation = {
      id: newId,
      roomId: currentRoomId,
      userId: targetUserId,
      userName: targetUserName,
      seatId: selectedSeat,
      date: formData.date,
      time: time,
      status: 'pending'
    };

    setReservations(prev => [...prev, newReservation]);

    addNotification({
      title: '预约成功',
      message: isAdmin
        ? `管理员为您预约了 ${activeRoom?.name || ''} 座位 ${selectedSeat}，${formData.date} ${formData.time}`
        : `您已成功预约 ${activeRoom?.name || ''} 座位 ${selectedSeat}，${formData.date} ${formData.time}`,
      isAllUsers: false,
      userId: targetUserId
    });

    addNotification({
      title: '新预约通知',
      message: isAdmin
        ? `${currentUser?.name || '管理员'} 为用户 ${targetUserName} 预约了 ${activeRoom?.name || ''} 座位 ${selectedSeat}，${formData.date} ${time}`
        : `${currentUser?.name || '用户'} 预约了 ${activeRoom?.name || ''} 座位 ${selectedSeat}，${formData.date} ${time}`,
      isAllUsers: false,
      userId: null,
      forAdmin: true,
    });

    setShowBookingModal(false);
    setFormData({ date: '', startTime: '', endTime: '' });
    setBookingUserId('');
    setSelectedSeat(null);
    showToastMessage('预约成功！');
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

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>座位管理</h1>

        {rooms.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Building2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>当前房间：</span>
              <select
                value={currentRoomId}
                onChange={(e) => setCurrentRoomId(parseInt(e.target.value))}
                className={`px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[160px]`}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}（{r.seatCount}座）</option>
                ))}
              </select>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Calendar className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>查看日期：</span>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
              />
            </div>
          </div>
        )}
      </div>

      {rooms.length === 0 && (
        <div className={`p-8 rounded-xl text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>暂无房间，请管理员在"系统设置 → 房间管理"中添加</p>
        </div>
      )}

      {rooms.length > 0 && (
        <>
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {activeRoom?.name} · 共 {seatCount} 个座位
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedDate === today ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {formatDateLabel(selectedDate)}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  下方展示「{formatDateLabel(selectedDate)}」的座位占用情况，切换上方日期可提前查看 / 预约其他日期
                </p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>空闲 - 可预约</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>已预约 - 点击查看详情</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500"></div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>固定座位 - 会员卡用户</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-center">
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 120px))` }}
              >
              {Array.from({ length: seatCount }).map((_, index) => {
                const seatId = index + 1;
                const status = getSeatStatus(seatId, selectedDate);
                const reservation = getSeatReservation(seatId, selectedDate);
                const fixedUser = getFixedUserForSeat(seatId);

                return (
                  <button
                    key={seatId}
                    onClick={() => handleSeatClick(seatId)}
                    className={`w-28 h-28 rounded-lg ${getStatusColor(seatId, selectedDate)} flex flex-col items-center justify-center transition-all hover:scale-105 relative`}
                  >
                    <span className="text-white font-bold text-lg">{seatId}</span>
                    {(status === 'occupied' || status === 'fixed') && (
                      <div className="absolute top-2 right-2">
                        <User className="w-4 h-4 text-white/80" />
                      </div>
                    )}
                    {fixedUser ? (
                      <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white/90 font-medium px-2 py-0.5 rounded ${
                        isDark ? 'bg-black/30' : 'bg-black/20'
                      }`}>
                        {fixedUser.name}
                      </div>
                    ) : reservation ? (
                      <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white/90 font-medium px-2 py-0.5 rounded ${
                        isDark ? 'bg-black/30' : 'bg-black/20'
                      }`}>
                        {'已约'}
                      </div>
                    ) : null}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </>
      )}

      {showSeatDetail && selectedSeat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSeatDetail(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">{activeRoom?.name} · 座位 {selectedSeat} 预约信息</h3>
              <button onClick={() => setShowSeatDetail(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const reservation = getSeatReservation(selectedSeat, selectedDate);
              const fixedUser = getFixedUserForSeat(selectedSeat);
              const user = getSeatUserInfo(selectedSeat, selectedDate);

              if (!reservation && !fixedUser) {
                return (
                  <div className="text-center py-8">
                    <div className={`w-16 h-16 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>该座位在 {formatDateLabel(selectedDate)} 暂无预约</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>切换上方日期可查看其他日期的占用情况</p>
                  </div>
                );
              }

              /* ====== 固定座位：显示占用提示 ====== */
              if (fixedUser) {
                return (
                  <div className="space-y-3">
                    {/* 时间冲突 / 固定座位 警告条幅 */}
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        该座位为固定座位，已分配给会员用户
                      </p>
                      <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        有效期至 {fixedUser.cardExpire}，期间不可被预约
                      </p>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>座位号</span>
                      <span className="font-medium">座位 {selectedSeat}</span>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>固定用户</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span>{fixedUser.name}</span>
                      </div>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>手机号</span>
                      <span>{fixedUser.phone || '未绑定'}</span>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>会员卡类型</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        fixedUser.cardType === 'day' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                        fixedUser.cardType === 'week' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        fixedUser.cardType === 'month' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        fixedUser.cardType === 'season' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {{ day: '天卡', week: '周卡', month: '月卡', season: '季卡', year: '年卡' }[fixedUser.cardType]}
                      </span>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        有效期
                      </span>
                      <span>{fixedUser.cardStartDate} 至 {fixedUser.cardExpire}</span>
                    </div>
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                      <span className={isDark ? 'text-purple-300' : 'text-purple-700'}>状态</span>
                      <span className="px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        固定座位
                      </span>
                    </div>
                  </div>
                );
              }

              /* ====== 已预约座位：显示时间冲突警告 ====== */
              return (
                <div className="space-y-3">
                  {/* 时间冲突警告条幅 */}
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      ⚠ 该座位在 {reservation.date} 已被预约，时间段冲突
                    </p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      被 {user?.name || reservation.userName} 预约了 {reservation.time}，如需使用请选择其他时段或其他座位
                    </p>
                  </div>
                  <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>座位号</span>
                    <span className="font-medium">座位 {selectedSeat}</span>
                  </div>
                  <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>预约用户</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span>{user?.name || reservation.userName}</span>
                    </div>
                  </div>
                  {user && (
                    <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>手机号</span>
                      <span>{user.phone || '未绑定'}</span>
                    </div>
                  )}
                  <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      预约日期
                    </span>
                    <span>{reservation.date}</span>
                  </div>
                  <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      <Timer className="w-4 h-4 inline mr-1" />
                      预约时间
                    </span>
                    <span>{reservation.time}</span>
                  </div>
                  <div className={`flex justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>状态</span>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      reservation.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {reservation.status === 'pending' ? '待使用' : '已完成'}
                    </span>
                  </div>

                  {isAdmin && reservation.status === 'pending' && (
                    <button
                      onClick={() => setShowSeatCancelConfirm(true)}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      取消该预约
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showSeatCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSeatCancelConfirm(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-80 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">确认取消预约</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              确定要取消该座位的当前预约吗？此操作不可撤销，用户将收到取消通知。
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSeatCancelConfirm(false)}
                className={`flex-1 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
              >
                再想想
              </button>
              <button
                onClick={handleSeatCancelReservation}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookingModal && selectedSeat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBookingModal(false)}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">预约 {activeRoom?.name} · 座位 {selectedSeat}</h3>
              <button onClick={() => {
                setShowBookingModal(false);
                setSelectedSeat(null);
              }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errorMessage}
                  </p>
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>预约日期</label>
                <input
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    let startTime = formData.startTime;
                    let endTime = formData.endTime;
                    if (newDate === today && startTime) {
                      const now = new Date();
                      const nowMin = now.getHours() * 60 + now.getMinutes();
                      const [h, m] = startTime.split(':').map(Number);
                      if (h * 60 + m <= nowMin) {
                        startTime = '';
                        endTime = '';
                      }
                    }
                    setFormData({ ...formData, date: newDate, startTime, endTime });
                  }}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>预约时间</label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.startTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      let end = formData.endTime;
                      if (end && v) {
                        const vH = parseInt(v.split(':')[0]);
                        const eH = parseInt(end.split(':')[0]);
                        if (eH <= vH) end = '';
                      }
                      if (formData.date && v) {
                        const now = new Date();
                        const today = now.toISOString().slice(0, 10);
                        if (formData.date === today) {
                          const nowH = now.getHours();
                          const vH = parseInt(v.split(':')[0]);
                          if (vH <= nowH) {
                            showToastMessage('开始时间不能早于当前小时', 'error');
                            return;
                          }
                        }
                      }
                      setFormData({ ...formData, startTime: v, endTime: end });
                    }}
                    disabled={!formData.date}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${!formData.date ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">开始时间</option>
                    {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>至</span>
                  <select
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    disabled={!formData.date || !formData.startTime}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${(!formData.date || !formData.startTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">结束时间</option>
                    {getEndHourOptions(formData.startTime).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  范围 08:00 - 22:00，开始小时须早于结束小时
                </p>
              </div>

              {isAdmin && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>预约用户</label>
                  <select
                    value={bookingUserId}
                    onChange={(e) => setBookingUserId(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                  >
                    <option value="">请选择用户</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}（{u.phone}）</option>
                    ))}
                  </select>
                  <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    以管理员身份代用户预约，用户无需登录即可占位
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingUserId('');
                    setSelectedSeat(null);
                  }}
                  className={`flex-1 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                >
                  取消
                </button>
                <button
                  onClick={handleBookSeat}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  确认预约
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
