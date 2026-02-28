import fs from 'fs';
import path from 'path';

/**
 * Источник поста (для постов из мониторинга)
 */
export interface PostSource {
  type: 'monitoring' | 'generated';
  channelUsername?: string;   // @primepeople
  channelName?: string;       // Дарья Аврутова
  originalText?: string;      // Оригинальный текст (первые 500 символов)
  originalMessageId?: number;
  priority?: number;          // 1-10
  category?: string;          // casting | insight | news
}

export interface Post {
  id: string;
  content: string;
  rubric: string;
  topic: string;
  status: 'pending' | 'review' | 'approved' | 'published' | 'rejected' | 'draft';
  source?: PostSource;
  scheduledAt?: string;
  publishedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;        // telegram user id
  rejectionReason?: string;
  createdAt: string;
}

// Используем путь относительно корня проекта, а не __dirname
// Это работает и в dev (src/), и в production (dist/)
const POSTS_FILE = path.join(process.cwd(), 'src', 'data', 'posts.json');

class PostsStore {
  private posts: Post[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      console.log(`📂 Путь к posts.json: ${POSTS_FILE}`);
      console.log(`📂 Файл существует: ${fs.existsSync(POSTS_FILE)}`);

      if (fs.existsSync(POSTS_FILE)) {
        const data = fs.readFileSync(POSTS_FILE, 'utf-8');
        this.posts = JSON.parse(data);
        const pendingCount = this.posts.filter(p => p.status === 'pending').length;
        console.log(`📚 Загружено ${this.posts.length} постов (${pendingCount} в очереди)`);
      } else {
        console.log('⚠️ Файл posts.json не найден, создаём пустую очередь');
        this.posts = [];
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки постов:', error);
      this.posts = [];
    }
  }

  private save() {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(this.posts, null, 2), 'utf-8');
  }

  /**
   * Добавить пост (авторский контент → pending, мониторинг → review)
   */
  add(post: Omit<Post, 'id' | 'createdAt'> & { status?: Post['status'] }) {
    const newPost: Post = {
      ...post,
      id: `post_${Date.now()}`,
      status: post.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    this.posts.push(newPost);
    this.save();
    return newPost;
  }

  addBatch(posts: Omit<Post, 'id' | 'createdAt' | 'status'>[]) {
    const newPosts = posts.map((post, index) => ({
      ...post,
      id: `post_${Date.now()}_${index}`,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }));
    this.posts.push(...newPosts);
    this.save();
    return newPosts;
  }

  getAll(): Post[] {
    return this.posts;
  }

  getById(id: string): Post | undefined {
    return this.posts.find(p => p.id === id);
  }

  getPending(): Post[] {
    return this.posts.filter(p => p.status === 'pending');
  }

  getNextPending(): Post | undefined {
    return this.posts.find(p => p.status === 'pending');
  }

  /**
   * Посты на ревью (из мониторинга, ждут одобрения)
   */
  getReview(): Post[] {
    return this.posts.filter(p => p.status === 'review');
  }

  /**
   * Одобренные посты (готовы к публикации)
   */
  getApproved(): Post[] {
    return this.posts.filter(p => p.status === 'approved');
  }

  /**
   * Следующий пост для публикации:
   * approved (из мониторинга, одобренные) идут первыми,
   * затем pending (авторский контент)
   */
  getNextForPublish(): Post | undefined {
    return this.posts.find(p => p.status === 'approved')
      || this.posts.find(p => p.status === 'pending');
  }

  /**
   * Очередь на публикацию: approved + pending
   */
  getPublishQueue(): Post[] {
    return this.posts.filter(p => p.status === 'approved' || p.status === 'pending');
  }

  /**
   * Одобрить пост из ревью
   */
  approve(id: string, reviewerId: string): Post | undefined {
    const post = this.posts.find(p => p.id === id);
    if (post && post.status === 'review') {
      post.status = 'approved';
      post.reviewedAt = new Date().toISOString();
      post.reviewedBy = reviewerId;
      this.save();
      return post;
    }
    return undefined;
  }

  /**
   * Отклонить пост
   */
  reject(id: string, reviewerId: string, reason?: string): Post | undefined {
    const post = this.posts.find(p => p.id === id);
    if (post && post.status === 'review') {
      post.status = 'rejected';
      post.reviewedAt = new Date().toISOString();
      post.reviewedBy = reviewerId;
      post.rejectionReason = reason;
      this.save();
      return post;
    }
    return undefined;
  }

  /**
   * Обновить текст поста (при редактировании)
   */
  updateContent(id: string, content: string): Post | undefined {
    const post = this.posts.find(p => p.id === id);
    if (post) {
      post.content = content;
      this.save();
      return post;
    }
    return undefined;
  }

  markAsPublished(id: string) {
    const post = this.posts.find(p => p.id === id);
    if (post) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      this.save();
    }
  }

  delete(id: string) {
    this.posts = this.posts.filter(p => p.id !== id);
    this.save();
  }

  clear() {
    this.posts = [];
    this.save();
  }

  getStats() {
    return {
      total: this.posts.length,
      review: this.posts.filter(p => p.status === 'review').length,
      approved: this.posts.filter(p => p.status === 'approved').length,
      pending: this.posts.filter(p => p.status === 'pending').length,
      published: this.posts.filter(p => p.status === 'published').length,
      rejected: this.posts.filter(p => p.status === 'rejected').length,
      draft: this.posts.filter(p => p.status === 'draft').length,
    };
  }

  /**
   * Статистика по источникам (для /sources)
   */
  getSourceStats(): Record<string, { channel: string; name: string; count: number; approved: number; review: number }> {
    const stats: Record<string, { channel: string; name: string; count: number; approved: number; review: number }> = {};

    for (const post of this.posts) {
      if (post.source?.type === 'monitoring' && post.source.channelUsername) {
        const key = post.source.channelUsername;
        if (!stats[key]) {
          stats[key] = {
            channel: post.source.channelUsername,
            name: post.source.channelName || '',
            count: 0,
            approved: 0,
            review: 0,
          };
        }
        stats[key].count++;
        if (post.status === 'approved' || post.status === 'published') stats[key].approved++;
        if (post.status === 'review') stats[key].review++;
      }
    }

    return stats;
  }
}

export const postsStore = new PostsStore();
