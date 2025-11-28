import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../src/lru-cache';

describe('LRU Cache', () => {
    let cache: LRUCache<string, string>;

    beforeEach(() => {
        cache = new LRUCache<string, string>(3);
    });

    describe('Cache Operations', () => {
        it('should cache results by key', () => {
            cache.set('query1', 'result1');
            expect(cache.get('query1')).toBe('result1');
        });

        it('should return cached results on repeated queries', () => {
            cache.set('search:foo', 'found foo');
            expect(cache.get('search:foo')).toBe('found foo');
            expect(cache.get('search:foo')).toBe('found foo');
        });

        it('should evict oldest entries when cache is full (LRU)', () => {
            cache.set('a', '1');
            cache.set('b', '2');
            cache.set('c', '3');
            // Cache is now full
            cache.set('d', '4'); // This should evict 'a'

            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('b')).toBe('2');
            expect(cache.get('c')).toBe('3');
            expect(cache.get('d')).toBe('4');
        });

        it('should update LRU order on access', () => {
            cache.set('a', '1');
            cache.set('b', '2');
            cache.set('c', '3');

            // Access 'a' to make it recently used
            cache.get('a');

            // Add new item, should evict 'b' (least recently used)
            cache.set('d', '4');

            expect(cache.get('a')).toBe('1'); // Still there
            expect(cache.get('b')).toBeUndefined(); // Evicted
        });

        it('should invalidate specific cache entry', () => {
            cache.set('key1', 'value1');
            cache.invalidate('key1');
            expect(cache.get('key1')).toBeUndefined();
        });

        it('should clear all cache entries', () => {
            cache.set('a', '1');
            cache.set('b', '2');
            cache.clear();
            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('b')).toBeUndefined();
            expect(cache.size()).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should handle 100+ entries', () => {
            const largeCache = new LRUCache<string, string>(100);
            for (let i = 0; i < 100; i++) {
                largeCache.set(`key${i}`, `value${i}`);
            }
            expect(largeCache.size()).toBe(100);
            expect(largeCache.get('key50')).toBe('value50');
        });

        it('should respect max cache size configuration', () => {
            const smallCache = new LRUCache<string, number>(5);
            for (let i = 0; i < 10; i++) {
                smallCache.set(`k${i}`, i);
            }
            expect(smallCache.size()).toBe(5);
        });
    });

    describe('Cache Stats', () => {
        it('should track hit/miss stats', () => {
            cache.set('hit', 'value');
            cache.get('hit'); // hit
            cache.get('miss'); // miss

            const stats = cache.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
        });

        it('should calculate hit rate', () => {
            cache.set('key', 'value');
            cache.get('key'); // hit
            cache.get('key'); // hit
            cache.get('missing'); // miss

            const stats = cache.getStats();
            expect(stats.hitRate).toBeCloseTo(0.67, 1);
        });
    });
});
