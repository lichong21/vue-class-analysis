import Vue, { ComponentOptions } from 'vue'
import { copyReflectionMetadata, reflectionIsSupported } from './reflect'
import { VueClass, DecoratedClass } from './declarations'
import { collectDataFromConstructor } from './data'
import { hasProto, isPrimitive, warn } from './util'

export const $internalHooks = [
  'data',
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeDestroy',
  'destroyed',
  'beforeUpdate',
  'updated',
  'activated',
  'deactivated',
  'render',
  'errorCaptured', // 2.5
  'serverPrefetch' // 2.6
]

export function componentFactory (
  Component: VueClass<Vue>,
  options: ComponentOptions<Vue> = {}
): VueClass<Vue> {
  // Vue原生写法中选项式API中nane属性，给当前组件起一个名字。
  // 优先级：@Compnent里面入参的name属性 > class的静态name属性
  options.name = options.name || (Component as any)._componentTag || (Component as any).name
  // 获取class类（构造函数）的原型对象
  const proto = Component.prototype
  // 遍历属于原型对象上方法和属性。（构造函数原型对象之外原型链上的方法不会被遍历）
  /**
   * 我们使用类的写法，直接在class里面声明的属性和方法，其实相当于写在了构造函数的原型对象上
   *  
   * class App {
   *    name = 123;
   *    init() {}
   * }
   * 
   * 相当于
   * 
   * function App() {};
   * App.prototype.name = 123;
   * App.prototype.init = function() {};
   * 
   */

  // 小提示：forEach内部使用return，可以拦截return后面的代码执行
  Object.getOwnPropertyNames(proto).forEach(function (key) {

    // Vue的Class写法，不建议我们在Class里面写constructor构造函数。
    // 详见地址：https://class-component.vuejs.org/guide/caveats.html#always-use-lifecycle-hooks-instead-of-constructor
    // 简单说明：Vue的工作方式是根据自身定义的生命周期来执行的，constructor构造函数不在Vue的生命周期钩子的执行时机中
    if (key === 'constructor') {
      return
    }

    // 遍历的key，命中了Vue的声明周期钩子函数。
    // 直接把原型对象上的key对应声明周期钩子函数，赋值给options选项API的声明周期钩子函数。（迁移）
    if ($internalHooks.indexOf(key) > -1) {
      options[key] = proto[key]
      return
    }
    // getOwnPropertyDescriptor: 获取对象属性
    /** 对象属性可以分为两类：
     *  - 数据属性：configurable、enumerable、writable、value
     *  - 访问器属性: configurable、enumerable、get、set
     */

    // 获取对象的访问器属性key
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
    // key属性描述符中value不存在，则证明当前key是set或get属性方法
    if (descriptor.value !== void 0) {   // 数据属性
      // value是函数类型，说明原型中的该方法属于选项式API中的methods对象中的方法
      if (typeof descriptor.value === 'function') {
        (options.methods || (options.methods = {}))[key] = descriptor.value
      } else {
        // value不是函数类型，说明value就是原型上的属性，应该属于选项式API的data中的变量
        // 这里使用mixins混入的方式
        (options.mixins || (options.mixins = [])).push({
          data (this: Vue) {
            return { [key]: descriptor.value }
          }
        })
      }
    } else if (descriptor.get || descriptor.set) { // 访问器属性
      // 把原型对象上的get与set方法，迁移到选项式API的计算属性中
      (options.computed || (options.computed = {}))[key] = {
        get: descriptor.get,
        set: descriptor.set
      }
    }
  })

  // add data hook to collect class properties as Vue instance's data

  // 处理构造函数上的实例属性
  ;(options.mixins || (options.mixins = [])).push({
    data (this: Vue) {
      // this指的是实例vm，component指定的是Class的构造函数
      return collectDataFromConstructor(this, Component)
    }
  })

  // decorate options
  // __decorators__是Class上的静态属性
  const decorators = (Component as DecoratedClass).__decorators__
  if (decorators) {
    // 遍历装饰器list，挨个执行。把选项式API的options传进去
    decorators.forEach(fn => fn(options))
    // 移除装饰器list
    delete (Component as DecoratedClass).__decorators__
  }

  // find super
  // 拿到Class构造函数原型对象的原型对象
  const superProto = Object.getPrototypeOf(Component.prototype)
  const Super = superProto instanceof Vue
    ? superProto.constructor as VueClass<Vue>
    : Vue
  const Extended = Super.extend(options)

  forwardStaticMembers(Extended, Component, Super)

  if (reflectionIsSupported()) {
    copyReflectionMetadata(Extended, Component)
  }

  return Extended
}

const reservedPropertyNames = [
  // Unique id
  'cid',

  // Super Vue constructor
  'super',

  // Component options that will be used by the component
  'options',
  'superOptions',
  'extendOptions',
  'sealedOptions',

  // Private assets
  'component',
  'directive',
  'filter'
]

const shouldIgnore = {
  prototype: true,
  arguments: true,
  callee: true,
  caller: true
}

function forwardStaticMembers (
  Extended: typeof Vue,
  Original: typeof Vue,
  Super: typeof Vue
): void {
  // We have to use getOwnPropertyNames since Babel registers methods as non-enumerable
  Object.getOwnPropertyNames(Original).forEach(key => {
    // Skip the properties that should not be overwritten
    if (shouldIgnore[key]) {
      return
    }

    // Some browsers does not allow reconfigure built-in properties
    const extendedDescriptor = Object.getOwnPropertyDescriptor(Extended, key)
    if (extendedDescriptor && !extendedDescriptor.configurable) {
      return
    }

    const descriptor = Object.getOwnPropertyDescriptor(Original, key)!

    // If the user agent does not support `__proto__` or its family (IE <= 10),
    // the sub class properties may be inherited properties from the super class in TypeScript.
    // We need to exclude such properties to prevent to overwrite
    // the component options object which stored on the extended constructor (See #192).
    // If the value is a referenced value (object or function),
    // we can check equality of them and exclude it if they have the same reference.
    // If it is a primitive value, it will be forwarded for safety.
    if (!hasProto) {
      // Only `cid` is explicitly exluded from property forwarding
      // because we cannot detect whether it is a inherited property or not
      // on the no `__proto__` environment even though the property is reserved.
      if (key === 'cid') {
        return
      }

      const superDescriptor = Object.getOwnPropertyDescriptor(Super, key)

      if (
        !isPrimitive(descriptor.value) &&
        superDescriptor &&
        superDescriptor.value === descriptor.value
      ) {
        return
      }
    }

    // Warn if the users manually declare reserved properties
    if (
      process.env.NODE_ENV !== 'production' &&
      reservedPropertyNames.indexOf(key) >= 0
    ) {
      warn(
        `Static property name '${key}' declared on class '${Original.name}' ` +
        'conflicts with reserved property name of Vue internal. ' +
        'It may cause unexpected behavior of the component. Consider renaming the property.'
      )
    }

    Object.defineProperty(Extended, key, descriptor)
  })
}



// let arr = [1, 2, 3 , 4];
// arr.forEach(item => {
//   console.log(0);
//   if (item === 1) {
//     return;
//   }
//   console.log(item);
//   if (item === 2) {
//     return;
//   }
//   console.log(item);
//   if (item === 3) {
//     return;
//   }
//   console.log(item);
//   if (item === 4) {
//     return;
//   }
//   console.log(item);
// })
