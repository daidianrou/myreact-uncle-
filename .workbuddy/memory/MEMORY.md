# 项目记忆：myreact(uncle)

## 项目识别
- 这是一个**自习室 / 图书馆座位预约管理系统**（前端 SPA），与记忆中的"花卉识别系统"是**不同项目**。
- 纯前端，**无后端、无数据库**；所有数据存浏览器 localStorage。适合课程设计 / 演示，不适合生产（密码明文存储）。

## 技术栈
- React 19 + react-app-rewired（customize-cra，配置见 config-overrides.js）
- Tailwind CSS 3 + lucide-react / @ant-design/icons
- ECharts 6 + echarts-for-react
- 持久化：localStorage + 自研 useRealtimeSync hook（监听 window storage 事件做多标签页同步）

## 功能模块（12 个）
- 认证层：登录/注册（**手机号+密码**，无邮箱）、账号失效/会员卡过期检测
- 业务层：仪表盘、座位管理、预约管理（状态机 pending→checked_in→completed / missed / cancelled）、用户管理(admin)
- 辅助层：系统设置(数据导入导出JSON/房间管理)、自习室电台、扫雷、全局搜索、通知中心
- 全局：暗色模式、按用户记忆当前房间

## 管理员代用户预约（2026-07-16 新增）
- 项目定位：主要面向自习室管理员，用户无需登录即可被代约座位。
- 实现：SeatManagement 座位预约弹窗、ReservationManagement「新增预约」弹窗，当 `isAdmin` 为真时额外显示「预约用户」下拉（列出全部 users，name+phone）。
- 逻辑：管理员选中的用户 id/name 写入预约的 `userId`/`userName`；未选则报错「请选择要预约的用户」。普通用户仍按 `currentUser` 预约，不显示下拉。
- 通知：代约时个人通知文案改为「管理员为您预约了…」并指向 targetUserId；管理员通知标注「为用户 XXX 预约了…」。
- 状态重置：打开弹窗 / 取消 / 成功 后均清空 bookingUserId。

## 关键文件
- src/App.js：单一状态源，含全部业务逻辑（登录、预约、搜索、导出导入、过期检测）
- src/components/Login.jsx：手机号+密码登录，管理员 admin / 123456
- src/components/Register.jsx：手机号注册（正则 /^1\d{10}$/，唯一性校验，无邮箱无人脸）
- src/components/UserManagement.jsx：用户管理，手机号必填且唯一
- src/hooks/useRealtimeSync.js：localStorage 读写 + storage 事件同步

## 注意
- 默认用户密码 123456 明文；手机号作为唯一登录标识
- **人脸识别功能已于 2026-07-16 移除**（自习室电脑无摄像头）：删除 FaceVerify.jsx / FaceCapture.jsx / AdminFaceManager.jsx / src/utils/faceApi.js / public/models，并移除侧边栏"人脸管理"菜单、Header 人脸采集 UI、Login/Register 中的人脸与人脸登录分支。
- 历史 seed 用户数据可能仍含 email / faceDescriptor 字段，仅作数据兼容，UI 已不再展示。
- 座位状态查询为 O(n) 遍历，数据量大时需优化
