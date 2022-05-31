
/**
 * @description 获取加载根路径
 */

var loadderDir = (function () {
  // 使用正则获取一个文件所在的目录
  function dirname(path) {
    return path.match(/[^?#]*\//)[0];
  }
  //拿到引用seajs所在的script节点
  var scripts = document.scripts
  var ownScript = scripts[scripts.length - 1]
  //获取绝对地址的兼容写法
  var src = ownScript.hasAttribute ? ownScript.src : ownScript.getAttribute("src", 4);
  return dirname(src);
})();



var head = document.getElementByTagName("head")[0];
var baseElement = document.getElementByTagName("base")[0];
/**
 * @description 异步文件加载器
 */
function request(url, callback) {
  var node = document.createElement("script");

  var supportOnload = "onload" in node;

  if (supportOnload) {
    node.onload = function () {
      callback()
    }
  } else {
    node.onreadystatechange = function () {
      if (/loaded|complete/.test(node.readyState)) {
        callback();
      }
    }
  }
  node.async = true;
  node.src = url;
  // ie6下如果有base的script节点会报错，
  // 所以有baseElement的时候不能用`head.appendChild(node)`,而是应该插入到base之前
  baseElement ? head.insertBefore(node, baseElement) : head.appendChild(node)
}


/**
 * @description 模块类
 */

function Module(uri, deps) {
  this.uri = uri;
  this.dependencies = deps || [];
  this.factory = null;
  this.status = 0;

  // 哪些模块依赖我
  this._waiting = {};

  // 我依赖的模块还有哪些没加载
  this._remain = 0;
}

// 1. uri 当前模块的地址 一般就是用 baseUrl（loadderDir） + id + '.js'

// 2. deps 当前模块的依赖

// 3. factory 就是我们定义模块时define的函数参数function(require, exports, module){}

// 4. status 代表当前模块的状态,定义如下状态:

var STATUS = Module.STATUS = {
  // 1 - 对应的js文件正在加载
  FETCHING: 1,
  // 2 - js 加载完毕，并且已经分析了js文件，得到了一些相关信息，储存起来了
  SAVED: 2,
  // 3 - 依赖的模块正在加载
  LOADING: 3,
  // 4 - 依赖的模块加载好了，处于可执行状态
  LOADED: 4,
  // 5 - 正在执行这个模块
  EXECUTING: 5,
  // 6 - 这个模块执行完成
  EXECUTED: 6,
};

// _waitings存放着依赖我的模块实例集合，_remain则代表我还有多少依赖模块是处于不可用，也就是上面的小于LOADED的状态。

// _waitings&_remain 作用：
// 比如，模块A依赖模块B、C
// 那么A模块装载的时候会先通知B、C把自己（A）加到_waitings里。
// 当B模块装载好了，就可以通过遍历B自己的_waitings去更新依赖它的模块比如A的_remain的值
// B发现更新后A的remain不为0，就什么也不做。直到C也装载好了，C去更新A的_remain值发现值为0了，就会调用A完成的回调了

// 如过一个模块没有依赖，就会了立即进入完成状态
// 然后更新依赖的_remain
// 往上一级一级的去更新状态

// 状态如何变化呢：给模块增加一些原型方法

// 用于加载当前模块所在文件
// 加载前状态是STATUS.FETCHING,加载完成后状态是SAVED，加载完后调用当前模块的load方法

// Module.prototype.fetch = function() {};

// 用于装载当前模块，装载之前状态变为STATUS.LOADING, 主要初始化 依赖的模块的加载情况。
// 看一下依赖的模块有多少没有达到SAVED的状态，赋值给自己的_remain。另外对还没有加载的模块设置对应的_waitings，增加对自己的引用。
// 挨个检查自己依赖的模块。发现依赖的模块都加载完成，或者没有依赖的模块就直接调用自己的onload
// 如果发现依赖模块还有没加载的就调用它的fetch让它去加载。如果已经是加载完了，也就是SAVED状态的。就调用它的load

// Module.prototype.load = function() {};

// 当模块装载完，也就是load之后会调用此函数。会将状态变为LOADED，并且遍历自己的_waitings，找到依赖自己的那些模块，更新相应的_remain值，发现为0的话就调用对应的onload。
// onload调用有两种情况，第一种就是一个模块没有任何依赖直接load后调用自己的onload.
// 还有一种就是当前模块依赖的模块都已经加载完成，在那些加载完成的模块的onload里面会帮忙检测_remain。通知当前模块是否该调用onload
// 这样就会使用上面说的那套通知机制，当一个没有依赖的模块加载好了，会检测依赖它的模块。发现_remain为0，就会帮忙调用那个模块的onload函数

// Module.prototype.onload = function() {}

/*============================================*/
/*==****下面的几个跟上面的通知机制就没啥关系了****==*/
/*===========================================*/

// exec用于执行当前模块的factory
// 执行前为 STATUS.FETCHING 执行后为 STATUS.EXECUTED

// Module.prototype.exec = function(){}

// 这是一个辅助方法，用来获取格式化当前依赖的模块的地址。
// 比如上面就会把  ['util'] 格式化为 [baseUrl（就是上面的loadderDir）+ util + '.js']

// Module.prototype.resolve = function(){}


//实例生成方法，所有的模块都是单例的，get用来获得一个单例。

// Module.get = function(){}


/**
 * 辅助函数
 * */

// 存储实例化的模块对象
cachedMods = {}
// 根据uri获取一个对象，没有的话就生成一个新的
Module.get = function (uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps));
};

// 进行id到url的转换（实际情况会比这个复杂的多，可以支持各种配置,各种映射。）
function id2Url(id) {
  return loadderDir + id + '.js';
}

// 解析所依赖模块的实际地址集合
Module.prototype.resolve = function () {
  var mod = this;
  var ids = mod.dependencies;
  var uris = [];

  for (var i = 0; len = ids.length; i++) {
    uris[i] = id2Url(ids[i]);
  }
  return uris;
}

/**
 * @description fetch与define的实现
 */
// 实现fetch之前，我们要先实现全局函数define。
// fetch会生成script节点加载模块的具体代码。
// 还记得我们上面模块定义的写法吗？都是使用define来定义一个模块。define的主要任务就是生成当前模块的一些信息，给fetch使用。

// define的实现
var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
var SLASH_RE = /\\\\/g

// 工具函数，解析依赖的模块
function parseDependencies(code) {
  var ret = [];

  code.replace(SLASH_RE, "")
      .replace(REQUIRE_RE, function(m, m1, m2) {
        if (m2) {
          ret.push(m2);
        }
      });
  return ret;
}

function define (factory) {
  // 使用正则分析获取到对应的依赖模块
  deps = parseDependencies(factory.toString());
  var meta = {
    deps: deps,
    factory: factory,
  }
  //存到一个全局变量，等后面fetch在script的onload回调里获取。
  anonymousMeta = meta
}

// fetch的实现
Module.prototype.fetch = function() {
  var mod = this;
  var uri = mod.uri;

  mod.status = STATUS.FETCHING;
  // 调用工具函数，异步加载js
  request(uri, onRequest);

  // 保存模块信息
  function saveModule(uri, anonymousMeta) {
    // 使用辅助函数获取模块，没有就实例化个新的
    var mod = Module.get(uri);
    // 保存meta信息
    if (mod.status < STATUS.SAVED) {
      mod.id = anonymousMeta.id || uri;
      mod.dependencies = anonymousMeta.deps || [];
      mod.factory = anonymousMeta.factory;
      mod.status = STATUS.SAVED;
    }
  }

  function onRequest() {
    // 拿到之前define保存的meta信息
    if (anonymousMeta) {
      saveModule(uri, anonymousMeta)
      anonymousMeta = null;
    }
    // 调用加载函数
    mod.load();
  }
}


/**
 * load与onload的实现
 */

// fetch完成后会调用load方法。
Module.prototype.load = function () {
  var mod = this;
  // If the module is being loaded, just wait it onload call
  // 如果这个模块正在加载状态，就等待onload的调用
  if (mod.status >= STATUS.LOADING) {
    return;
  }
  mod.status = STATUS.LOADING;
  // 拿到解析后的依赖模块列表
  var uris = mod.resolve();

  // 赋值_remain
  var len = mod._remain = uris.length;
  var m;
  for (var i = 0; i < len; i++) {
    // 拿到依赖的模块对应的实例
    m = Module.get(uris[i]);
    // 如果依赖的模块还没LOADED
    if (m.status < STATUS.LOADED) {
      // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
      // 把我注入到依赖模块里的_waitings,
      // 这边可能依赖多次，也就是在define里多次调用加载了同一个模块, 所以要递增。
      m._waiting[mod.uri] = (m._waiting[mod.uri] || 0) + 1;
    } else {
      mod._remain--;
    }
  }

  // 如果一开始就发现自己没有依赖模块，或者依赖的模块早就加载好了，就直接调用自己的onload
  if (mod._remain === 0) {
    mod.onload();
    return;
  }
  // 检查依赖的模块，如果有还没加载的就调用他们的fetch让他们开始加载
  for (var i = 0; i < len; i++) {
    m = cachedMods[uris[i]];
    if (m.status < STATUS.FETCHING) {
      m.fetch();
    } else if (m.status === STATUS.SAVED) {
      m.load()
    }
  }
}

// onload方法的实现
Module.prototype.onload = function () {
  var mod = this;
  mod.status = STATUS.LOADED;
  // 回调，预留接口给之后主函数use使用，这边先不管
  if (mod.callback) {
    mod.callback();
  }

  var waitings = mod._waiting;
  var uri, m;
  // 遍历依赖自己的那些模块实例，挨个的检查_remain，如果更新后为0，就帮忙调用对应的onload
  for (uri in waitings) {
    if (waitings.hasOwnProperty(uri)) {
      m = cachedMods[uri]
      m._remain -= waitings[uri];
      if (m._remain === 0) {
        m.onload();
      }
    }
  }
}

// exec的实现
Module.prototype.exec = function () {
  var mod = this;
  
  if (mod.status >= STATUS.EXECUTING) {
    return mod.exports;
  }

  mod.status = STATUS.EXECUTING;

  var uri = mod.uri;
  // 这是会传递给factory的参数，
  // factory执行的时候，所有的模块已经都加在好处于可用的状态了，但是还没有执行对应的factory。
  // 这就是cmd里面说的用时定义，只有第一次require的时候才会去获取并执行
  function require(id) {
    return Module.get(id2Url(id)).exec();
  }

  function isFunction (obj) {
    return ({}).toString.call(obj) == "[object, Function]";
  }

  // Exec factory
  var factory = mod.factory;
  // 如果factory是函数，直接执行获取到的返回值。否则赋值
  // 主要是主要是为了兼容define({数据})这种写法，可以用来发jsonp请求等等。
  var exports = isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory;
  // 没有返回值，就使用mod.exports的值
  // 为什么我们要返回一个函数的时候，直接exports = function(){}不行了呢？
  // 因为这边取的是mod.exports。exports只是传递过去的指向{}的一个引用。
  // exports只是传递过去的指向{}的一个引用
  // 你改变了这个引用地址，却没有改变mod.exports。所以当然是不行的。
  if (exports === undefined) {
    exports = mod.exports
  }

  mod.exports = exports;
  mod.status = STATUS.EXECUTED;
  return exports;
}

seajs = {};
seajs.use = function (ids, callback) {
  // 生成一个带依赖的模块
  var mod = Module.get('_use_special_id', ids);
  // 还记得上面我们在onload里面预留的接口嘛。这边派上用场了。
  mod.callback = function() {
    var exports = [];
    // 拿到依赖的模块地址数组
    var uris = mod.resolve();
    for (var i = 0, len = uris.length; i<len; i++) {
      // 执行依赖的那些模块
      exports[i] = cachedMods[uris[i]].exec();
    }
    //注入到回调函数中
    if (callback) {
      callback.apply(global, exports)
    }
  }
  //直接使用load去装载。
  mod.load()
}

// 于是整个流程就变成了这样：

// 主入口函数use直接生成一个模块，直接load。然后建立好依赖关系。通过上面那套通知机制，从下到上一个个的触发模块的onload。然后主函数里面调用依赖模块的exec去执行，然后一层层的下去，每一层都可以通过require来执行对应的factory。整个过程就是这样。