const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const express = require('express');

const adminRoutes = require('./src/web/adminRoutes');
const { initDatabase } = require('./src/database/init');
const { healthCheck } = require('./src/config/database');

const app = express();
const port = Number(process.env.PORT) || 8080;

/*
 * Railway chạy qua proxy.
 * Dòng này sửa lỗi ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
 */
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({
  extended: true,
}));

app.use(express.json());

app.use(express.static(
  path.join(__dirname, 'public'),
));

app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/health', async (req, res) => {
  const status = await healthCheck();

  res
    .status(status.connected ? 200 : 503)
    .json({
      status: status.connected
        ? 'ok'
        : 'degraded',

      database: status.connected
        ? 'connected'
        : 'disconnected',

      message: status.message,
    });
});

app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.use((error, req, res, next) => {
  console.error('SERVER ERROR:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).send(
    'Hệ thống đang gặp lỗi. Vui lòng thử lại.',
  );
});

async function startServer() {
  try {
    await initDatabase();

    app.listen(port, () => {
      console.log('================================');
      console.log('Thu Chi Luong Admin Started');
      console.log(`PORT: ${port}`);
      console.log('DATABASE: CONNECTED');
      console.log(
        `BOT_TOKEN: ${
          process.env.BOT_TOKEN
            ? 'CONFIGURED'
            : 'NOT CONFIGURED'
        }`,
      );
      console.log('================================');
    });
  } catch (error) {
    console.error(
      'START SERVER ERROR:',
      error,
    );

    process.exit(1);
  }
}

startServer();