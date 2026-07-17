import {
  LayoutDashboard,
  Square,
  Calendar,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, adminOnly: false },
  { id: 'radio', label: '自习室电台', icon: Radio, adminOnly: false },
  { id: 'seats', label: '座位管理', icon: Square, adminOnly: false },
  { id: 'reservations', label: '预约管理', icon: Calendar, adminOnly: false },
  { id: 'users', label: '用户管理', icon: Users, adminOnly: true },
  { id: 'settings', label: '系统设置', icon: Settings, adminOnly: false },
];

export default function Sidebar({ currentPage, setCurrentPage, isDark, setIsDark, isCollapsed, setIsCollapsed, onLogout, isAdmin }) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                <img src={`${process.env.PUBLIC_URL}/ODF.png`} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-gray-800 dark:text-white">云创自习室</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto overflow-hidden bg-white">
              <img src={`${process.env.PUBLIC_URL}/ODF.png`} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {menuItems
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!isCollapsed && <span className="font-medium">{isDark ? '亮色模式' : '暗色模式'}</span>}
          </button>

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors mt-1 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">退出登录</span>}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-1 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isCollapsed && <span className="font-medium">{isCollapsed ? '展开菜单' : '折叠菜单'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
