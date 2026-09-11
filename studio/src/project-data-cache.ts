type CacheEntry<T>={value:T;updatedAt:number};
const cache=new Map<string,CacheEntry<unknown>>();
const DEFAULT_MAX_AGE=5*60*1000;

export function readProjectCache<T>(key:string,maxAge=DEFAULT_MAX_AGE):T|undefined{
 const entry=cache.get(key) as CacheEntry<T>|undefined;
 if(!entry)return undefined;
 if(Date.now()-entry.updatedAt>maxAge){cache.delete(key);return undefined}
 return entry.value;
}
export function writeProjectCache<T>(key:string,value:T){cache.set(key,{value,updatedAt:Date.now()})}
export function invalidateProjectCache(key:string){cache.delete(key)}
export function invalidateProjectCachePrefix(prefix:string){for(const key of cache.keys())if(key.startsWith(prefix))cache.delete(key)}
