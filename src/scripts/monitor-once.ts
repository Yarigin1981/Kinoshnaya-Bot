/**
 * Однократный запуск мониторинга каналов КД
 *
 * Запуск: npm run monitor:once
 *
 * Можно указать конкретные каналы:
 *   npm run monitor:once -- @primepeople @justcasting
 */
import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env первым делом
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

import { ChannelMonitor } from '../monitoring/monitor';
import { getChannelStats } from '../monitoring/channels';
import { dedupStore } from '../monitoring/dedup-store';

async function main() {
  console.log('🎬 Мониторинг каналов КД для канала "Киношная"\n');

  // Показываем статистику по каналам
  const channelStats = getChannelStats();
  console.log('📊 Статистика каналов:');
  console.log(`   Всего: ${channelStats.total}`);
  console.log(`   Публичных: ${channelStats.public}`);
  console.log(`   Закрытых: ${channelStats.private}`);
  console.log(`   Высокий приоритет: ${channelStats.high}`);
  console.log(`   Нормальный приоритет: ${channelStats.normal}`);
  console.log(`   Низкий приоритет: ${channelStats.low}`);

  // Очистка старых записей дедупликации
  const removedDedup = dedupStore.cleanup();
  if (removedDedup > 0) {
    console.log(`\n🧹 Очищено ${removedDedup} старых записей дедупликации`);
  }

  // Проверяем аргументы командной строки
  const args = process.argv.slice(2);
  const specificChannels = args.filter((arg) => arg.startsWith('@'));

  const monitor = new ChannelMonitor();

  let stats;
  if (specificChannels.length > 0) {
    console.log(`\n📺 Выбраны каналы: ${specificChannels.join(', ')}`);
    stats = await monitor.runForChannels(specificChannels);
  } else {
    stats = await monitor.run();
  }

  // Выводим итоговую статистику
  console.log('✅ Мониторинг завершён');

  if (stats.postsCreated > 0) {
    console.log(`\n📝 Создано ${stats.postsCreated} новых постов.`);
    console.log('   Они будут опубликованы по расписанию (10:00 и 19:00 MSK)');
    console.log('   или вручную через npm run post:now');
  }

  if (stats.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});
