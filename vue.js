class Vue {
  constructor(options) {
    this.$data = options.data
    // 数据劫持的方法
    Observe(this.$data)
    // 属性代理
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get () {
          return this.$data[key]
        },
        set (newVal) {
          this.$data[key] = newVal
        }
      })
    })

    // 调用文档碎片函数
    Compile(options.el, this)
  }
}
// 定义 数据劫持
function Observe (obj) {
  const dep = new Dep()
  if (!obj || typeof obj !== 'object') {
    return
  }
  Object.keys(obj).forEach(key => {
    let value = obj[key]
    Observe(value)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get () {
        // 把 订阅者 添加 dep。subs 里面
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set (newVal) {
        value = newVal
        Observe(value)
        //  发布 通知 更新 DOM 内容
        dep.notify()
      }
    })

  });
}
// 定义 html 结构模板编译的方法 
function Compile (el, vm) {
  // 获取 el 元素节点
  vm.$el = document.querySelector(el)
  // 创建 文档碎片 提高 DOM 性能
  const fragment = document.createDocumentFragment()
  while (childNode = vm.$el.firstChild) {
    fragment.appendChild(childNode)
  }

  replace(fragment)

  vm.$el.appendChild(fragment)


  // 模板编译的方法
  function replace (node) {
    // 定义 匹配 插值表达式的正则
    const regMustache = /\{\{\s*(\S+)\s*\}\}/
    // nodeType === 3 证明当前的 node 子节点 是 文本节点 需要正则替换
    if (node.nodeType === 3) {
      //  获取 文本节点的内容
      const text = node.textContent
      const execResulit = regMustache.exec(text)
      // 如果 有值 代表 需要替换
      if (execResulit) {
        // 替换 内容
        const value = execResulit[1].split('.').reduce((newObj, key) => newObj[key], vm)
        // 将 替换好的 赋值给 当前 的 文本节点
        node.textContent = text.replace(regMustache, value)
        // 创建 订阅者 实列
        new Watcher(vm, execResulit[1], (newValue) => {
          node.textContent = text.replace(regMustache, newValue)
        })
      }
      // 终止递归
      return
    }

    if (node.nodeType === 1 && node.tagName.toUpperCase() === 'INPUT') {
      //  获取 当前元素的所有属性节点
      const findResult = Array.from(node.attributes).find(x => x.name === 'v-mode')
      if (findResult) {
        // 获取 当期 元素的 v-mode属性的值
        const expStr = findResult.value
        const value = expStr.split('.').reduce((newObj, k) => newObj[k], vm)
        node.value = value
        // 创建 Watcher 的实例
        new Watcher(vm, expStr, (newValue) => {
          node.value = newValue
        })

        // 监听 input 的 输入事件 拿到文本框的最新的值
        node.addEventListener('input', (e) => {
          const keyArr = expStr.split('.')
          const obj = keyArr.slice(0, keyArr.length - 1).reduce((newObj, k) => newObj[k], vm)
          obj[keyArr[keyArr.length - 1]] = e.target.value
        })
      }
    }
    // 证明不是文本节点 可能是一个 DOM 元素 需要递归处理
    node.childNodes.forEach(child => replace(child))
  }
}

// 依赖收集的类/收集 watcher 者的类
class Dep {
  constructor() {
    this.subs = []
  }
  // 添加订阅者 watcher 的方法
  addSub (wacther) {
    this.subs.push(wacther)
    console.log(this.subs);
  }
  // 发布通知的方法
  notify () {
    this.subs.forEach(watcher => watcher.update())
  }
}

// 订阅者的类

class Watcher {
  /**
  * parmas(vm) vm  里面有全部数据
  * params(key) 当前需要更改的数据
  * params(cb) 回调函数 记录当前 Watcher 如何更改自己的数据
   * */
  constructor(vm, key, cb) {
    this.vm = vm
    this.key = key
    this.cb = cb

    // 运行 以下 代码 会 执行 get 方法
    Dep.target = this
    this.key.split('.').reduce((newObj, k) => newObj[k], vm)
    Dep.target = null
  }
  update () {
    // 获取 最新的值 更新 DOM 内容
    const value = this.key.split('.').reduce((newObj, k) => newObj[k], this.vm)
    this.cb(value)
  }
}