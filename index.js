const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const express = require('express');
const adminRoutes = require('./src/web/adminRoutes');
const { initDatabase } = require('./src/database/init');
const { healthCheck } = require('./src/config/database');

const app = express();
const port = Number(process.env.PORT) || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/health', async (req, res) => {
  const status = await healthCheck();
  res.status(status.connected ? 200 : 503).json({
    status: status.connected ? 'ok' : 'degraded',
    database: status.connected ? 'connected' : 'disconnected',
    message: status.message,
  });
});

app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    pageTitle: 'Not found',
    error: 'Không tìm thấy trang yêu cầu.',
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const message = err.expose ? err.message : 'Đã xảy ra lỗi ngoài ý muốn.';
  res.status(err.statusCode || 500).render('error', {
    pageTitle: 'Lỗi hệ thống',
    error: message,
  });
});

async function bootstrap() {
  await initDatabase();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exitCode = 1;
});
