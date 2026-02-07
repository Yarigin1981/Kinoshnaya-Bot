import fs from 'fs';
import path from 'path';

export interface Post {
  id: string;
  content: string;
  rubric: string;
  topic: string;
  status: 'pending' | 'published' | 'draft';
  scheduledAt?: string;
  publishedAt?: string;
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

  add(post: Omit<Post, 'id' | 'createdAt' | 'status'>) {
    const newPost: Post = {
      ...post,
      id: `post_${Date.now()}`,
      status: 'pending',
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

  getPending(): Post[] {
    return this.posts.filter(p => p.status === 'pending');
  }

  getNextPending(): Post | undefined {
    return this.posts.find(p => p.status === 'pending');
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
      pending: this.posts.filter(p => p.status === 'pending').length,
      published: this.posts.filter(p => p.status === 'published').length,
      draft: this.posts.filter(p => p.status === 'draft').length,
    };
  }
}

export const postsStore = new PostsStore();
