var util = (function(global) {
  var _prefix = '我想说:';
  return {
    log: function(msg) {console.log(_prefix + msg)}
  }
})(global ? global : window)

util.log('好好学习')

// 缺点
// index.html
// <script src="main.js"></script>
// <script src="util.js"></script>

// main.js
// util.log('我是模块主代码，我加载好了') //报错：util 未定义 is not defined