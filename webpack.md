# webpack优化

一般考虑从构建时间、打包体积进行优化

## hash chunkHash contentHash

hash值用来前端缓存

hash是每次webpack构建都会产生一个新的hash
chunkHash 有2个chunk块  chunkA改变，重新打包，hash变化，但chunkB没有变化，应该使用缓存
contentHash 有时候css通过mini-css-extract-plugin提取后，引入该部分的js变化了,chunkHash自然也变化了，但css是不需要变的

## 构建时间长

### 多进程打包

thread-loader HappyPack(已废弃)

### 利用缓存

cache-loader HardSourceWebpackPlugin babel-loader(cacheDirectory)

### 三方库、公共代码提取

extrenals splitChunksPlugin ddlWebpackPlugin

### extrenals

```js
  // webpack.config,js
  externals: {
    jquery: 'jQuery'
  }

  // index.html
  <script
    src="https://code.jquery.com/jquery-3.1.0.js"
    integrity="sha256-slogkvB1K3VOkzAI8QITxV3VzpOnkeNVsKvtkYLMjfk="
    crossorigin="anonymous">
  </script>

  //使用
  import $ from 'jquery';

```

#### DllPlugin

我们在打包的时候，一般来说第三方模块是不会变化的，所以我们想只要在第一次打包的时候去打包一下第三方模块，并将第三方模块打包到一个特定的文件中，当第二次 webpack 进行打包的时候，就不需要去 node_modules 中去引入第三方模块，而是直接使用我们第一次打包的第三方模块的文件就行。
webpack.DllPlugin 就是来解决这个问题的插件，使用它可以在第一次编译打包后就生成一份不变的代码供其他模块引用，这样下一次构建的时候就可以节省开发时编译打包的时间。

### splitChunksPlugin

抽离公共代码是对于多页应用来说的，如果多个页面引入了一些公共模块，那么可以把这些公共的模块抽离出来，单独打包。公共代码只需要下载一次就缓存起来了，避免了重复下载。
抽离公共代码对于单页应用和多页应该在配置上没有什么区别，都是配置在 optimization.splitChunks 中。

```js
//webpack.config.js
module.exports = {
    optimization: {
        splitChunks: {//分割代码块
            cacheGroups: {
                vendor: {
                    //第三方依赖
                    priority: 1, //设置优先级，首先抽离第三方模块
                    name: 'vendor',
                    test: /node_modules/,
                    chunks: 'initial',
                    minSize: 0,
                    minChunks: 1 //最少引入了1次
                },
                //缓存组
                common: {
                    //公共模块
                    chunks: 'initial',
                    name: 'common',
                    minSize: 100, //大小超过100个字节
                    minChunks: 3 //最少引入了3次
                }
            }
        }
    }
}
```

ddlWebpackPlugin 和 splitChunksPlugin区别

ddlWebpackPlugin是将一些三方库单独打包，再通过DLLReferencePlugin引入（add-asset-html-webpack-plugin），后续不会重复打包，splitChunksPlugin根据重用的次数相关配置，抽离公共代码，每次还是要打包

## 打包体积大

### 压缩

 js terser-webpack-plugin（parallel 多进程压缩）
 css optimize-css-assets-webpack-plugin
 image image-webpack-plugin

 参考链接

https://juejin.cn/post/6844904093463347208
https://juejin.cn/post/6844904142675279886
https://juejin.cn/post/6844904071736852487
