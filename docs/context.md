# Context

> ```context```做状态管理时如何做按需更新

## 背景

当组件上层最近的 ```<Context.Provider>```更新时，```useContext```会触发```rerender```。即使祖先使用 React.memo 或 shouldComponentUpdate，也会在组件本身使用 useContext 时重新渲染，即```consumer```组件全量更新。那类似于```redux```这种使用```context```的状态管理库，不就会存在A组件依赖```context.a```,却出现```context.b```更新又rerender了A组件么，那实际```redux```肯定也不会那么蠢, 是按需更新的，那它又是怎么坐到的

去年跳槽的时候有被问到，但没细想，直到前几天看到了下面[这篇文章](https://mp.weixin.qq.com/s/TmFLzD_nye0_dDTiZB1P3A)，对应[github](https://github.com/MinJieLiu/heo)

## 原理剖析

最主要的做法是把```context``` ```value```使用```useRef```包裹，使其不可变，但同时就失去了自动更新机制，我们利用```consumer```子组件的```setState```来触发更新（在listener中执行）

在子组件```mount```时添加一个```listener```到```Context```中，```unMount```时将其移除, ```Context```有更新时， 调用这个```listener```，判断是否需要更新，如果需要 ```setState```来触发```rerender```。

## 代码实现

provider组件每次value变更时(```useHook```)，触发```Provider```组件的  ```rerender```, ```listeners```遍历执行, 子组件因为```memo```并且```Context```的```value```没有变更，不会```rerender```

```ts
export function createContainer<Value, State = void>(useHook: (initialState?: State) => Value) {
  // Keep the Context never triggering an update
  const Context = React.createContext<KeepValue<Value> | null>(null);

  const Provider = React.memo(({ initialState, children }: ContainerProviderProps<State, Value>) => {
    const value = useHook(initialState);
    const keepValue = React.useRef<KeepValue<Value>>({ value, listeners: new Set() }).current;
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

在consumer组件注册useSelector， 根据selector映射context所需字段（```selectContextFields```), 注册listener（callback中将当前```consumeContextFields```与```nextSelectContextFields```做比较，若不一致执行```forceUpdate```来更新组件）,以此来实现按需更新

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
    const ref = React.useRef(storeValue);

    useEffect(() => {
      function callback(nextValue: Value) {
        try {
          if (!ref.current) {
            return;
          }
          const refValue = ref.current;
          // 如果前后对比的值一样，则不触发 render
          if (refValue.value === nextValue) {
            return;
          }
          const nextSelected = refValue.selector(nextValue);
           // 将选择后的值进行浅对比，一样则不触发 render
          if (isShadowEqual(refValue.selected, nextSelected)) {
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
