/**
 * Публикация следующего поста немедленно
 * Запуск: npm run post:now
 */

import { telegramService } from '../services/telegram';
import { postsStore } from '../data/posts-store';
import { validateConfig } from '../config';

async function main() {
  console.log('📤 Публикация поста\n');

  validateConfig();

  const stats = postsStore.getStats();
  console.log(`📊 В очереди: ${stats.pending} постов\n`);

  const post = postsStore.getNextPending();

  if (!post) {
    console.log('⚠️ Нет постов в очереди');
    console.log('Запустите npm run generate для генерации постов');
    process.exit(0);
  }

  console.log(`📝 Пост: ${post.topic}`);
  console.log(`📏 Длина: ${post.content.length} символов`);
  console.log('\n--- Превью ---');
  console.log(post.content.substring(0, 200) + '...');
  console.log('--- Конец превью ---\n');

  try {
    await telegramService.sendToChannel(post.content);
    postsStore.markAsPublished(post.id);

    const newStats = postsStore.getStats();
    console.log(`\n✅ Опубликовано!`);
    console.log(`📊 Осталось в очереди: ${newStats.pending} постов`);
  } catch (error) {
    console.error('❌ Ошибка публикации:', error);
    process.exit(1);
  }
}

main().catch(console.error);
