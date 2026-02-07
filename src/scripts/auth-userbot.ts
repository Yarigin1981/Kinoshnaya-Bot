/**
 * Интерактивная авторизация userbot для мониторинга каналов КД
 *
 * Запуск: npm run auth:userbot
 *
 * После успешной авторизации добавьте TG_SESSION в .env
 */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q: string): Promise<string> =>
  new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('🔐 Авторизация Userbot для мониторинга каналов КД\n');
  console.log('Получите api_id и api_hash на https://my.telegram.org/apps\n');

  const apiIdStr = await question('API ID: ');
  const apiId = parseInt(apiIdStr);

  if (isNaN(apiId) || apiId <= 0) {
    console.error('❌ API ID должен быть числом');
    rl.close();
    return;
  }

  const apiHash = await question('API Hash: ');

  if (!apiHash || apiHash.length < 10) {
    console.error('❌ Некорректный API Hash');
    rl.close();
    return;
  }

  const phone = await question('Телефон (+7...): ');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  console.log('\n📱 Подключение к Telegram...');

  try {
    await client.start({
      phoneNumber: async () => phone,
      phoneCode: async () => {
        const code = await question('Код из Telegram: ');
        return code;
      },
      password: async () => {
        const password = await question('Пароль 2FA (если есть, иначе Enter): ');
        return password;
      },
      onError: (err) => {
        console.error('❌ Ошибка:', err.message);
      },
    });

    console.log('\n✅ Авторизация успешна!');
    console.log('\n📋 Добавьте в .env следующие строки:\n');
    console.log(`TG_API_ID=${apiId}`);
    console.log(`TG_API_HASH=${apiHash}`);
    console.log(`TG_SESSION=${session.save()}`);
    console.log(`TG_PHONE=${phone}`);
    console.log('\nMONITORING_ENABLED=true');
    console.log('MONITORING_INTERVAL=15');
    console.log('MONITORING_MAX_POSTS=5');

    // Тестовое получение информации о пользователе
    const me = await client.getMe();
    console.log(`\n👤 Авторизован как: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no username'})`);

    await client.disconnect();
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
  }

  rl.close();
}

main();
