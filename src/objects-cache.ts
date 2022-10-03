interface CacheItem {
	updateTime: number;
	data: unknown;
	isError: boolean;
}
interface Cache {
	[key: string]: CacheItem;
}

export class ObjectsCache {
	private _cache: Cache;

	constructor() {
		this._cache = {};
	}

	add<T>(key: string, object: T, isError = false): CacheItem {
		this._cache[key] = {
			updateTime: Date.now(),
			data: object,
			isError: isError,
		};
		return this._cache[key];
	}

	get(key: string) {
		if (
			key in this._cache &&
			this._cache[key].updateTime + 900000 > Date.now()
		) {
			return this._cache[key];
		}
		return null;
	}

	getTime(key: string) {
		if (key in this._cache) {
			return new Date(this._cache[key].updateTime).getTime();
		}
		return null;
	}

	clear() {
		this._cache = {};
	}
}
