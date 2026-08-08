(() => {
  const pad = (value) => String(value).padStart(2, '0');
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const currentMonth = today.slice(0, 7);

  document.querySelectorAll('[data-nav]').forEach((link) => {
    const path = link.getAttribute('data-nav');
    const currentPath = window.location.pathname;
    const active = currentPath === path || currentPath.startsWith(`${path}/`);
    link.classList.toggle('active', active);
  });

  document.querySelectorAll('[data-default-today]').forEach((input) => {
    input.value = today;
  });

  document.querySelectorAll('[data-default-time]').forEach((input) => {
    input.value = currentTime;
  });

  document.querySelectorAll('[data-default-month]').forEach((input) => {
    input.value = currentMonth;
  });

  document.querySelectorAll('[data-timezone-offset]').forEach((input) => {
    input.value = String(now.getTimezoneOffset());
  });

  document.querySelectorAll('[data-local-time-source]').forEach((input) => {
    const source = input.getAttribute('data-local-time-source');
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) {
      input.value = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  });

  const formatMoney = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(digits));
  };

  document.querySelectorAll('[data-money-input]').forEach((input) => {
    input.value = formatMoney(input.value);
    input.addEventListener('input', () => {
      input.value = formatMoney(input.value);
    });
  });

  document.querySelectorAll('[data-money-form]').forEach((form) => {
    form.addEventListener('submit', () => {
      form.querySelectorAll('[data-money-input]').forEach((input) => {
        input.value = input.value.replace(/\D/g, '');
      });
    });
  });

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      const message = form.getAttribute('data-confirm');
      if (message && !window.confirm(message)) {
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll('[data-confirm-button]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const message = button.getAttribute('data-confirm-button');
      if (message && !window.confirm(message)) {
        event.preventDefault();
      }
    });
  });


  const groupSearch = document.querySelector('[data-group-search]');
  if (groupSearch) {
    groupSearch.addEventListener('input', () => {
      const keyword = groupSearch.value.trim().toLowerCase();
      document.querySelectorAll('[data-group-item]').forEach((item) => {
        const text = item.getAttribute('data-search-text') || '';
        item.hidden = Boolean(keyword) && !text.includes(keyword);
      });
    });
  }

  const telegramBox = document.querySelector('[data-telegram-box].waiting');
  if (telegramBox) {
    const statusUrl = telegramBox.getAttribute('data-status-url');
    const message = telegramBox.querySelector('[data-telegram-message]');
    let checks = 0;

    const timer = window.setInterval(async () => {
      checks += 1;
      try {
        const response = await fetch(statusUrl, { headers: { Accept: 'application/json' } });
        const state = await response.json();
        if (state.status === 'connected') {
          window.clearInterval(timer);
          message.textContent = `Đã nhận ID ${state.chatId}. Đang cập nhật…`;
          telegramBox.classList.remove('waiting');
          telegramBox.classList.add('connected');
          window.setTimeout(() => {
            window.location.href = window.location.pathname;
          }, 900);
        }
      } catch (_error) {
        message.textContent = 'Chưa nhận được ID. Hệ thống vẫn đang chờ…';
      }

      if (checks >= 100) {
        window.clearInterval(timer);
        message.textContent = 'Chưa nhận được ID. Bấm lại nút để thử lại.';
      }
    }, 3000);
  }

  document.querySelectorAll('.notice').forEach((notice) => {
    window.setTimeout(() => notice.classList.add('hide'), 4500);
  });
})();
