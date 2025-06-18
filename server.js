const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const highlight = require('highlight.js');

const app = express();
const PORT = 3000;

// 配置中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 配置会话
app.use(session({
  secret: 'code-share-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// 数据文件路径
const USERS_FILE = path.join(__dirname, 'user.json');
const DATA_FILE = path.join(__dirname, 'data.json');

// 确保数据文件存在
function initializeFiles() {
  if (!fs.existsSync(USERS_FILE)) {
    // 创建初始管理员用户 (密码: admin123)
    const adminHash = bcrypt.hashSync('admin123', 10);
    fs.writeFileSync(USERS_FILE, JSON.stringify([{
      id: 1,
      username: 'admin',
      password: adminHash,
      isAdmin: true
    }], null, 2));
  }
  
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

// 读取用户数据
function getUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// 读取代码模块数据
function getModules() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// 保存代码模块数据
function saveModules(modules) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(modules, null, 2));
}

// 保存用户数据
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 身份验证中间件
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// 管理员权限中间件
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  res.status(403).send('Access denied');
}

// 初始化文件
initializeFiles();

// 路由
app.get('/', isAuthenticated, (req, res) => {
  const modules = getModules();
  res.render('index', {
    user: req.session.user,
    modules: modules
  });
});

// 登录页面
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 注册页面
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// 上传页面
app.get('/upload', isAuthenticated, (req, res) => {
  res.render('upload', { user: req.session.user });
});

// 登录处理
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: '用户名或密码不正确' });
  }

  req.session.user = user;
  res.redirect('/');
});

// 注册处理
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  if (users.some(u => u.username === username)) {
    return res.render('register', { error: '用户名已存在' });
  }

  const newUser = {
    id: Date.now(),
    username,
    password: bcrypt.hashSync(password, 10),
    isAdmin: false
  };

  users.push(newUser);
  saveUsers(users);
  res.redirect('/login');
});

// 登出
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// 上传代码模块
app.post('/upload', isAuthenticated, (req, res) => {
  const { title, code, description, language } = req.body;
  const modules = getModules();

  const newModule = {
    id: Date.now(),
    title,
    code,
    description,
    language: language || 'auto',
    username: req.session.user.username,
    userId: req.session.user.id,
    createdAt: new Date().toISOString()
  };

  modules.push(newModule);
  saveModules(modules);
  res.redirect('/');
});

// 编辑模块页面
app.get('/edit/:id', isAuthenticated, (req, res) => {
  const modules = getModules();
  const module = modules.find(m => m.id === parseInt(req.params.id));

  if (!module) {
    return res.status(404).send('模块不存在');
  }

  // 检查权限
  if (module.userId !== req.session.user.id && !req.session.user.isAdmin) {
    return res.status(403).send('没有权限编辑此模块');
  }

  res.render('edit', {
    user: req.session.user,
    module: module
  });
});

// 更新模块
app.post('/edit/:id', isAuthenticated, (req, res) => {
  const { title, code, description, language } = req.body;
  const modules = getModules();
  const index = modules.findIndex(m => m.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).send('模块不存在');
  }

  // 检查权限
  if (modules[index].userId !== req.session.user.id && !req.session.user.isAdmin) {
    return res.status(403).send('没有权限编辑此模块');
  }

  modules[index] = {
    ...modules[index],
    title,
    code,
    description,
    language: language || 'auto'
  };

  saveModules(modules);
  res.redirect('/');
});

// 删除模块
app.get('/delete/:id', isAuthenticated, (req, res) => {
  const modules = getModules();
  const index = modules.findIndex(m => m.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).send('模块不存在');
  }

  // 检查权限
  if (modules[index].userId !== req.session.user.id && !req.session.user.isAdmin) {
    return res.status(403).send('没有权限删除此模块');
  }

  modules.splice(index, 1);
  saveModules(modules);
  res.redirect('/');
});

// 查看模块详情
app.get('/module/:id', isAuthenticated, (req, res) => {
  const modules = getModules();
  const module = modules.find(m => m.id === parseInt(req.params.id));

  if (!module) {
    return res.status(404).send('模块不存在');
  }

  // 代码高亮处理
  let highlightedCode;
  if (module.language && module.language !== 'auto') {
    try {
      highlightedCode = highlight.highlight(module.code, { language: module.language }).value;
    } catch (e) {
      highlightedCode = highlight.highlightAuto(module.code).value;
    }
  } else {
    highlightedCode = highlight.highlightAuto(module.code).value;
  }

  res.render('module', {
    user: req.session.user,
    module: {
      ...module,
      highlightedCode: highlightedCode
    }
  });
});

// 管理员页面
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  const users = getUsers();
  const modules = getModules();
  res.render('admin', {
    user: req.session.user,
    users: users,
    modules: modules
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});