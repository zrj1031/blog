# ts类型体操

> 记录一些高级ts推导

## toMap

> 背景: 某日在公司ts体操群，看到有同学在问，题目看着也不是很复杂，也有同学迅速给出了答案，然后我就瞎了, 明明都看的懂，咋组合在一起就看不明白了

```js

declare function toMap(params): {}

const data = toMap([
  { key: 'name', value: 'zhao大建'}, 
  { key: 'age', value: 18}
])

// 希望实现toMap的函数声明使得data具有{name: 'zhao大建', age: 18}的类型推导

```

先附上答案

```ts
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void: never
) extends ((k: infer I) => void) 
  ? I
  : never;

declare function toMap<
  K extends string,
  V extends string | number,
  T extends { key: K, value: V}[],
  R = T[number]
>(params: T): UnionToIntersection<R extends T[number] ? {[P in R['key']]: R['value']} : never>;

const data = toMap([
  { key: 'name', value: 'zhao大建'}, 
  { key: 'age', value: 18}
])
```

泛型运用较多，一步步拆分细看

```ts
declare function toMap<
  K extends string,
  V extends string | number,
  T extends { key: K, value: V}[],
  R = T[number]
>(params: T): R extends T[number] ? {[P in R['key']]: R['value']} : never;
```

K V T泛型都是约束传入的格式，没啥好多说的，都能通过传入的params来反推出具体的类型，那这个R = T[number]是个什么东西，万能google后可知T[number]可获取T数组的元素联合类型，这样我们就得到了如下的一个联合类型

```ts
type A = {name: 'zhao大建'} | {age: 18}
```

***重头戏***，再来看```UnionToIntersection```这个类型，听名字就是把联合类型转化成交叉类型，（A | B => A & B）, 具体来看
```U extends any```恒成立，那就是
```(k: U) => void extends ((k: infer I) => void) ? I : never```, 这里涉及到一些逆变和协变的知识,
可以参照下[mpx的一篇文章](https://mpxjs.cn/articles/ts-derivation.html#type-inference-in-conditional-types)和[掘金上的一篇文章](https://juejin.cn/post/6926812947050135565),
最开始我百思不得其解，这个```infer```我知道啊，在ReturnType上见过

附上代码

```js
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : any
type fnType = MyReturnType<() => string[]>
```

那推导出来的I不就是U么，这感觉都没啥意义, ***注意，我们这里传入的U是联合类型***，如果传入的是其他类型还真没啥意义

如果这个U是```X|Y|Z```的联合类型，

其实不是这么推导

```ts
(((k: X|Y|Z) => void) extends ((k: infer I) => void) ? I : never)
```

其实他是这么推导的

```ts
| (((k: X) => void) extends ((k: infer I) => void) ? I : never)
| (((k: Y) => void) extends ((k: infer I) => void) ? I : never)
| (((k: Z) => void) extends ((k: infer I) => void) ? I : never)
```

那这个I既是X又是Y又是Z, 那就是```X&Y&Z```的类型，同理```UnionToIntersection<string | number>```我们会直接得到一个never类型，因为string & number不存在，但```{name: 'zhao大建'} & {age: 18}```是存在的，即```{name: 'zhao大建', age: 18}```
