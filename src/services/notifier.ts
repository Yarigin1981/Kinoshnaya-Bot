/**
 * Сервис уведомлений для ревьюеров (Алексей + Регина)
 *
 * Отправляет inline-сообщения с кнопками Одобрить/Редактировать/Отклонить
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

━━ ОРИГИНАЛ (сокращённо) ━━
${truncate(source.originalText || '', 300)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
 * Отправить дайджест — сводку по результатам мониторинга
 */
export async function notifyMonitoringComplete(
  postsCreated: number,
  channelsChecked: number,
  errors: string[],
): Promise<void> {
  if (postsCreated === 0 && errors.length === 0) return; // тихо, если ничего нового

  const bot = telegramService.getBotInstance();

  let message = `🔍 Мониторинг завершён\n`;
  message += `📺 Каналов: ${channelsChecked}\n`;
  message += `📝 Новых постов на ревью: ${postsCreated}\n`;

  if (errors.length > 0) {
    message += `\n❌ Ошибок: ${errors.length}`;
    message += `\n${errors.slice(0, 3).map(e => `  • ${truncate(e, 80)}`).join('\n')}`;
  }

  if (postsCreated > 0) {
    message += `\n\n👉 /review — посмотреть и одобрить`;
  }

  for (const reviewerId of config.admin.reviewerIds) {
    try {
      await bot.telegram.sendMessage(reviewerId, message);
    } catch (error) {
      console.error(`❌ Не удалось отправить дайджест ${reviewerId}:`, error);
    }
  }
}
