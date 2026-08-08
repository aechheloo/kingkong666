const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const express = require('express');

const adminRoutes = require('./src/web/adminRoutes');
const { initDatabase } = require('./src/database/init');
const { healthCheck } = require('./src/config/database');
const { handleWebhookUpdate } = require('./src/bot/telegram');

const app = express();
const port = Number(process.env.PORT) || 8080;

// Railway chạy phía sau proxy
app.set('trust proxy', 1);

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Telegram gửi thông tin nhóm về webhook này khi bot được thêm vào nhóm.
app.post('/telegram/webhook', async (req, res) => {
  try {
    await handleWebhookUpdate(
      req.body,
      req.get('x-telegram-bot-api-secret-token') || ''
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('TELEGRAM WEBHOOK ERROR:', error);
    res.status(error.statusCode || 500).json({ success: false });
  }
});

// Trang chính
app.get('/', (_req, res) => {
  res.redirect('/admin');
});

// Kiểm tra hệ thống
app.get('/health', async (_req, res) => {
  try {
    const health = await healthCheck();

    const disconnected =
      health === false ||
      health?.connected === false ||
      health?.success === false ||
      health?.database === 'disconnected';

    res.status(disconnected ? 503 : 200).json({
      success: !disconnected,
      service: 'Thu-Chi-Luong',
      database: disconnected ? 'disconnected' : 'connected',
      health: health || null,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'Thu-Chi-Luong',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Trang quản trị
app.use('/admin', adminRoutes);

// Không tìm thấy trang
app.use((_req, res) => {
  res.status(404).send('Không tìm thấy trang.');
});

// Xử lý lỗi
app.use((error, _req, res, next) => {
  console.error('SERVER ERROR:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).send(
    'Hệ thống đang gặp lỗi. Vui lòng thử lại.',
  );
});

// Khởi động hệ thống
async function startServer() {
  await initDatabase();

  app.listen(port, () => {
    console.log('==============================');
    console.log('Thu Chi Luong Started');
    console.log('PORT:', port);
    console.log('DATABASE: CONNECTED');
    console.log(
      'TELEGRAM:',
      process.env.BOT_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED',
    );
    console.log('==============================');
  });
}

startServer().catch((error) => {
  console.error('START SERVER ERROR:', error);
  process.exit(1);
});