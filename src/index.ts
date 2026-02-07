/**
 * Киношная Telegram Bot
 * Автопостинг с AI-генерацией контента
 */

import { Telegraf } from 'telegraf';
import { config, validateConfig } from './config';
import { telegramService } from './services/telegram';
import { schedulerService } from './services/scheduler';
import { postsStore } from './data/posts-store';

validateConfig();

const bot = telegramService.getBotInstance();

// Проверка админа
const isAdmin = (userId: number) => {
  return config.admin.userId === String(userId);
};

// Команды бота

bot.command('start', ctx => {
  ctx.reply(`🎬 Киношная Бот

Команды:
/status — статус очереди постов
/next — следующий пост (превью)
/publish — опубликовать сейчас
/list — список постов в очереди

Бот автоматически публикует посты в 10:00 и 19:00 MSK`);
});

bot.command('status', ctx => {
  const stats = postsStore.getStats();
  ctx.reply(`📊 Статус очереди:

📝 В очереди: ${stats.pending}
✅ Опубликовано: ${stats.published}
📋 Всего: ${stats.total}

⏰ Расписание: 10:00 и 19:00 MSK`);
});

bot.command('next', ctx => {
  const post = postsStore.getNextPending();
  if (!post) {
    ctx.reply('⚠️ Очередь пуста. Запустите генерацию постов.');
    return;
  }

  ctx.reply(`📝 Следующий пост:

${post.content}

---
🏷 Рубрика: ${post.rubric}
📅 Создан: ${new Date(post.createdAt).toLocaleDateString('ru-RU')}`);
});

bot.command('publish', async ctx => {
  if (!isAdmin(ctx.from.id)) {
    ctx.reply('⛔ Только для администратора');
    return;
  }

  const post = postsStore.getNextPending();
  if (!post) {
    ctx.reply('⚠️ Очередь пуста');
    return;
  }

  try {
    await telegramService.sendToChannel(post.content);
    postsStore.markAsPublished(post.id);
    ctx.reply(`✅ Пост опубликован!

Осталось в очереди: ${postsStore.getStats().pending}`);
  } catch (error) {
    ctx.reply(`❌ Ошибка: ${error}`);
  }
});

bot.command('list', ctx => {
  const pending = postsStore.getPending();
  if (pending.length === 0) {
    ctx.reply('📭 Очередь пуста');
    return;
  }

  const list = pending
    .slice(0, 10)
    .map((p, i) => `${i + 1}. [${p.rubric}] ${p.topic?.substring(0, 40) || 'Без темы'}...`)
    .join('\n');

  ctx.reply(`📋 Посты в очереди (${pending.length}):

${list}${pending.length > 10 ? `\n\n... и ещё ${pending.length - 10}` : ''}`);
});

// Запуск
async function main() {
  console.log('🎬 Киношная Bot запускается...\n');

  // Запуск расписания
  schedulerService.start();

  // Запуск бота
  await bot.launch();

  const stats = postsStore.getStats();
  console.log(`\n✅ Бот запущен!`);
  console.log(`📊 В очереди: ${stats.pending} постов`);
  console.log(`⏰ Автопостинг: 10:00 и 19:00 MSK`);

  // Graceful shutdown
  process.once('SIGINT', () => {
    schedulerService.stop();
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    schedulerService.stop();
    bot.stop('SIGTERM');
  });
}

main().catch(console.error);
