const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const adminRoutes = require('./src/web/adminRoutes');
const { initDatabase } = require('./src/database/init');
const { healthCheck } = require('./src/config/database');
const registerBot = require('./src/bot');

const app = express();
const port = Number(process.env.PORT) || 8080;

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
  try {
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
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      message: error.message,
    });
  }
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

let server;
let bot;
let shuttingDown = false;

async function startSystem() {
  if (!process.env.BOT_TOKEN) {
    throw new Error(
      'Thiếu biến môi trường BOT_TOKEN',
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Thiếu biến môi trường DATABASE_URL',
    );
  }

  await initDatabase();

  bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
      polling: false,
    },
  );

  const botInfo = await bot.getMe();

  registerBot(bot);

  bot.on('polling_error', (error) => {
    console.error(
      'TELEGRAM POLLING ERROR:',
      error.message,
    );
  });

  await bot.deleteWebHook().catch((error) => {
    console.log(
      'DELETE WEBHOOK:',
      error.message,
    );
  });

  await bot.startPolling({
    interval: 300,
    params: {
      timeout: 30,
    },
  });

  server = app.listen(port, () => {
    console.log('================================');
    console.log('Thu Chi Luong System Started');
    console.log(`PORT: ${port}`);
    console.log('DATABASE: CONNECTED');
    console.log(`BOT: @${botInfo.username}`);
    console.log('================================');
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `${signal}: stopping safely...`,
  );

  try {
    if (bot) {
      await bot.stopPolling();
    }
  } catch (error) {
    console.error(
      'STOP POLLING ERROR:',
      error.message,
    );
  }

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  process.exit(0);
}

process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.once('SIGINT', () => {
  shutdown('SIGINT');
});

startSystem().catch((error) => {
  console.error(
    'START SYSTEM ERROR:',
    error,
  );

  process.exit(1);
});