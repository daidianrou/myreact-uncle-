import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Search, X, Users, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { useRealtimeSync, STORAGE_KEYS } from './hooks/useRealtimeSync';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import RadioPlayer, { RadioMiniBar } from './components/RadioPlayer';

// 路由级代码分割：首屏只加载外壳 + 当前页 JS，其余页面按需加载，
// 避免把 ECharts（仪表盘）等当前页用不到的代码打进首屏 bundle，从而缩短 LCP
const Dashboard = lazy(() => import('./components/Dashboard'));
const SeatManagement = lazy(() => import('./components/SeatManagement'));
const ReservationManagement = lazy(() => import('./components/ReservationManagement'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Settings = lazy(() => import('./components/Settings'));
const Minesweeper = lazy(() => import('./components/Minesweeper'));

const defaultUsers = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138001', status: 'active', password: '123456', role: 'user', remark: 'VIP', cardType: 'year', cardStartDate: new Date().toISOString().split('T')[0], cardExpire: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], fixedRoomId: 1, fixedSeatId: 5, handledBy: '', amountReceived: '' },
  { id: 2, name: '李四', email: 'lisi@example.com', phone: '13800138002', status: 'active', password: '123456', role: 'user', remark: '勤奋用户', cardType: 'month', cardStartDate: new Date().toISOString().split('T')[0], cardExpire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], fixedRoomId: null, fixedSeatId: null, handledBy: '', amountReceived: '' },
  { id: 3, name: '王五', email: 'wangwu@example.com', phone: '13800138003', status: 'inactive', password: '123456', role: 'user', remark: '', cardType: null, cardStartDate: null, cardExpire: null, fixedRoomId: null, fixedSeatId: null, handledBy: '', amountReceived: '' },
];

const defaultRooms = [
  { id: 1, name: 'A栋自习室', seatCount: 25 },
  { id: 2, name: 'B栋自习室', seatCount: 25 },
];

const defaultReservations = [
  { id: 1, roomId: 1, userId: 1, userName: '张三', seatId: 1, date: '2026-05-27', time: '08:00 - 12:00', status: 'pending' },
  { id: 2, roomId: 1, userId: 2, userName: '李四', seatId: 4, date: '2026-05-27', time: '14:00 - 18:00', status: 'pending' },
  { id: 3, roomId: 1, userId: 1, userName: '张三', seatId: 10, date: '2026-05-28', time: '09:00 - 13:00', status: 'pending' },
];

const now = Date.now();
const minute = 60 * 1000;
const hour = 60 * minute;

const defaultNotifications = [
  { id: 1, title: '新预约通知', message: '张三预约了座位 5，时间：09:00 - 13:00', timestamp: now - 5 * minute, read: false, isAllUsers: false, userId: null, forAdmin: true },
  { id: 2, title: '座位释放', message: '座位 12 已释放，可以重新预约', timestamp: now - 15 * minute, read: false, isAllUsers: true, userId: null },
  { id: 3, title: '系统维护', message: '系统将于今晚 22:00 进行维护升级', timestamp: now - hour, read: true, isAllUsers: true, userId: null },
];



function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [jumpTarget, setJumpTarget] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [users, setUsers] = useRealtimeSync(STORAGE_KEYS.USERS, defaultUsers);
  const [newUserRegistered, setNewUserRegistered] = useState(false);
  const [reservations, setReservations] = useRealtimeSync(STORAGE_KEYS.RESERVATIONS, defaultReservations);
  const [notifications, setNotifications] = useRealtimeSync(STORAGE_KEYS.NOTIFICATIONS, defaultNotifications);
  const [feedbacks, setFeedbacks] = useRealtimeSync(STORAGE_KEYS.FEEDBACKS, []);
  const [rooms, setRooms] = useRealtimeSync(STORAGE_KEYS.ROOMS, defaultRooms);
  const [currentRoomId, setCurrentRoomId] = useState(1);

  const getRoomStorageKey = (uid) => `libraryRoomId_${uid}`;

  const getStoredRoomForUser = (uid) => {
    try {
      const raw = localStorage.getItem(getRoomStorageKey(uid));
      const id = raw ? parseInt(raw) : NaN;
      if (Number.isFinite(id)) return id;
    } catch {}
    return null;
  };

  const persistRoomForUser = (uid, rid) => {
    try {
      localStorage.setItem(getRoomStorageKey(uid), String(rid));
    } catch {}
  };

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.role === 'admin' ? 'admin' : `user_${currentUser.id || currentUser.email}`;
    persistRoomForUser(uid, currentRoomId);
  }, [currentUser, currentRoomId]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [quickBookingSeat, setQuickBookingSeat] = useState(null);
  const [quickBookingForm, setQuickBookingForm] = useState({ date: '', time: '' });

  const updateReservationStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    setReservations(prevReservations => {
      return prevReservations.map(reservation => {
        const reservationDate = new Date(reservation.date);
        const todayDate = new Date(today);
        
        // 处理已签到状态：预约结束后自动完成
        if (reservation.status === 'checked_in') {
          const endTimeStr = reservation.time.split(' - ')[1];
          const endHour = parseInt(endTimeStr.split(':')[0]);
          const endMinute = parseInt(endTimeStr.split(':')[1]);
          
          const endTime = new Date(todayDate);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          if (now > endTime) {
            return { ...reservation, status: 'completed' };
          }
        }
        
        // 处理待使用状态：过期则标记为未使用
        if (reservation.status === 'pending') {
          if (reservationDate < todayDate) {
            return { ...reservation, status: 'missed' };
          } else if (reservationDate.toDateString() === todayDate.toDateString()) {
            const endTimeStr = reservation.time.split(' - ')[1];
            const endHour = parseInt(endTimeStr.split(':')[0]);
            const endMinute = parseInt(endTimeStr.split(':')[1]);
            
            const endTime = new Date(todayDate);
            endTime.setHours(endHour, endMinute, 0, 0);
            
            if (now > endTime) {
              return { ...reservation, status: 'missed' };
            }
          }
        }
        
        return reservation;
      });
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('libraryUsers', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users to localStorage:', error);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('libraryReservations', JSON.stringify(reservations));
    } catch (error) {
      console.error('Error saving reservations to localStorage:', error);
    }
  }, [reservations]);

  useEffect(() => {
    try {
      localStorage.setItem('libraryNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('libraryFeedbacks', JSON.stringify(feedbacks));
    } catch (error) {
      console.error('Error saving feedbacks to localStorage:', error);
    }
  }, [feedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem('libraryRooms', JSON.stringify(rooms));
    } catch (error) {
      console.error('Error saving rooms to localStorage:', error);
    }
  }, [rooms]);

  const addNotification = (notification) => {
    setNotifications(prev => [
      { 
        id: Date.now(), 
        timestamp: notification.timestamp || Date.now(), 
        read: false, 
        ...notification 
      },
      ...prev
    ]);
  };

  const showToastMessage = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 18px;border-radius:8px;color:#fff;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transition:opacity .2s;${type === 'error' ? 'background:#ef4444' : 'background:#22c55e'}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 1800);
  };

  const openQuickBooking = (seat) => {
    setQuickBookingSeat(seat);
    const today = new Date().toISOString().split('T')[0];
    setQuickBookingForm({ date: today, time: '08:00 - 12:00' });
  };

  const submitQuickBooking = () => {
    if (!quickBookingSeat) return;
    const { date, time } = quickBookingForm;
    if (!date || !time) {
      showToastMessage('请填写完整的日期和时间段', 'error');
      return;
    }

    const already = reservations.find(r =>
      r.roomId === quickBookingSeat.roomId &&
      r.seatId === quickBookingSeat.seatNumber &&
      r.date === date &&
      r.time === time &&
      (r.status === 'pending' || r.status === 'checkedIn')
    );
    if (already) {
      showToastMessage('该座位此时段已被预约', 'error');
      return;
    }

    const newId = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) + 1 : 1;
    const newRes = {
      id: newId,
      roomId: quickBookingSeat.roomId,
      userId: currentUser?.id || 0,
      userName: currentUser?.name || '用户',
      seatId: quickBookingSeat.seatNumber,
      date,
      time,
      status: 'pending',
    };
    setReservations([...reservations, newRes]);

    const roomName = quickBookingSeat.roomName || '';
    addNotification({
      title: '预约成功',
      message: `您已成功预约 ${roomName} 座位 ${quickBookingSeat.seatNumber}，${date} ${time}`,
      isAllUsers: false,
      userId: currentUser?.id || 'unknown',
    });
    addNotification({
      title: '新预约通知',
      message: `${currentUser?.name || '用户'} 预约了 ${roomName} 座位 ${quickBookingSeat.seatNumber}，${date} ${time}`,
      isAllUsers: false,
      userId: null,
      forAdmin: true,
    });

    setQuickBookingSeat(null);
    showToastMessage('预约成功！');
  };

  const exportAllData = () => {
    const data = {
      users,
      reservations,
      notifications,
      rooms,
      feedbacks,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `自习室数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.users) setUsers(data.users);
      if (data.reservations) setReservations(data.reservations);
      if (data.notifications) setNotifications(data.notifications);
      if (data.feedbacks) setFeedbacks(data.feedbacks);
      if (data.rooms) {
        setRooms(data.rooms);
        if (data.rooms.length > 0) setCurrentRoomId(data.rooms[0].id);
      }
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  };

  const handleOpenProfile = () => {
    setShowProfileModal(true);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();

    const seats = [];
    rooms.forEach(room => {
      const count = room.seatCount || 0;
      for (let i = 1; i <= count; i++) {
        const seatId = i.toString();
        const matched =
          `座位${i}`.includes(q) ||
          seatId.includes(q) ||
          `${room.name || ''}`.toLowerCase().includes(q);
        if (matched) {
          const res = reservations.find(r => r.roomId === room.id && String(r.seatId) === seatId);
          seats.push({
            id: `${room.id}-${i}`,
            roomId: room.id,
            roomName: room.name,
            seatId,
            seatNumber: i,
            label: `${room.name || ''} · 座位 ${i}`,
            hasReservation: !!res,
            reservationUser: res ? (users.find(u => u.id === res.userId)?.name || res.userName) : null,
          });
        }
      }
    });

    const matchedUsers = users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.remark || '').toLowerCase().includes(q)
    );

    const matchedReservations = reservations.filter(r => {
      const u = users.find(x => x.id === r.userId);
      const name = u?.name || r.userName || '';
      const room = rooms.find(x => x.id === r.roomId);
      return (
        `座位${r.seatId}`.includes(q) ||
        `座位${r.seat}`.includes(q) ||
        (r.date || '').includes(q) ||
        name.toLowerCase().includes(q) ||
        (r.time || '').includes(q) ||
        (room?.name || '').toLowerCase().includes(q) ||
        (u?.email || '').toLowerCase().includes(q) ||
        (u?.phone || '').includes(q) ||
        (u?.remark || '').toLowerCase().includes(q)
      );
    }).map(r => {
      const u = users.find(x => x.id === r.userId);
      const room = rooms.find(x => x.id === r.roomId);
      return {
        ...r,
        userNameDisplay: u?.name || r.userName,
        roomName: room?.name || '',
      };
    });

    return { seats: seats.slice(0, 20), users: matchedUsers.slice(0, 10), reservations: matchedReservations.slice(0, 15) };
  }, [searchQuery, reservations, users, rooms]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setShowSearchModal(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    updateReservationStatus();
    
    const interval = setInterval(updateReservationStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const renderContent = (isAdmin, users, handleUpdateUsers, currentUser) => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard isDark={isDark} isAdmin={isAdmin} currentUser={currentUser} reservations={reservations} rooms={rooms} currentRoomId={currentRoomId} setCurrentPage={setCurrentPage} onOpenProfile={handleOpenProfile} />;
      case 'seats':
        return <SeatManagement
          isDark={isDark}
          isAdmin={isAdmin}
          currentUser={currentUser}
          reservations={reservations}
          setReservations={setReservations}
          users={users}
          rooms={rooms}
          currentRoomId={currentRoomId}
          setCurrentRoomId={setCurrentRoomId}
          addNotification={addNotification}
        />;
      case 'reservations':
        return <ReservationManagement
          isDark={isDark}
          isAdmin={isAdmin}
          currentUser={currentUser}
          reservations={reservations}
          setReservations={setReservations}
          users={users}
          rooms={rooms}
          addNotification={addNotification}
        />;
      case 'users':
        if (isAdmin) {
          return <UserManagement isDark={isDark} isAdmin={isAdmin} users={users} setUsers={handleUpdateUsers} reservations={reservations} setReservations={setReservations} notifications={notifications} setNotifications={setNotifications} rooms={rooms} />;
        }
        return <Dashboard isDark={isDark} isAdmin={isAdmin} currentUser={currentUser} reservations={reservations} rooms={rooms} currentRoomId={currentRoomId} setCurrentPage={setCurrentPage} />;
      case 'settings':
        return <Settings isDark={isDark} setIsDark={setIsDark} isAdmin={isAdmin} currentUser={currentUser} exportAllData={exportAllData} importAllData={importAllData} rooms={rooms} setRooms={setRooms} feedbacks={feedbacks} setFeedbacks={setFeedbacks} addNotification={addNotification} users={users} jumpTarget={jumpTarget} setJumpTarget={setJumpTarget} />;
      case 'minesweeper':
        return <Minesweeper onBack={() => setCurrentPage('dashboard')} isDark={isDark} />;
      case 'radio':
        return <RadioPlayer isDark={isDark} isAdmin={isAdmin} />;
      default:
        return <Dashboard isDark={isDark} isAdmin={isAdmin} currentUser={currentUser} reservations={reservations} rooms={rooms} currentRoomId={currentRoomId} setCurrentPage={setCurrentPage} />;
    }
  };

  const [showAccountDeleted, setShowAccountDeleted] = useState(false);

  const handleLogin = (user) => {
    if (user.role === 'admin') {
      completeLogin(user);
      return;
    }
    
    const fullUser = users.find(u => u.id === user.id);
    
    if (!fullUser) {
      showToastMessage('该账号不存在', 'error');
      return;
    }
    
    if (fullUser.status === 'inactive') {
      showToastMessage('该账号已被禁用，请联系管理员', 'error');
      return;
    }
    
    completeLogin(fullUser);
  };

  const completeLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setShowRegister(false);

    const uid = user.role === 'admin' ? 'admin' : `user_${user.id || user.email}`;
    const savedRoomId = getStoredRoomForUser(uid);
    const firstRoom = rooms.length > 0 ? rooms[0].id : 1;
    if (savedRoomId && rooms.some(r => r.id === savedRoomId)) {
      setCurrentRoomId(savedRoomId);
    } else {
      setCurrentRoomId(firstRoom);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      const uid = currentUser.role === 'admin' ? 'admin' : `user_${currentUser.id || currentUser.email}`;
      persistRoomForUser(uid, currentRoomId);
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowAccountDeleted(false);
  };

  useEffect(() => {
    if (!isLoggedIn || !currentUser || currentUser.role === 'admin') return;
    
    const userExists = users.find(u => u.id === currentUser.id);
    
    if (!userExists) {
      setShowAccountDeleted(true);
      setIsLoggedIn(false);
      setCurrentUser(null);
    } else if (userExists.status === 'inactive') {
      showToastMessage('您的账号已被禁用，请联系管理员', 'error');
      setTimeout(() => {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }, 3000);
    } else if (userExists.cardType && userExists.cardExpire) {
      const expireDate = new Date(userExists.cardExpire);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expireDate.setHours(0, 0, 0, 0);
      
      if (expireDate < today) {
        showToastMessage('您的会员卡已过期，请联系管理员续费', 'error');
        setTimeout(() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }, 5000);
      } else {
        const diffDays = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
          showToastMessage(`您的会员卡将在 ${diffDays} 天后到期，请及时续费`, 'error');
        }
      }
    }
  }, [users, isLoggedIn, currentUser]);

  const handleRegister = (userData) => {
    const existingUser = users.find(u => u.phone === userData.phone);
    if (existingUser) {
      showToastMessage('该手机号已被注册！', 'error');
      return;
    }
    
    const maxId = users.reduce((max, u) => Math.max(max, u.id || 0), 0);
    const newUser = {
      id: maxId + 1,
      name: userData.name,
      phone: userData.phone,
      password: userData.password,
      status: 'active',
      role: 'user',
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setNewUserRegistered(true);
    setShowRegister(false);
    completeLogin(newUser);
  };

  const handleUpdateCurrentUser = (updatedUserData) => {
    const updatedUsers = users.map(u => 
      u.id === currentUser.id ? { ...u, ...updatedUserData } : u
    );
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, ...updatedUserData });
  };

  const handleUpdateUsers = (newUsers) => {
    setUsers(newUsers);
  };

  const handleRefreshData = () => {
    try {
      const savedUsers = localStorage.getItem('libraryUsers');
      const savedReservations = localStorage.getItem('libraryReservations');
      const savedNotifications = localStorage.getItem('libraryNotifications');
      const savedFeedbacks = localStorage.getItem('libraryFeedbacks');
      const savedRooms = localStorage.getItem('libraryRooms');
      
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      if (savedReservations) setReservations(JSON.parse(savedReservations));
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      if (savedFeedbacks) setFeedbacks(JSON.parse(savedFeedbacks));
      if (savedRooms) setRooms(JSON.parse(savedRooms));
      
      const savedCurrentUser = localStorage.getItem('libraryCurrentUser');
      if (savedCurrentUser) {
        const user = JSON.parse(savedCurrentUser);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  if (!isLoggedIn) {
    if (showAccountDeleted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <div className={`w-full max-w-md mx-4 rounded-2xl shadow-xl p-8 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
                isDark ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                账号已被注销
              </h2>
              <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                您的账号已被管理员注销，无法继续使用。如有疑问，请联系管理员。
              </p>
              <button
                onClick={() => setShowAccountDeleted(false)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                返回登录页面
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (showRegister) {
      return (
        <Register
          onRegister={handleRegister}
          onBackToLogin={() => setShowRegister(false)}
          users={users}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onGoToRegister={() => setShowRegister(true)}
        users={users}
      />
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isDark={isDark}
        setIsDark={setIsDark}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />

      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header
          isDark={isDark}
          currentUser={currentUser}
          isAdmin={isAdmin}
          newUserRegistered={newUserRegistered}
          setNewUserRegistered={setNewUserRegistered}
          users={users}
          updateCurrentUser={handleUpdateCurrentUser}
          notifications={notifications}
          setNotifications={setNotifications}
          showProfileModal={showProfileModal}
          setShowProfileModal={setShowProfileModal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          jumpTarget={jumpTarget}
          setJumpTarget={setJumpTarget}
          feedbacks={feedbacks}
          onRefresh={handleRefreshData}
        />

        {showSearchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] pt-24" onClick={() => {
            setShowSearchModal(false);
          }}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[560px] max-w-[92vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索座位号、姓名、邮箱、日期..."
                  className={`flex-1 bg-transparent outline-none text-base ${isDark ? 'placeholder-gray-500' : 'placeholder-gray-400'}`}
                />
                <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); }} className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                {!searchResults ? (
                  <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>输入关键词开始搜索</p>
                ) : (searchResults.seats.length === 0 && searchResults.users.length === 0 && searchResults.reservations.length === 0) ? (
                  <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>未找到与 "{searchQuery}" 相关的结果</p>
                ) : (
                  <>
                    {searchResults.seats.length > 0 && (
                      <div>
                        <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          <MapPin className="w-3.5 h-3.5" /> 座位 ({searchResults.seats.length})
                        </div>
                        <div className="space-y-1">
                          {searchResults.seats.map(s => (
                            <div
                              key={s.id}
                              className={`w-full px-3 py-2 rounded-lg flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors group`}
                            >
                              <button
                                onClick={() => { setCurrentRoomId(s.roomId); setCurrentPage('seats'); setShowSearchModal(false); setSearchQuery(''); }}
                                className="flex-1 text-left flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <span className="font-medium">{s.label}</span>
                                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.seatNumber}号座位 · 点击查看座位图</div>
                                </div>
                                {s.hasReservation ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">已预约 · {s.reservationUser}</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">空闲</span>
                                )}
                              </button>
                              {currentUser && currentUser.role !== 'admin' && !s.hasReservation && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openQuickBooking(s); }}
                                  className="ml-2 px-2.5 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors shrink-0"
                                >
                                  立即预约
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.users.length > 0 && (
                      <div>
                        <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          <Users className="w-3.5 h-3.5" /> 用户 ({searchResults.users.length})
                        </div>
                        <div className="space-y-1">
                          {searchResults.users.map(u => (
                            <div key={u.id} className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} flex items-center justify-between`}>
                              <div>
                                <div className="font-medium flex items-center gap-1.5">
                                  {u.name}
                                  {u.remark && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{u.remark}</span>}
                                </div>
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{u.email} {u.phone ? `· ${u.phone}` : ''}</div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                                {u.role === 'admin' ? '管理员' : '普通用户'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.reservations.length > 0 && (
                      <div>
                        <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          <Calendar className="w-3.5 h-3.5" /> 预约 ({searchResults.reservations.length})
                        </div>
                        <div className="space-y-1">
                          {searchResults.reservations.map((r, idx) => {
                            const u = users.find(x => x.id === r.userId);
                            return (
                              <div key={idx} className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} flex items-center justify-between`}>
                                <div>
                                  <div className="font-medium">{r.roomName ? `${r.roomName} · 座位 ${r.seatId}` : `座位 ${r.seatId}`} · {r.userNameDisplay}</div>
                                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{r.date} · {r.time}</div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  r.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : r.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  : r.status === 'checkedIn' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                }`}>
                                  {r.status === 'completed' ? '已完成' : r.status === 'cancelled' ? '已取消' : r.status === 'checkedIn' ? '已签到' : '已预约'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {quickBookingSeat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={() => setQuickBookingSeat(null)}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[420px] max-w-[92vw] ${isDark ? 'text-white' : 'text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="font-semibold text-base">
                  预约 {quickBookingSeat.roomName} · 座位 {quickBookingSeat.seatNumber}
                </h3>
                <button onClick={() => setQuickBookingSeat(null)} className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>日期</label>
                  <input
                    type="date"
                    value={quickBookingForm.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setQuickBookingForm({ ...quickBookingForm, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>时间段</label>
                  <select
                    value={quickBookingForm.time}
                    onChange={(e) => setQuickBookingForm({ ...quickBookingForm, time: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="08:00 - 10:00">08:00 - 10:00</option>
                    <option value="08:00 - 12:00">08:00 - 12:00</option>
                    <option value="10:00 - 12:00">10:00 - 12:00</option>
                    <option value="14:00 - 16:00">14:00 - 16:00</option>
                    <option value="14:00 - 18:00">14:00 - 18:00</option>
                    <option value="18:00 - 21:00">18:00 - 21:00</option>
                  </select>
                </div>
              </div>
              <div className={`flex gap-3 px-5 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button onClick={() => setQuickBookingSeat(null)} className={`flex-1 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  取消
                </button>
                <button onClick={submitQuickBooking} className="flex-1 py-2 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                  确认预约
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-[calc(100vh-64px)]`}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          }>
            {renderContent(isAdmin, users, handleUpdateUsers, currentUser)}
          </Suspense>
        </div>

        <RadioMiniBar isDark={isDark} currentPage={currentPage} />
      </main>
    </div>
  );
}

export default App;
