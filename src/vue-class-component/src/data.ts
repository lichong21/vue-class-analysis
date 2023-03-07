import Vue from 'vue'
import { VueClass } from './declarations'
import { warn } from './util'

export function collectDataFromConstructor (vm: Vue, Component: VueClass<Vue>) {
  // override _init to prevent to init as Vue instance
  // 获取Class构造函数原型上的_init方法
  const originalInit = Component.prototype._init
  // 重新Class构造函数原型上的_init方法
  Component.prototype._init = function (this: Vue) {
    // 运行时，获取vm实例的自身属性
    const keys = Object.getOwnPropertyNames(vm)
    // 2.2.0 compat (props are no longer exposed as self properties)
    // vm实例上的props属性集合
    if (vm.$options.props) {
      // 遍历属性集合，收集vm上不存的props内部的属性
      for (const key in vm.$options.props) {
        if (!vm.hasOwnProperty(key)) {
          keys.push(key)
        }
      }
    }
    // 遍历给每一个key设置代理。（响应性）
    keys.forEach(key => {
      Object.defineProperty(this, key, {
        get: () => vm[key],
        set: value => { vm[key] = value },
        configurable: true
      })
    })
  }

  // should be acquired class property values
  // 创建了一个Class实例
  const data = new Component()

  // restore original _init to avoid memory leak (#209)
  // 恢复构造函数原型上的_init方法
  Component.prototype._init = originalInit

  // create plain data object
  const plainData = {}
  // 取实例上的属性进行遍历，如果不是undefined，就放到plainData上，进行返回
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      plainData[key] = data[key]
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    if (!(Component.prototype instanceof Vue) && Object.keys(plainData).length > 0) {
      warn(
        'Component class must inherit Vue or its descendant class ' +
        'when class property is used.'
      )
    }
  }

  return plainData
}


// function App() {
//   this.name = 'lll';
//   this.age = 23;
// }

// App.prototype.eat = function () {
//   console.log('aaaaaaaaaa');
// }

// let app = new App();
// app.eat();

// App.prototype.eat = function() {
//   console.log('bbbbbbbb')
// }
// app.eat();
