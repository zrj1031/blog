# 浅谈redux-saga对流程控制的优越性

由于之前项目接触到了[dva](https://dvajs.com/)，其内部集成了[redux-saga](https://redux-saga.js.org/)，对比[redux-thunk](https://github.com/reduxjs/redux-thunk)有着流程控制上的优势，但同时使用上需要学习新的api,且复杂的流程可能会带来一定使用上的心智负担。



假设我们有这样一个登录流程场景，页面上有俩个按钮（一个登录，一个登出），而该登录有几个关键控制

* 登出(LOGOUT_REQUEST)必然要在对应的登录(LOGIN_REQUEST)之后
* 第一次的登录流程没有结束(登出或者登录失败)前，不会接收第二次登录请求(LOGIN_REQUEST)
* 点击Login，此时和后端鉴权是否能登录成功（假设接口很慢）,还在鉴权的同时点击Logout需要取消掉正在进行中的鉴权

![loginButton](http://qiniucdn.zrj1031.top/20200827203642.png)

场景比较极端，单纯为了例证saga对流程的控制性

* 登录和登出按钮不会出现在同一个页面中，不会存在未登录就登出的操作
* 登录时一般会有页面的loading或者禁用登录按钮保证不会重复连续俩次登录
* 接口请求一般很快，也不需要取消

但假设确实存在这么一个流程，且对按钮完全不做禁用和loading的蒙层，如果使用redux-thunk当然也能实现，但可能代码会比较零散，各种局部变量控制，而使用redux-saga就只需要以下相关代码，且相关的登录流程操作全部被写在一个saga里，代码的可读性会更好

![loginFlow](http://qiniucdn.zrj1031.top/loginFlow.png)

首先一个while(true)的死循环能保证登录-登出-登录-登出这样的重复流程事件监听

```javascript
 while(true) {}
```

LOGIN_REQUEST的事件接收在LOGOUT_REQUEST前，使得未接受过登录请求的本次流程永远无法触发后续的登出操作，同理登录成功，但未有登出操作，使得死循环的saga永远会卡在接收登出操作这一步，即使外部依旧派发了新的登录请求也不会执行

```javascript
const {payload: {username, password}} = yield take('LOGIN_REQUEST')
const action = yield take(['LOGOUT_REQUEST', 'LOGIN_ERROR'])
```



