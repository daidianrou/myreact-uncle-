import { useState } from 'react';
import { Eye, EyeOff, Home, Phone, Lock, User, ArrowLeft } from 'lucide-react';

export default function Register({ onRegister, onBackToLogin, users }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name || !phone || !password || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的 11 位手机号');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (users) {
      const existingUser = users.find(u => u.phone === phone);
      if (existingUser) {
        setError('该手机号已被注册！');
        return;
      }
    }

    setError('');
    onRegister({ name, phone, password });
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
            }`}>注册新账户</h1>
            <p className={`text-sm ${
              document.documentElement.classList.contains('dark') 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}>创建您的自习室管理系统账户</p>
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
                姓名
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
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  document.documentElement.classList.contains('dark') 
                    ? 'text-gray-400' 
                    : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
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
                  placeholder="请输入密码（至少6位）"
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

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                document.documentElement.classList.contains('dark') 
                  ? 'text-gray-300' 
                  : 'text-gray-700'
              }`}>
                确认密码
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className={`w-full pl-10 pr-12 py-3 bg-transparent outline-none ${
                    document.documentElement.classList.contains('dark') 
                      ? 'text-white placeholder-gray-400' 
                      : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    document.documentElement.classList.contains('dark') 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-400 hover:text-gray-600'
                  } transition-colors`}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              注册
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onBackToLogin}
              className={`flex items-center justify-center gap-2 text-sm ${
                document.documentElement.classList.contains('dark') 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              } transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
              已有账户？返回登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
