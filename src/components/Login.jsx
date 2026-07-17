import { useState } from 'react';
import { Eye, EyeOff, Home, Phone, Lock, User, Shield } from 'lucide-react';

export default function Login({ onLogin, onGoToRegister, users }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('user');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!phone || !password) {
      setError('请填写手机号和密码');
      return;
    }

    if (userType === 'admin') {
      if (phone === 'admin' && password === '123456') {
        setError('');
        onLogin({ phone, email: 'admin@example.com', name: '管理员', role: 'admin', id: 0 });
      } else {
        setError('管理员账号或密码错误');
      }
    } else {
      const user = users.find(u => u.phone === phone && u.password === password && u.role !== 'admin');
      if (user) {
        if (user.status === 'inactive') {
          setError('该账号已被管理员禁用，请联系管理员');
          return;
        }
        setError('');
        onLogin(user);
      } else {
        setError('用户账号或密码错误');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-4">
        <div className={`rounded-2xl shadow-xl p-8 ${
          document.documentElement.classList.contains('dark') 
            ? 'bg-gray-800' 
            : 'bg-white'
        }`}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 overflow-hidden bg-white">
              <img src={`${process.env.PUBLIC_URL}/ODF.png`} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${
              document.documentElement.classList.contains('dark') 
                ? 'text-white' 
                : 'text-gray-800'
            }`}>云创自习室</h1>
            <p className={`text-sm ${
              document.documentElement.classList.contains('dark') 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}>欢迎回来，请登录您的账户</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setUserType('user')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                userType === 'user'
                  ? 'bg-blue-500 text-white' 
                  : document.documentElement.classList.contains('dark') 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              用户登录
            </button>
            <button
              type="button"
              onClick={() => setUserType('admin')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                userType === 'admin'
                  ? 'bg-blue-500 text-white' 
                  : document.documentElement.classList.contains('dark') 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              管理员登录
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                document.documentElement.classList.contains('dark') 
                  ? 'text-gray-300' 
                  : 'text-gray-700'
              }`}>
                手机号
              </label>
              <div className={`relative ${
                document.documentElement.classList.contains('dark') 
                  ? 'bg-gray-700' 
                  : 'bg-gray-50'
              } rounded-lg border ${
                document.documentElement.classList.contains('dark') 
                  ? 'border-gray-600' 
                  : 'border-gray-300'
              } focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-colors`}>
                <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  document.documentElement.classList.contains('dark') 
                    ? 'text-gray-400' 
                    : 'text-gray-400'
                }`} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className={`w-full pl-10 pr-4 py-3 bg-transparent outline-none ${
                    document.documentElement.classList.contains('dark') 
                      ? 'text-white placeholder-gray-400' 
                      : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                document.documentElement.classList.contains('dark') 
                  ? 'text-gray-300' 
                  : 'text-gray-700'
              }`}>
                密码
              </label>
              <div className={`relative ${
                document.documentElement.classList.contains('dark') 
                  ? 'bg-gray-700' 
                  : 'bg-gray-50'
              } rounded-lg border ${
                document.documentElement.classList.contains('dark') 
                  ? 'border-gray-600' 
                  : 'border-gray-300'
              } focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-colors`}>
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  document.documentElement.classList.contains('dark') 
                    ? 'text-gray-400' 
                    : 'text-gray-400'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className={`w-full pl-10 pr-12 py-3 bg-transparent outline-none ${
                    document.documentElement.classList.contains('dark') 
                      ? 'text-white placeholder-gray-400' 
                      : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    document.documentElement.classList.contains('dark') 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-400 hover:text-gray-600'
                  } transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              登录
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {userType === 'user' && (
              <button
                onClick={onGoToRegister}
                className={`text-sm ${
                  document.documentElement.classList.contains('dark') 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-blue-600 hover:text-blue-700'
                } transition-colors`}
              >
                没有账户？立即注册
              </button>
            )}
            <p className={`text-sm ${
              document.documentElement.classList.contains('dark') 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}>
              {userType === 'admin' 
                ? '管理员: admin / 123456' 
                : '测试用户可使用注册功能创建账户'}
            </p>
            
            <div className={`mt-4 p-3 rounded-lg ${
              document.documentElement.classList.contains('dark') 
                ? 'bg-blue-900/30 border border-blue-700' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-xs ${
                document.documentElement.classList.contains('dark') 
                  ? 'text-blue-300' 
                  : 'text-blue-600'
              }`}>
                💡 提示：您的注册信息和预约数据存储在当前浏览器中。换浏览器后需要重新注册或使用管理员账户登录。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
