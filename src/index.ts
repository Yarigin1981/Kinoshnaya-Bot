/**
 * Киношная Telegram Bot
 * Автопостинг с AI-генерацией контента + ревью мониторинга
 */

import { Telegraf, Markup } from 'telegraf';
import { config, validateConfig } from './config';
import { telegramService } from './services/telegram';
import { schedulerService } from './services/scheduler';
import { postsStore, Post } from './data/posts-store';

validateConfig();

const bot = telegramService.getBotInstance();

// ============================================
// HELPERS
// ============================================

const isReviewer = (userId: number) => {
  return config.admin.reviewerIds.includes(String(userId));
};

const isAdmin = (userId: number) => {
  return config.admin.userId === String(userId);
};

/** Звёздочки приоритета */
const priorityStars = (priority?: number): string => {
  if (!priority) return '';
  const stars = Math.min(priority, 5);
  return '⭐'.repeat(stars);
};

/** Сокращение текста */
const truncate = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
};

/** Форматирование даты */
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Moscow' });
};

// ============================================
// КОМАНДЫ БОТА
// ============================================

bot.command('myid', ctx => {
  ctx.reply(`🆔 Твой Telegram User ID: ${ctx.from.id}\n\nДобавь в .env:\nADMIN_USER_ID=${ctx.from.id}`);
});

bot.command('start', ctx => {
  ctx.reply(`🎬 Киношная Бот

Команды:
/status — статус очереди постов
/review — посты на ревью (из мониторинга)
/queue — очередь на публикацию
/sources — статистика по каналам КД
/mix — план публикаций на сегодня

/next — превью следующего поста
/publish — опубликовать сейчас
/list — список постов в очереди

⏰ Автопостинг: 10:00 и 19:00 MSK`);
});

// ============================================
// /status — общая статистика
// ============================================
bot.command('status', ctx => {
  const stats = postsStore.getStats();
  ctx.reply(`📊 Статус очереди:

📥 На ревью: ${stats.review}
✅ Одобрено: ${stats.approved}
📝 Авторских: ${stats.pending}
📤 Опубликовано: ${stats.published}
❌ Отклонено: ${stats.rejected}

📋 Всего: ${stats.total}
⏰ Расписание: 10:00 и 19:00 MSK`);
});

// ============================================
// /review — посты, ждущие одобрения
// ============================================
bot.command('review', ctx => {
  if (!isReviewer(ctx.from.id)) {
    ctx.reply('⛔ Только для ревьюеров');
    return;
  }

  const reviews = postsStore.getReview();

  if (reviews.length === 0) {
    ctx.reply('✅ Нет постов на ревью. Всё обработано!');
    return;
  }

  const header = `📋 ПОСТЫ НА РЕВЬЮ (${reviews.length} шт.)\n`;

  const list = reviews
    .slice(0, 15)
    .map((p, i) => {
      const src = p.source;
      const name = src?.channelName || '—';
      const stars = priorityStars(src?.priority);
      const date = fmtDate(p.createdAt);
      const title = truncate(p.content.split('\n')[0], 35);
      return `${i + 1}. ${title}\n   📺 ${name} | ${stars} | ${date}`;
    })
    .join('\n\n');

  const footer = reviews.length > 15 ? `\n\n... и ещё ${reviews.length - 15}` : '';

  ctx.reply(header + list + footer);

  // Отправляем каждый пост с кнопками
  for (const post of reviews.slice(0, 5)) {
    const preview = `📝 ${truncate(post.content, 400)}\n\nID: ${post.id}`;
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Одобрить', `approve:${post.id}`),
      Markup.button.callback('✏️ Редакт.', `edit:${post.id}`),
      Markup.button.callback('❌ Отклонить', `reject:${post.id}`),
    ]);
    ctx.reply(preview, keyboard);
  }
});

// ============================================
// /queue — очередь на публикацию
// ============================================
bot.command('queue', ctx => {
  if (!isReviewer(ctx.from.id)) {
    ctx.reply('⛔ Только для ревьюеров');
    return;
  }

  const queue = postsStore.getPublishQueue();

  if (queue.length === 0) {
    ctx.reply('📭 Очередь пуста. Нет одобренных постов для публикации.');
    return;
  }

  const list = queue
    .slice(0, 10)
    .map((p, i) => {
      const type = p.source?.type === 'monitoring' ? '📺 мониторинг' : '✍️ авторский';
      const name = p.source?.channelName ? `: ${p.source.channelName}` : '';
      const status = p.status === 'approved' ? '✅' : '📝';
      const title = truncate(p.content.split('\n')[0], 40);
      return `${i + 1}. ${status} ${title}\n   ${type}${name}`;
    })
    .join('\n\n');

  ctx.reply(`📤 ОЧЕРЕДЬ НА ПУБЛИКАЦИЮ (${queue.length} шт.)\n\n${list}`);
});

// ============================================
// /sources — статистика по каналам КД
// ============================================
bot.command('sources', ctx => {
  if (!isReviewer(ctx.from.id)) {
    ctx.reply('⛔ Только для ревьюеров');
    return;
  }

  const sourceStats = postsStore.getSourceStats();
  const entries = Object.values(sourceStats).sort((a, b) => b.count - a.count);

  if (entries.length === 0) {
    ctx.reply('📊 Пока нет данных из мониторинга.');
    return;
  }

  const totalStats = postsStore.getStats();
  const totalMonitoring = entries.reduce((sum, e) => sum + e.count, 0);
  const totalApproved = entries.reduce((sum, e) => sum + e.approved, 0);
  const totalReview = entries.reduce((sum, e) => sum + e.review, 0);

  const list = entries
    .slice(0, 20)
    .map(e => `📺 ${e.channel} (${e.name}) — ${e.count} пост.`)
    .join('\n');

  ctx.reply(`📊 СТАТИСТИКА ИСТОЧНИКОВ

${list}

Всего из мониторинга: ${totalMonitoring}
Одобрено: ${totalApproved} | Ждёт ревью: ${totalReview}
Авторских постов: ${totalStats.pending}`);
});

// ============================================
// /mix — план публикаций на день
// ============================================
bot.command('mix', ctx => {
  if (!isReviewer(ctx.from.id)) {
    ctx.reply('⛔ Только для ревьюеров');
    return;
  }

  const queue = postsStore.getPublishQueue();
  const review = postsStore.getReview();

  const today = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });

  let plan = `📅 ПЛАН ПУБЛИКАЦИЙ НА ${today}\n`;

  const times = ['10:00', '19:00'];
  const allPosts = [...queue]; // approved first, then pending

  for (let day = 0; day < 3; day++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + day);
    const dayStr = day === 0 ? 'Сегодня' : day === 1 ? 'Завтра' : dayDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Moscow' });

    plan += `\n${dayStr}:\n`;

    for (const time of times) {
      const postIndex = day * 2 + times.indexOf(time);
      const post = allPosts[postIndex];

      if (post) {
        const type = post.source?.type === 'monitoring'
          ? `📺 мониторинг: ${post.source?.channelName || '—'}`
          : '✍️ авторский контент';
        const statusIcon = post.status === 'approved' ? '✅' : '📝';
        const title = truncate(post.content.split('\n')[0], 40);
        plan += `  ${time} — ${title}\n        ${type} | ${statusIcon}\n`;
      } else if (review.length > postIndex - allPosts.length) {
        plan += `  ${time} — ⏳ ждёт ревью\n`;
      } else {
        plan += `  ${time} — 📭 нет поста\n`;
      }
    }
  }

  ctx.reply(plan);
});

// ============================================
// /next, /publish, /list — оригинальные команды
// ============================================

bot.command('next', ctx => {
  const post = postsStore.getNextForPublish();
  if (!post) {
    ctx.reply('⚠️ Очередь пуста. Одобрите посты из ревью или сгенерируйте новые.');
    return;
  }

  const type = post.source?.type === 'monitoring'
    ? `📺 Мониторинг: ${post.source?.channelName}`
    : '✍️ Авторский контент';

  ctx.reply(`📝 Следующий пост:

${post.content}

---
🏷 Рубрика: ${post.rubric}
${type}
📅 Создан: ${fmtDate(post.createdAt)}`);
});

bot.command('publish', async ctx => {
  if (!isReviewer(ctx.from.id)) {
    ctx.reply('⛔ Только для ревьюеров');
    return;
  }

  const post = postsStore.getNextForPublish();
  if (!post) {
    ctx.reply('⚠️ Очередь пуста');
    return;
  }

  try {
    await telegramService.sendToChannel(post.content);
    postsStore.markAsPublished(post.id);
    const stats = postsStore.getStats();
    ctx.reply(`✅ Пост опубликован!

В очереди: ${stats.approved + stats.pending} | На ревью: ${stats.review}`);
  } catch (error) {
    ctx.reply(`❌ Ошибка: ${error}`);
  }
});

bot.command('list', ctx => {
  const queue = postsStore.getPublishQueue();
  if (queue.length === 0) {
    ctx.reply('📭 Очередь пуста');
    return;
  }

  const list = queue
    .slice(0, 10)
    .map((p, i) => {
      const type = p.source?.type === 'monitoring' ? '📺' : '✍️';
      return `${i + 1}. ${type} [${p.rubric}] ${truncate(p.topic || 'Без темы', 40)}`;
    })
    .join('\n');

  const review = postsStore.getReview();

  ctx.reply(`📋 Очередь публикации (${queue.length}):

${list}${queue.length > 10 ? `\n\n... и ещё ${queue.length - 10}` : ''}

📥 На ревью: ${review.length}`);
});

// ============================================
// INLINE CALLBACKS — Одобрить / Редактировать / Отклонить
// ============================================

bot.action(/^approve:(.+)$/, async ctx => {
  const postId = ctx.match[1];
  const userId = ctx.from.id;

  if (!isReviewer(userId)) {
    await ctx.answerCbQuery('⛔ Нет прав');
    return;
  }

  const post = postsStore.approve(postId, String(userId));

  if (post) {
    await ctx.answerCbQuery('✅ Одобрено!');
    await ctx.editMessageText(
      `✅ ОДОБРЕНО\n\n${post.content}\n\n📤 Будет опубликован по расписанию`,
    );
  } else {
    await ctx.answerCbQuery('⚠️ Пост не найден или уже обработан');
  }
});

bot.action(/^reject:(.+)$/, async ctx => {
  const postId = ctx.match[1];
  const userId = ctx.from.id;

  if (!isReviewer(userId)) {
    await ctx.answerCbQuery('⛔ Нет прав');
    return;
  }

  const post = postsStore.reject(postId, String(userId));

  if (post) {
    await ctx.answerCbQuery('❌ Отклонено');
    await ctx.editMessageText(
      `❌ ОТКЛОНЕНО\n\n${truncate(post.content, 200)}`,
    );
  } else {
    await ctx.answerCbQuery('⚠️ Пост не найден или уже обработан');
  }
});

// Состояние редактирования: userId → postId
const editingState = new Map<number, string>();

bot.action(/^edit:(.+)$/, async ctx => {
  const postId = ctx.match[1];
  const userId = ctx.from.id;

  if (!isReviewer(userId)) {
    await ctx.answerCbQuery('⛔ Нет прав');
    return;
  }

  const post = postsStore.getById(postId);
  if (!post) {
    await ctx.answerCbQuery('⚠️ Пост не найден');
    return;
  }

  editingState.set(userId, postId);
  await ctx.answerCbQuery('✏️ Режим редактирования');
  await ctx.reply(
    `✏️ Редактирование поста ${postId}\n\nОтправьте новый текст поста. Или /cancel для отмены.`
  );
});

bot.command('cancel', ctx => {
  if (editingState.has(ctx.from.id)) {
    editingState.delete(ctx.from.id);
    ctx.reply('❌ Редактирование отменено');
  }
});

// Обработка текстовых сообщений (для редактирования)
bot.on('text', async ctx => {
  const userId = ctx.from.id;

  if (!editingState.has(userId)) return;

  const postId = editingState.get(userId)!;
  const newContent = ctx.message.text;

  const post = postsStore.updateContent(postId, newContent);
  editingState.delete(userId);

  if (post) {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Одобрить', `approve:${post.id}`),
      Markup.button.callback('✏️ Ещё раз', `edit:${post.id}`),
      Markup.button.callback('❌ Отклонить', `reject:${post.id}`),
    ]);

    await ctx.reply(
      `📝 Текст обновлён!\n\n${post.content}\n\nID: ${post.id}`,
      keyboard,
    );
  } else {
    await ctx.reply('⚠️ Пост не найден');
  }
});

// ============================================
// ЗАПУСК
// ============================================
async function main() {
  console.log('🎬 Киношная Bot запускается...\n');

  // Запуск расписания
  schedulerService.start();

  // Запуск бота
  await bot.launch();

  const stats = postsStore.getStats();
  console.log(`\n✅ Бот запущен!`);
  console.log(`📊 Очередь: ${stats.approved} approved, ${stats.pending} pending`);
  console.log(`📥 На ревью: ${stats.review}`);
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
