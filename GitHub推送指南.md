# 把 React 项目推送到 GitHub —— 完整步骤指南

> 适用场景：本地已有一个开发好的项目（如本项目的 `myreact(uncle)` 自习室座位预约系统），想把它上传到 GitHub 做备份 / 提交 / 协作。
> 本文所有命令均在 Windows + Git Bash 下验证，macOS / Linux 把路径写法改一下即可通用。

---

## 一、开始前先确认三件事

1. **Git 已安装**
   打开终端输入 `git --version`，能显示版本号即正常。没装就去 https://git-scm.com 下载安装。

2. **你有 GitHub 账号**
   记住两样东西，它们不是同一个：
   - **用户名（Username）**：用于仓库地址，例如 `daidianrou`。它是仓库 URL 里的一截（`github.com/<用户名>/<仓库名>`）。
   - **显示名（Display name）**：只是页面上给人看的昵称，例如截图里看着像 `daidianou` 的那个，它**不能**用于 git 地址。
   > ⚠️ 踩坑提醒：我们之前推送失败「Repository not found」，根本原因就是把显示名当成了用户名。仓库真实路径是 `daidianrou/myreact-uncle-`，不是 `daidianou/...`。

3. **GitHub 从 2021 年起不支持「密码」推送**
   必须用 **Personal Access Token (PAT)** 代替密码。下文第三步专门讲。

---

## 二、在 GitHub 网页上创建仓库

1. 登录 GitHub → 右上角 **+** → **New repository**。
2. 填写：
   - **Repository name**：仓库名，例如 `myreact-uncle-`（用小写、连字符，别用中文和空格）。
   - **Description**：可选，项目说明。
   - **Public / Private**：自选。课程作业一般 Public 即可。
   - **重要**：除非你知道怎么处理合并冲突，否则 **不要** 勾选 "Add a README file" / "Add .gitignore" / "Choose a license"。让仓库完全是空的，后面本地推上去最省事。
3. 点 **Create repository**。
4. 创建后会看到一个空仓库页面，里面有一行 `https://github.com/<用户名>/<仓库名>.git` —— 这就是你的远程地址，复制备用。

---

## 三、生成 Personal Access Token（PAT）

1. GitHub 网页 → 右上角头像 → **Settings**。
2. 左侧最底部 **Developer settings** → **Personal access tokens** → **Tokens (classic)**。
3. 点 **Generate new token (classic)**。
4. 填写：
   - **Note**：随便写，例如 `myreact-push`。
   - **Expiration**：选 30 天或 90 天（别选 No expiration，太不安全）。
   - **Select scopes**：只勾第一个 **`repo`**（整组，代表对仓库的完全控制）。
5. 拉到底点 **Generate token**。
6. **立刻复制**生成的 token（以 `ghp_` 开头的一长串，**只显示这一次**）。

> 把这个 token 当成密码保管，不要发到群里、不要截图外传。用完后建议在 GitHub 上把它 revoke 掉。

---

## 四、配置本地 Git 身份（只需一次）

```bash
git config --global user.name  "你的用户名"
git config --global user.email "你的邮箱"
```

验证：
```bash
git config --global user.name
git config --global user.email
```

（可选）让 Windows 记住凭证，以后 push 不再重复输入：
```bash
git config --global credential.helper wincred
```

---

## 五、把本地项目和远程仓库关联

进入你的项目根目录：
```bash
cd "C:/Users/34655/Desktop/myreact(uncle)"
```

如果项目**还没有** git 仓库（没有 `.git` 文件夹）：
```bash
git init
git branch -M main
```

关联远程地址（把 `<用户名>` 和 `<仓库名>` 换成你自己的；如果之前关联错了，用 `set-url` 覆盖）：
```bash
# 首次关联
git remote add origin https://github.com/<用户名>/<仓库名>.git

# 或：覆盖已有的错误地址
git remote set-url origin https://github.com/<用户名>/<仓库名>.git

# 检查是否改对
git remote -v
```

---

## 六、提交本地代码

```bash
# 1. 把当前目录所有改动加入暂存区
git add -A

# 2. 提交，写一句说明（用中文或英文都行）
git commit -m "feat: 初始化自习室座位预约系统"
```

> 如果改了很多天、很多功能，可以分多次 commit，每次聚焦一个主题：
> `git commit -m "fix: 修复 Toast 常驻显示"`、`git commit -m "feat: 预约弹窗新增房间选择"` ……

---

## 七、推送到 GitHub（处理认证）

### 方式 A：用 token 临时推送（推荐第一次用）

把 token 嵌进 URL 里推一次，推完马上把 token 从地址里去掉：

```bash
# 用 token 推送（替换成你的真实 token 和路径）
git push -u origin main
# 如果 remote 还没配 token，可临时用：
git remote set-url origin https://<你的TOKEN>@github.com/<用户名>/<仓库名>.git
git push -u origin main
```

推送成功后，**立刻移除地址里的 token**（安全！）：
```bash
git remote set-url origin https://github.com/<用户名>/<仓库名>.git
git remote -v   # 确认 URL 里已经没有 ghp_ 了
```

### 方式 B：用 Windows 凭据管理器（一劳永逸）

如果你在第四步配了 `credential.helper wincred`，第一次 push 时弹窗输入：
- 用户名：你的 GitHub 用户名
- 密码：**粘贴你的 PAT**（不是登录密码）

输一次之后 Windows 会记住，以后 `git push` 不再提示。

### 如果远程仓库不是空的（比如你勾了 README）

先拉下来合并，再推：
```bash
git pull origin main --allow-unrelated-histories --no-rebase --no-edit
# 若 README.md 报冲突：
#   打开 README.md，删掉 <<<<<<< ======= >>>>>>> 这些冲突标记，保留你想要的内容
#   然后：git add README.md && git commit --no-edit
git push -u origin main
```

---

## 八、常见错误排查

| 报错 / 现象 | 原因 | 解决办法 |
|---|---|---|
| `Repository not found` | 用户名或仓库名拼错（最容易把**显示名**当**用户名**） | 去 GitHub 复制准确的仓库 URL；用 `git remote set-url` 改对 |
| `Authentication failed` / `Support for password authentication was removed` | 用**登录密码**在推，GitHub 已停用 | 改用 PAT（第三步生成的 `ghp_...`） |
| `failed to push some refs` | 远程有本地没有的提交（如 README） | 先 `git pull --allow-unrelated-histories`，再 push |
| `README.md 冲突` | 本地 CRA 模板和远程 README 重叠 | 手动解决冲突后 `git add` + `git commit` |
| `src refspec main does not match` | 本地默认分支叫 master | 先 `git branch -M main` 改名，或推 `master` 分支 |

---

## 九、日常推送命令速查

```bash
# 查看改了什么
git status

# 提交并推送（最常用的三连）
git add -A
git commit -m "说明这次改了啥"
git push

# 拉取别人/别的电脑上的最新改动
git pull
```

---

## 十、安全收尾提醒

1. **用完即废**：本次为推送而生成的 PAT 一旦用完，去 GitHub **Settings → Developer settings → Personal access tokens** 把它 **revoke** 掉，下次重新生成。
2. **别把 token 写进代码或提交里**：它会出现在 `.git/config` 或命令历史，记得推完就用 `set-url` 清掉。
3. **`.gitignore` 建议**：React 项目默认已有 `.gitignore`（会忽略 `node_modules/`、`build/`），别手贱 `git add -f node_modules`，否则仓库会巨大无比。

---

### 本项目的实际参数（供参考，已脱敏）

| 项目 | 值 |
|---|---|
| 本地路径 | `C:/Users/34655/Desktop/myreact(uncle)` |
| GitHub 用户名 | `daidianrou` |
| 仓库名 | `myreact-uncle-` |
| 远程地址 | `https://github.com/daidianrou/myreact-uncle-.git` |
| 默认分支 | `main` |

> 打开 `https://github.com/daidianrou/myreact-uncle-` 即可看到已推送的项目。
