/**
 * Сервис уведомлений для ревьюеров (Алексей + Регина)
 *
 * Отправляет inline-сообщения с кнопками Одобрить/Редактировать/Отклонить
 * Дайджест мониторинга — раз в день утром (накопленные за сутки)
 */
import { Markup } from 'telegraf';
import { telegramService } from './telegram';
import { Post } from '../data/posts-store';
import { config } from '../config';

/** Звёздочки приоритета */
function priorityStars(priority?: number): string {
  if (!priority) return '';
  return '⭐'.repeat(Math.min(priority, 5));
}

/** Сокращение текста */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

/** Форматирование даты */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Moscow' });
}

// ============================================
// НАКОПИТЕЛЬ СТАТИСТИКИ ЗА ДЕНЬ
// ============================================
interface DailyStats {
  postsCreated: number;
  channelsChecked: number;
  runsCompleted: number;
  errors: string[];
  lastRunAt: string;
}

let dailyStats: DailyStats = {
  postsCreated: 0,
  channelsChecked: 0,
  runsCompleted: 0,
  errors: [],
  lastRunAt: '',
};

/** Сбросить дневную статистику */
export function resetDailyStats(): void {
  dailyStats = {
    postsCreated: 0,
    channelsChecked: 0,
    runsCompleted: 0,
    errors: [],
    lastRunAt: '',
  };
}

/** Получить текущую дневную статистику */
export function getDailyStats(): DailyStats {
  return { ...dailyStats };
}

/**
 * Отправить уведомление о новом посте из мониторинга всем ревьюерам
 */
export async function notifyReviewers(post: Post): Promise<void> {
  const source = post.source;
  if (!source) return;

  const bot = telegramService.getBotInstance();

  const message = `📥 НОВЫЙ КАСТИНГ ИЗ МОНИТОРИНГА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 Источник: ${source.channelName} (${source.channelUsername})
🏷 Категория: ${source.category || '—'} | ${priorityStars(source.priority)}
📅 Найдено: ${fmtDate(post.createdAt)}

━━ ГОТОВЫЙ ПОСТ ДЛЯ КИНОШНОЙ ━━
${post.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: ${post.id}`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('✅ Одобрить', `approve:${post.id}`),
    Markup.button.callback('✏️ Редакт.', `edit:${post.id}`),
    Markup.button.callback('❌ Отклонить', `reject:${post.id}`),
  ]);

  for (const reviewerId of config.admin.reviewerIds) {
    try {
      await bot.telegram.sendMessage(reviewerId, message, keyboard);
    } catch (error) {
      console.error(`❌ Не удалось отправить ревью ${reviewerId}:`, error);
    }
  }
}

/**
 * Накопить статистику после цикла мониторинга (НЕ отправляет сообщение)
 */
export function accumulateMonitoringStats(
  postsCreated: number,
  channelsChecked: number,
  errors: string[],
): void {
  dailyStats.postsCreated += postsCreated;
  dailyStats.channelsChecked = Math.max(dailyStats.channelsChecked, channelsChecked);
  dailyStats.runsCompleted++;
  dailyStats.lastRunAt = new Date().toISOString();

  // Дедупликация ошибок (одна и та же ошибка канала не дублируется)
  for (const err of errors) {
    if (!dailyStats.errors.includes(err)) {
      dailyStats.errors.push(err);
    }
  }

  console.log(`📊 Статистика накоплена: +${postsCreated} постов, всего за день: ${dailyStats.postsCreated}`);
}

/**
 * Отправить утренний дайджест — сводку за прошедший день
 * Вызывается из scheduler раз в день утром
 */
export async function sendDailyDigest(): Promise<void> {
  const stats = dailyStats;

  // Если за день не было ни одного цикла — не отправляем
  if (stats.runsCompleted === 0) return;

  const bot = telegramService.getBotInstance();
  const today = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });

  let message = `📋 ДАЙДЖЕСТ МОНИТОРИНГА — ${today}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔄 Циклов мониторинга: ${stats.runsCompleted}\n`;
  message += `📺 Каналов проверено: ${stats.channelsChecked}\n`;
  message += `📝 Новых постов на ревью: ${stats.postsCreated}\n`;

  if (stats.errors.length > 0) {
    message += `\n❌ Ошибки (${stats.errors.length}):\n`;
    message += stats.errors.slice(0, 10).map(e => `  • ${truncate(e, 100)}`).join('\n');
  }

  if (stats.postsCreated > 0) {
    message += `\n\n👉 /review — посмотреть и одобрить`;
  }

  for (const reviewerId of config.admin.reviewerIds) {
    try {
      await bot.telegram.sendMessage(reviewerId, message);
    } catch (error) {
      console.error(`❌ Не удалось отправить дайджест ${reviewerId}:`, error);
    }
  }

  // Сбрасываем статистику после отправки
  resetDailyStats();
  console.log('📋 Утренний дайджест отправлен, статистика сброшена');
}
