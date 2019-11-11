### Exponential backoff retry rof RxJs

Start retry loop after parent observable throws error.  
Delay will be [increase](https://en.wikipedia.org/wiki/Exponential_backoff) and randomize with jitter before every iteration.  
If parent observable passed success, then accumulated delay will be reset, and have not influence on next produced item.

### Installation

```
yarn add rxjs-exponential-backoff-retry
```

### Basic usage

```
  defer(fetch('https://google.com'))
  .pipe(
    exponentialBackoffRetry()
  );
```
