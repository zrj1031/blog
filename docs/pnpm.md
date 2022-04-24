# 浅谈pnpm

> npm存在的缺陷，pnpm是怎样解决他们的

## npm 存在的问题

先来看`npm`的工作模式, 存在`vue`依赖`foo`,`bar`, `react`依赖`foo`,`bar`的关系

在`npm3`之前，会在`node_modules`目录下分别安装`vue`,`react`, 然后`vue`目录下安装`foo`、`bar`, `react`目录下安装`foo`、`bar`

* 一方面这会造成`foo`、`bar`重复安装

* 另一方面如果`foo`又依赖了`base-1`, `base1`又依赖了`base-2`...无限套娃后，这个文件的目录也会过长，超出windows的文件目录长度限制

为了解决上述问题, 在`npm3`之后，选择了一个平铺的方式

还是上面的场景，会在`node_modules`目录下安装`vue`, 发现`vue`依赖了`foo`,`bar`, 则直接把`foo`,`bar`安装在`node_modules`下，再安装`react`,此时发现`react`也依赖了`foo`,`bar`, 则不会重复安装, 但也带来了新的问题，我在`package.json`的`dependency`上没有声明过`foo`,`bar`,也可以在`src`文件下直接`import`使用，即常说的`幻影依赖`，另一方面如果版本不一样的时候，也不能作出最优解，如果`vue`依赖`foo(v1)`,`react`依赖`foo(v2)`,`angular`依赖`foo(v2)`,我们先安装`vue`, 然后安装了`foo(v1)`,并提升到了`node_modules`的层级下，再安装`react`,发现`node_modules`已经有了`foo`,但是版本号不对，则选择在`react`目录下继续安装`foo(v2)`，`angular`同理会在`angular`目录下安装`foo(v2)`,这样`foo(v2)`就被重复安装了2次

* 幻影依赖

> 因为存在level提升，没安装的包也可以使用

* 重复依赖

> 不能保证某个包的某个版本只被安装一次，看包安装的顺序

* 多个项目下不能重复利用

> 我有10个项目都依赖了`vue`, 版本号也一致，但我需要在电脑磁盘上安装10遍依赖，`vue`又依赖`foo`, `foo`也安装10遍，不断套娃，对磁盘的存储性能是很大的浪费

## pnpm是如何设计的

> 软链和硬链的巧妙结合, 通过 `hardLink`(硬链) 在全局里面搞个 `store` 目录来存储 `node_modules` 依赖里面的 `hard link` 地址，然后在引用依赖的时候则是通过 `symlink`(软链) 去找到对应虚拟磁盘目录下(.pnpm 目录)的依赖地址。

架构图
![架构图](/assets/pnpm/pnpm.webp)

### 软链

我们先安装一个vue依赖看看文件目录

```bash
pnpm add vue
```

![pnpm vue](/assets/pnpm/pnpm-vue.png)

我们可以看到在node_modules下只有vue的安装包，并且我们可以看到这是个软链

```bash
cd node_modules && ll
```

result

```bash
vue -> .pnpm/vue@3.2.33/node_modules/vue
```

当我们在 `src` 下 `import Vue from 'vue'` 的时候，根据 `node` 的路径分析规则，他会去 `node_modules/vue` 中查找，而 `node_modules/vue` 实际是 `.pnpm/vue@3.2.33/node_modules/vue` 的软连接

这样我们就解决了 `npm` 模式下幻影依赖的问题, 我们直接在 `src` 项目下`import Foo from 'foo'` 时会找不到对应的包

但为什么是 `.pnpm/<packageName>@<version>/node_modules/<packageName>`的格式, 其实这时候我们可以展开.pnpm文件具体看

![pnpm dependency](/assets/pnpm/pnpm-dependency.png)

我们会发现除了`vue`还有其他上文提到的幻影依赖, 在`vue`的`node_modules`下也做了软链

> 这样做的好处, 一方面可以避免重复安装，另一方面可以解决可能造成的路径过长问题

* `vue`(依赖foo@v1),我们在项目又安装了`angular`（依赖foo@v2）、`react`(依赖foo@v2)

  * 在npm模式下，如果vue先安装了，此时`foo@v1`已经被提升到`node_modules`下了，`foo@v2`这个包分别会被实际安装在`angular`、`react`各自目录的 `node_modules` 目录下，相当于被安装了2次

  * 在pnpm模式下, `vue`指向了一个软链到`.pnpm/foo@v1/node_modules/foo`, `angular`指向了一个软链到`.pnpm/foo@v2/node_modules/foo`, `react`指向了一个软链到`.pnpm/foo@v2/node_modules/foo`, 我们可以看到各个版本只会安装一次

* 项目中引用了 `vue` , 依赖管理的规则会去 `node_modules` 里面查找 `vue`, 实际是 `.pnpm/vue@3.2.33/node_modules/vue` 的软链 当找到 `vue` 之后，在代码执行过程中又发现 `vue` 依赖了 `foo`, `foo`又是个指向`.pnpm/foo@v1/node_modules/foo`的软链, 如果`foo`又依赖了`bar`, 同理，因此无论嵌套有多深, 这个包的路径`.pnpm/<packageName>@<version>/node_modules/<packageName>`, 就巧妙的解决了路径过长的问题

### 硬链

我们平时写代码一般也不会只有一个项目，那A项目依赖了foo, B项目依赖了foo, 我们如果在电脑的磁盘都重复依赖foo, 也是个浪费, 硬链就是帮我们解决这个问题的

我们实际安装了`foo`, 软链指向了 `.pnpm/foo@v1/node_modules/foo`，此时再次硬链指向磁盘空间下`pnpm`开辟出来的`store`处
