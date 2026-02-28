/**
 * Главный класс мониторинга каналов КД
 *
 * Координирует работу:
 * - UserBot (чтение каналов)
 * - Filter (отсеивание нерелевантного)
 * - Rewriter (пересказ через Claude)
 * - PostsStore (добавление в очередь)
 */
import { getUserBot } from './userbot';
import { getActiveChannels, Channel, getChannelStats } from './channels';
import { filterMessage, FilterResult } from './filter';
import { rewriterService } from './rewriter';
import { dedupStore } from './dedup-store';
import { postsStore } from '../data/posts-store';
import { notifyReviewers, notifyMonitoringComplete } from '../services/notifier';
import { config } from '../config';

export interface MonitorStats {
  channelsChecked: number;
  messagesScanned: number;
  messagesFiltered: number;
  postsCreated: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export class ChannelMonitor {
  private stats: MonitorStats = this.createEmptyStats();

  /**
   * Запускает полный цикл мониторинга
   */
  async run(): Promise<MonitorStats> {
    console.log('\n🔍 ========== МОНИТОРИНГ КАНАЛОВ КД ==========\n');
    this.resetStats();

    const userbot = getUserBot();

    // Проверяем конфигурацию
    if (!userbot.isConfigured()) {
      this.stats.errors.push('UserBot не настроен. Запустите npm run auth:userbot');
      console.error('❌ UserBot не настроен');
      return this.finishStats();
    }

    if (!rewriterService.isConfigured()) {
      this.stats.errors.push('Claude API не настроен. Добавьте ANTHROPIC_API_KEY в .env');
      console.error('❌ Claude API не настроен');
      return this.finishStats();
    }

    try {
      await userbot.connect();

      const channels = getActiveChannels();
      const channelStats = getChannelStats();

      console.log(`📋 Каналов в базе: ${channelStats.total}`);
      console.log(`📺 Активных для проверки: ${channels.length}`);
      console.log(`📝 Лимит постов за запуск: ${config.monitoring.maxPostsPerRun}\n`);

      // Обрабатываем каналы
      for (const channel of channels) {
        // Проверяем лимит постов
        if (this.stats.postsCreated >= config.monitoring.maxPostsPerRun) {
          console.log(`\n⏸ Достигнут лимит постов (${config.monitoring.maxPostsPerRun})`);
          break;
        }

        await this.processChannel(channel);

        // Rate limiting: пауза 2 секунды между каналами
        await this.sleep(2000);
      }

      await userbot.disconnect();

      // Отправляем дайджест ревьюерам
      try {
        await notifyMonitoringComplete(
          this.stats.postsCreated,
          this.stats.channelsChecked,
          this.stats.errors,
        );
      } catch (notifyError) {
        console.warn('⚠️ Не удалось отправить дайджест:', notifyError);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.stats.errors.push(`Критическая ошибка: ${errorMsg}`);
      console.error('❌ Критическая ошибка мониторинга:', error);
    }

    return this.finishStats();
  }

  /**
   * Обрабатывает один канал
   */
  private async processChannel(channel: Channel): Promise<void> {
    const displayName = `${channel.username} (${channel.name})`;

    try {
      console.log(`\n📺 Проверяю: ${displayName}`);
      this.stats.channelsChecked++;

      const userbot = getUserBot();
      const messages = await userbot.getChannelMessages(channel.username, 15);

      if (messages.length === 0) {
        console.log(`  ⚠️ Нет доступных сообщений`);
        return;
      }

      console.log(`  📨 Найдено сообщений: ${messages.length}`);

      for (const message of messages) {
        // Проверяем, есть ли текст
        if (!message.message || message.message.length < 50) {
          continue;
        }

        this.stats.messagesScanned++;

        // Дедупликация
        if (dedupStore.has(channel.username, message.id)) {
          continue;
        }

        // Фильтрация
        const filterResult = filterMessage(message.message);

        if (!filterResult.isRelevant) {
          // Помечаем как просмотренное, но не обрабатываем
          dedupStore.markSeen(channel.username, message.id);
          continue;
        }

        this.stats.messagesFiltered++;
        console.log(`  ✅ Релевантный пост: ${filterResult.reason}`);
        console.log(`     Категория: ${filterResult.category}, Приоритет: ${filterResult.priority}`);

        // Проверяем лимит перед пересказом
        if (this.stats.postsCreated >= config.monitoring.maxPostsPerRun) {
          break;
        }

        // Пересказ через Claude
        const rewritten = await rewriterService.rewritePost(
          message.message,
          channel.username,
          filterResult.category || 'news'
        );

        if (rewritten) {
          // Добавляем в очередь постов со статусом review (ждёт одобрения)
          const post = postsStore.add({
            content: rewritten.content,
            rubric: rewritten.rubric,
            topic: `Мониторинг: ${channel.name}`,
            status: 'review',
            source: {
              type: 'monitoring',
              channelUsername: channel.username,
              channelName: channel.name,
              originalText: message.message.slice(0, 500),
              originalMessageId: message.id,
              priority: filterResult.priority,
              category: filterResult.category,
            },
          });

          // Помечаем как обработанное с привязкой к посту
          dedupStore.add(channel.username, message.id, post.id);
          this.stats.postsCreated++;

          console.log(`  📝 Создан пост (review): ${post.id}`);
          console.log(`     Превью: ${rewritten.content.slice(0, 100)}...`);

          // Уведомляем ревьюеров (Алексей + Регина)
          try {
            await notifyReviewers(post);
          } catch (notifyError) {
            console.warn(`  ⚠️ Не удалось отправить уведомление:`, notifyError);
          }
        } else {
          // Если пересказ не удался, всё равно помечаем как просмотренное
          dedupStore.markSeen(channel.username, message.id);
        }

        // Rate limiting для Claude API
        await this.sleep(1500);
      }
    } catch (error) {
      const errorMsg = `Ошибка канала ${displayName}: ${error instanceof Error ? error.message : error}`;
      this.stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }

  /**
   * Запускает мониторинг только для указанных каналов (для тестирования)
   */
  async runForChannels(channelUsernames: string[]): Promise<MonitorStats> {
    console.log('\n🔍 ========== ТЕСТОВЫЙ МОНИТОРИНГ ==========\n');
    this.resetStats();

    const userbot = getUserBot();

    if (!userbot.isConfigured()) {
      this.stats.errors.push('UserBot не настроен');
      return this.finishStats();
    }

    try {
      await userbot.connect();

      const allChannels = getActiveChannels();
      const selectedChannels = allChannels.filter((c) =>
        channelUsernames.some(
          (u) => c.username.toLowerCase() === u.toLowerCase()
        )
      );

      console.log(`📺 Выбрано каналов: ${selectedChannels.length}\n`);

      for (const channel of selectedChannels) {
        await this.processChannel(channel);
        await this.sleep(2000);
      }

      await userbot.disconnect();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.stats.errors.push(errorMsg);
    }

    return this.finishStats();
  }

  /**
   * Пауза
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Создаёт пустую статистику
   */
  private createEmptyStats(): MonitorStats {
    return {
      channelsChecked: 0,
      messagesScanned: 0,
      messagesFiltered: 0,
      postsCreated: 0,
      errors: [],
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * Сбрасывает статистику
   */
  private resetStats(): void {
    this.stats = this.createEmptyStats();
  }

  /**
   * Завершает сбор статистики и выводит итоги
   */
  private finishStats(): MonitorStats {
    this.stats.finishedAt = new Date().toISOString();
    this.stats.durationMs =
      new Date(this.stats.finishedAt).getTime() -
      new Date(this.stats.startedAt).getTime();

    this.printStats();
    return this.stats;
  }

  /**
   * Выводит статистику в консоль
   */
  private printStats(): void {
    const durationSec = this.stats.durationMs
      ? (this.stats.durationMs / 1000).toFixed(1)
      : '?';

    console.log('\n📊 ========== СТАТИСТИКА ==========');
    console.log(`  ⏱ Время выполнения: ${durationSec} сек`);
    console.log(`  📺 Каналов проверено: ${this.stats.channelsChecked}`);
    console.log(`  📨 Сообщений просмотрено: ${this.stats.messagesScanned}`);
    console.log(`  ✅ Релевантных найдено: ${this.stats.messagesFiltered}`);
    console.log(`  📝 Постов создано: ${this.stats.postsCreated}`);

    if (this.stats.errors.length > 0) {
      console.log(`  ❌ Ошибок: ${this.stats.errors.length}`);
      this.stats.errors.forEach((e) => console.log(`     - ${e}`));
    }

    // Статистика очереди
    const queueStats = postsStore.getStats();
    console.log(`\n📋 Очередь: ${queueStats.review} review, ${queueStats.approved} approved, ${queueStats.pending} pending, ${queueStats.published} published`);

    // Статистика дедупликации
    const dedupStats = dedupStore.getStats();
    console.log(`🔍 Дедупликация: ${dedupStats.total} записей, ${dedupStats.withPosts} с постами`);

    console.log('===================================\n');
  }
}

// Singleton
let monitorInstance: ChannelMonitor | null = null;

export function getChannelMonitor(): ChannelMonitor {
  if (!monitorInstance) {
    monitorInstance = new ChannelMonitor();
  }
  return monitorInstance;
}
