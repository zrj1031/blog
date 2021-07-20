# autoEllipsis

## 背景

有一个需求产品希望根据是否文字溢出（是否出现省略号）展示tooltip, 一开始觉得文字溢出是css的行为，js拿不到，只能写死固定字数,后面想想还是太糙了

## 思路

监听 ```offsetWidth``` 和 ```scrollWidth```

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