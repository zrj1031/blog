# Context状态管理按需更新

## 背景

当组件上层最近的 ```<Context.Provider>```的```value```更新时，使用```useContext```消费该`context`的`consumer`组件会触发```rerender```, 即使祖先使用 `memo` 或 `shouldComponentUpdate`包裹, 也会在组件本身使用 useContext 时重新渲染。

那类似于```redux```这种使用```context```的状态管理库，不就会存在A组件依赖```context.a```, 却出现```context.b```更新, 导致A组件```rerender```么，那实际```redux```肯定也不会那么蠢, 是按需更新的，那它又是怎么坐到的

去年跳槽的时候有被问到，但没细想，直到前几天看到了下面[这篇文章](https://mp.weixin.qq.com/s/TmFLzD_nye0_dDTiZB1P3A)，对应[github](https://github.com/MinJieLiu/heo)

## 原理剖析

最主要的做法是是要保持```context```中的```value```不变（使用```useRef```包裹），使其不可变，但同时就失去了自动更新机制，我们可以利用```consumer```子组件的```forceUpdate```(```const [, forceUpdate] = React.useReducer((c) => c + 1, 0)```)来触发更新。

具体做法：在子组件```mount```时添加一个```listener```到```Context```中，```unMount```时将其移除, ```Context```有更新时， 调用这个```listener```，判断是否需要更新，如果需要，调用 ```forceUpdate```来触发```rerender```。

## 代码实现

provider组件每次value变更时(```useHook```)，触发```Provider```组件的  ```rerender```, ```listeners```遍历执行, 子组件因为```memo```并且```Context```的```value```没有变更，不会```rerender```

简化版的代码如下

> useHook demo, 返回一些需要配置在Context value里的值，比如count1、setCount1、count2、setCount2

```js
import { useState } from 'react'

const useHook = () => {
  const [count1, setCount1] = useState(0)
  const [count2, setCount2] = useState(0)
  return {
    count1,
    setCount1,
    count2,
    setCount2
  }
}
```

> Context中保持value不变，在子孙组件调用setCount1时，Provider组件会重新渲染，但是keepValue是不变的，我们使用keepValue.listeners遍历去执行子孙组件绑定的listener

```js
import { createContext, memo, useRef } from 'react'

export function createStore(useHook) {
  const Context = createContext(null);

  const Provider = memo(({ children }) => {
    const value = useHook();
    const keepValue = useRef({ value, listeners: new Set() }).current;
    keepValue.value = value;

    useEffect(() => {
      keepValue.listeners.forEach((listener) => {
        listener(value);
      });
    })

    return (
      <Context.Provider value={keepValue}>
        {children}
      </Context.Provider>
    );
  });
}
```



在consumer组件注册useSelector， 根据selector映射context所需字段（```selected```), 注册listener（callback中将当前```selected```与```nextSelected```做比较，若不一致执行```forceUpdate```来更新组件）,以此来实现按需更新

```ts
type SelectorFn<Value, Selected> = (value: Value) => Selected;

function useSelector<Selected>(selector: SelectorFn<Value, Selected>): Selected {
    const [, forceUpdate] = React.useReducer((c) => c + 1, 0);
    const { value, listeners } = React.useContext(Context);
    const selected = selector(value);

    const storeValue = {
      selector,
      value,
      selected,
    };
    const ref = useRef(storeValue);

    useEffect(() => {
      function callback(nextValue: Value) {
        try {
          if (!ref.current) {
            return;
          }
          const refValue = ref.current;
          // 将context的value前后值进行对比，一样则不触发 render
          if (refValue.value === nextValue) {
            return;
          }
           // 将组件重具体用到context value中的部分字段进行浅比较，一样则不触发 render
          if (isShadowEqual(refValue.selected, refValue.selector(nextValue))) {
            return;
          }
        } catch (e) {
          // ignore
        }
        forceUpdate();
      }
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    }, []);
    return selected;
  }
```

实际使用

```js
const CounterContainer = createStore(() => {
  const [count1, setCount1] = React.useState(0);
  const [count2, setCount2] = React.useState(0);
  return {
    count1,
    setCount1,
    count2,
    setCount2,
  };
});

const Counter1 = memo(() => {
  const { count, setCount } = useSelector(data => ({count: data.count1, setCount: data.setCount1}))
  const increment = () => setCount((s) => s + 1);
  const renderCount = React.useRef(0);
  renderCount.current += 1;

  return (
    <div>
      <span>{count}</span>
      <button type="button" onClick={increment}>
        ADD1
      </button>
      <span>{renderCount.current}</span>
    </div>
  );
})

const Counter2 = memo(() => {
  const { count, setCount } = useSelector(data => ({count: data.count2, setCount: data.setCount2}))
  const increment = () => setCount2((s) => s + 1);
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  return (
    <div>
      <span>{count2}</span>
      <button type="button" onClick={increment}>
        ADD2
      </button>
      <span>{renderCount.current}</span>
    </div>
  );
}); 

const App = () => (
  <CounterContainer.Provider>
    <Counter1 />
    <Counter2 />
  </CounterContainer.Provider>
);
```