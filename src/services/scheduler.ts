import cron from 'node-cron';
import { telegramService } from './telegram';
import { postsStore } from '../data/posts-store';
import { getChannelMonitor } from '../monitoring/monitor';
import { config } from '../config';

export class SchedulerService {
  private jobs: cron.ScheduledTask[] = [];

  /**
   * Запуск расписания публикаций + мониторинга
   */
  start() {
    // Утренний пост в 10:00 MSK
    const morningJob = cron.schedule(
      '0 10 * * *',
      async () => {
        console.log('⏰ Время утреннего поста');
        await this.publishNextPost();
      },
      {
        timezone: 'Europe/Moscow',
      }
    );

    // Вечерний пост в 19:00 MSK
    const eveningJob = cron.schedule(
      '0 19 * * *',
      async () => {
        console.log('⏰ Время вечернего поста');
        await this.publishNextPost();
      },
      {
        timezone: 'Europe/Moscow',
      }
    );

    this.jobs.push(morningJob, eveningJob);
    console.log('📅 Расписание запущено: 10:00 и 19:00 MSK');

    // Мониторинг каналов КД
    if (config.monitoring.enabled) {
      const interval = config.monitoring.intervalMinutes;
      const monitorJob = cron.schedule(
        `*/${interval} * * * *`,
        async () => {
          console.log('🔍 Запуск мониторинга по расписанию...');
          try {
            const monitor = getChannelMonitor();
            await monitor.run();
          } catch (error) {
            console.error('❌ Ошибка мониторинга:', error);
          }
        },
        {
          timezone: 'Europe/Moscow',
        }
      );
      this.jobs.push(monitorJob);
      console.log(`📡 Мониторинг каналов: каждые ${interval} мин`);
    }
  }

  private async publishNextPost() {
    // approved (одобренные из мониторинга) идут первыми, затем pending (авторский)
    const post = postsStore.getNextForPublish();

    if (!post) {
      console.log('⚠️ Нет постов в очереди (только review — ждут одобрения)');
      return;
    }

    try {
      await telegramService.sendToChannel(post.content);
      postsStore.markAsPublished(post.id);
      const sourceInfo = post.source?.channelName ? ` (из: ${post.source.channelName})` : ' (авторский)';
      console.log(`✅ Опубликован пост: ${post.id}${sourceInfo}`);
    } catch (error) {
      console.error(`❌ Ошибка публикации поста ${post.id}:`, error);
    }
  }

  /**
   * Немедленная публикация следующего поста
   */
  async publishNow() {
    await this.publishNextPost();
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('📅 Расписание остановлено');
  }
}

export const schedulerService = new SchedulerService();
