var util = {
  _prefix: '我想说：',
  log: function(msg) {console.log(this._prefix + msg)},
  /**
   * 其他工具函数
   */
}

util.log('好好学习！');
util._prefix = '我想：';
util.log('好好学习！');

// 缺点：不存在私有属性，可随意修改，很难定位到在哪里被修改了