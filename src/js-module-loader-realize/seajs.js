// 获取加载根路径
var loadderDir=(function() {
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


