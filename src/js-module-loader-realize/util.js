// 异步文件加载器
var head = document.getElementByTagName("head")[0];
var baseElement = document.getElementByTagName("base")[0];

function request(url, callback) {
  var node = document.createElement("script");

  var supportOnload = "onload" in node;

  if (supportOnload) {
    node.onload = function() {
      callback()
    }
  } else {
    node.onreadystatechange = function() {
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