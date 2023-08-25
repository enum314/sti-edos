import { redis } from './redis';

export default class Store<V extends object> {
	public constructor(private namespace: string, private ttl: number) {}

	public async get(key: string): Promise<V | undefined> {
		const value = await redis.get(this.generateKey(key));
		return value === null ? undefined : JSON.parse(value);
	}

	public set(key: string, value: V, ttl?: number) {
		return redis.set(
			this.generateKey(key),
			JSON.stringify(value),
			'EX',
			ttl || this.ttl,
		);
	}

	public async has(key: string) {
		const exists = await redis.get(this.generateKey(key));
		return Boolean(exists);
	}

	public async del(key: string) {
		const items = await redis.del(this.generateKey(key));
		return items > 0;
	}

	private generateKey(key: string) {
		return `store|${this.namespace}|${key}`;
	}
}
