# DropdownMenu

> 在前东家猪厂的时候, 部门开发[移动端组件库](https://nsfi.github.io/fishd-mobile-site/index.html#/zh-CN/components/dropdown), 当时市面上```react```版的移动端组件库质量都不太行（对，说的就是你, ```antd-mobile```([旧版本](https://antd-mobile-doc-v2.gitee.io/docs/react/introduce-cn))(现在重构后[v5版本](https://mobile.ant.design/zh)应该好很多了)）, 市面上做的比较好的主要是基于```Vue```的```Vant```, 然后想移植```DropdownMenu```组件, 就需要把实现从```Vue```翻译到```react```, 也是一次比较深入的阅读源码过程（开源项目的源码一般都比较复杂和高封装, 还是得带着一些为什么去读, 不然读起来会像无头苍蝇）

体验了下demo, 难点应该是动画的处理和位置的计算

* 动画处理, ```transition```监听不了```display: none```的变化, 翻看了```Vant```的源码, 主要就是```Vue```的```Transition```组件, 那React也有相关的组件
  ```import { CSSTransition } from 'react-transition-group'```

* 位置计算, 需要获取父元素的```rect```, 并且监听页面滚动时需同步更新页面

## Vant 最简接入

> 相关参数应该可以意会，就不一一说明了, 具体可参照[Vant官方文档](https://youzan.github.io/vant/v3/#/zh-CN/dropdown-menu)

```js
  <van-dropdown-menu>
    <van-dropdown-item v-model="value1" :options="option1" />
    <van-dropdown-item v-model="value2" :options="option2" />
  </van-dropdown-menu>

  import { ref } from 'vue';
  export default {
    setup() {
      const value1 = ref(0);
      const value2 = ref('a');
      const option1 = [
        { text: '全部商品', value: 0 },
        { text: '新款商品', value: 1 },
        { text: '活动商品', value: 2 },
      ];
      const option2 = [
        { text: '默认排序', value: 'a' },
        { text: '好评排序', value: 'b' },
        { text: '销量排序', value: 'c' },
      ];

      return {
        value1,
        value2,
        option1,
        option2,
      };
    },
  };
  
```
![效果图](https://raw.githubusercontent.com/zrj1031/blogPic/main/20211019172018.png)

## 位置计算

![计算图](https://raw.githubusercontent.com/zrj1031/blogPic/main/20211019195028.png)

如果是往下，实际要获取的位置就是绿色box，那top是蓝色box的bottom
如果是往上，实际要获取的位置就是红色box，那bottom是100vh - 蓝色box的top

```js
direction === 'down'
  ? {
      top: dropDownMenuRef.current?.getBoundingClientRect()
        .bottom,
      bottom: 0,
    }
  : {
      top: 0,
      // bottom: `calc(100vh - ${dropDownMenuRef.current?.getBoundingClientRect().top}px)`,
      bottom: `calc(${window.innerHeight}px - ${
        dropDownMenuRef.current?.getBoundingClientRect().top
      }px)`,
    }
```

## 点击外部区域自动收起 closeOnClickOutside

给外部加点击事件

vant的实现, 给document绑定事件代理，通过```element.contains(event.target as Node)```判断是否是外部点击，是的话就执行绑定的listener（即关闭dropdownMenu), react其实可以直接复用```ahooks```的[useClickAway](https://ahooks.js.org/zh-CN/hooks/dom/use-click-away), 实现基本一致

```js
  export function useClickAway(
    target: Element | Ref<Element | undefined>,
    listener: EventListener,
    options: UseClickAwayOptions = {}
  ) {
    if (!inBrowser) {
      return;
    }

    const { eventName = 'click' } = options;

    const onClick = (event: Event) => {
      const element = unref(target);
      if (element && !element.contains(event.target as Node)) {
        listener(event);
      }
    };

    useEventListener(eventName, onClick, { target: document });
  }

  const onClickAway = () => {
    if (props.closeOnClickOutside) {
      children.forEach((item) => {
        item.toggle(false);
      });
    }
  };

  useClickAway(root, onClickAway);

```

遇到的问题，至今没有解决，我们一般会使用ref传入target dom, 但遇到问题ref在```react-transition-group```结合使用时反复切换时会变成null的问题，记个TODO,参考[issue](https://github.com/reactjs/react-transition-group/issues/766),[codeSanBox](https://codesandbox.io/s/nice-ritchie-936j3?file=/index.js) 然后用了比较简单的方式暂时实现这个效果, 监听window的```click```事件，并且对targets的click事件阻止事件冒泡，注意不能是document，因为react 17之前都会把合成事件冒泡到了document上，再由document派发，此时在合成事件上阻止冒泡，document也监听到了click

```js
useEffect(() => {
  const fn = () => {}
  window.addEventListener('click', fn, false);
  return () => {
    window.removeEventListener('click', fn);
  };
}, []);
```

不过window上监听也有问题，只要页面上有其他地方阻止事件冒泡了，就关不掉，document上监听就不会有这样的问题
