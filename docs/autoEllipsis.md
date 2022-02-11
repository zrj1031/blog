# autoEllipsis

[codesandbox体验地址](https://codesandbox.io/s/billowing-morning-98ww0?file=/src/App.vue)

## 背景

有一个需求产品希望根据是否文字溢出（是否出现省略号）展示tooltip, 一开始觉得文字溢出是css的行为，js拿不到，只能写死固定字数,后面想想还是太糙了

## 思路

监听 ```offsetWidth``` 和 ```scrollWidth```, 具体的相关[width扫盲帖](https://www.jianshu.com/p/2bd00720e2de)

```js
<template>
  <div ref="tooltipWrapper" class="tooltip-wrapper-ell">
    <template v-if="!showTooltip">
      {{ text }}
    </template>
    <a-tooltip v-else placement="top">
      <template #title>{{ text }}</template>
      <span class="tooltip-wrapper-ell">{{ text }}</span>
    </a-tooltip>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick } from 'vue'

export default defineComponent({
  name: 'TooltipText',
  props: {
    text: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const tooltipWrapper = ref()
    const showTooltip = ref(false)
    watch(
      () => props.text,
      async () => {
        await nextTick()
        const el = tooltipWrapper.value
        showTooltip.value = el.offsetWidth < el.scrollWidth
      },
      {
        immediate: true,
      }
    )
    return {
      tooltipWrapper,
      showTooltip,
    }
  },
})
</script>

<style lang="less">
.tooltip-wrapper-ell {
  display: inline-block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
.ant-tooltip-inner {
  word-break: break-all;
}
</style>

```

### 附一篇[掘金文章](https://juejin.cn/post/6966042926853914654)的思路，纯css

> 父元素height: 1.5em, 只能显示一行，超出隐藏， title元素使用max-height: 3em，正常line-height: 1.5em, 3em就是2行, text一行能完全显示时，title在顶上，text超出一行时（又因为max-height: 3em的原因，只能是2行），此时title刚好覆盖了上去
![示例图](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5a73de39223142bf8b509d97ea20d6cf~tplv-k3u1fbpfcp-watermark.awebp)
大体伪代码如下，
``` html
<div class="wrap">
    <span class="text">CSS 实现优惠券的技巧 - 2021-03-26</span>
    <span class="title" title="CSS 实现优惠券的技巧 - 2021-03-26">CSS 实现优惠券的技巧 - 2021-03-26</span>
</li>
```

```less
.wrap {
  line-height: 1.5;
  height: 1.5em;
  overflow: hidden;
  .text{
    display: block;
    max-height: 3em;
  }
  .title{
    display: block;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    position: relative;
    top: -3em;
  }
}
```