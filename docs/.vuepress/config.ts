import { defineUserConfig } from 'vuepress'
import type { DefaultThemeOptions } from 'vuepress'

export default defineUserConfig<DefaultThemeOptions>({
  // 站点配置
  lang: 'zh-CN',
  title: 'Hello zhao大建',
  description: 'zhao大建的个人博客',
  // 主题和它的配置
  theme: '@vuepress/theme-default',
  themeConfig: {
    logo: 'https://raw.githubusercontent.com/zrj1031/blogPic/main/avatar.jpeg',
    sidebar: [
      '/regex.md',
      '/context.md',
      '/dropdownMenu.md',
      '/autoEllipsis.md',
      '/ts.md',
      '/redux-saga.md',
      '/webpack.md',
    ],
    sidebarDepth: 1,
    navbar: [
      {
        text: 'react组件库',
        link: 'https://zrj1031.github.io/awesome-react-mobile/',
      },
    ]
  },
})