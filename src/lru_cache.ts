interface CacheNode<K, V> {
    key: K;
    value: V;
    prev: CacheNode<K, V> | null;
    next: CacheNode<K, V> | null;
}

interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
}

export class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, CacheNode<K, V>>;
    private head: CacheNode<K, V> | null = null;
    private tail: CacheNode<K, V> | null = null;
    private hits: number = 0;
    private misses: number = 0;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        const node = this.cache.get(key);
        if (!node) {
            this.misses++;
            return undefined;
        }

        this.hits++;
        this.moveToHead(node);
        return node.value;
    }

    set(key: K, value: V): void {
        const existing = this.cache.get(key);

        if (existing) {
            existing.value = value;
            this.moveToHead(existing);
            return;
        }

        const newNode: CacheNode<K, V> = {
            key,
            value,
            prev: null,
            next: null
        };

        this.cache.set(key, newNode);
        this.addToHead(newNode);

        if (this.cache.size > this.capacity) {
            this.removeTail();
        }
    }

    invalidate(key: K): boolean {
        const node = this.cache.get(key);
        if (!node) return false;

        this.removeNode(node);
        this.cache.delete(key);
        return true;
    }

    clear(): void {
        this.cache.clear();
        this.head = null;
        this.tail = null;
        this.hits = 0;
        this.misses = 0;
    }

    size(): number {
        return this.cache.size;
    }

    getStats(): CacheStats {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
            size: this.cache.size
        };
    }

    private addToHead(node: CacheNode<K, V>): void {
        node.prev = null;
        node.next = this.head;

        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }
    }

    private removeNode(node: CacheNode<K, V>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    private moveToHead(node: CacheNode<K, V>): void {
        this.removeNode(node);
        this.addToHead(node);
    }

    private removeTail(): void {
        if (!this.tail) return;

        this.cache.delete(this.tail.key);

        if (this.tail.prev) {
            this.tail.prev.next = null;
            this.tail = this.tail.prev;
        } else {
            this.head = null;
            this.tail = null;
        }
    }
}

// Global caches for tools
export const searchCache = new LRUCache<string, string>(50);
export const grepCache = new LRUCache<string, string>(50);
