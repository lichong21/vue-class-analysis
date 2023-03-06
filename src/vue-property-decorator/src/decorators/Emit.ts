import Vue from 'vue'

// 正则匹配，把驼峰命名的变量转换为换成短横线链接命名的变量
// onSubmit -> on-submit
const hyphenateRE = /\B([A-Z])/g
const hyphenate = (str: string) => str.replace(hyphenateRE, '-$1').toLowerCase()

/**
 * decorator of an event-emitter function
 * @param  event The name of the event
 * @return MethodDecorator
 */
// event: 就是写在@Emit('xxx')里面的事件名。这里可以不用区分变量的命名规则
export function Emit(event?: string) {
  // 返回了一个新的函数，说明此处的Emit函数属于是装饰器工厂函数
  /** 入参
   *  _target: VueClass的原型对象,可以理解为构造函数本身的原型对象
   *  propertyKey: 指的是VueClass原型对象上的方法名
   *  descriptor: 就是该方法的数据描述符
   */
  
  return function (_target: Vue, propertyKey: string, descriptor: any) {
    // 把VueClass原型对象上的方法名，进行变量名格式转换
    const key = hyphenate(propertyKey)
    // 暂存原始方法： 取数据描述符的Value值，此时的original就是方法名对应的函数体
    const original = descriptor.value
    // 重新定义方法名对应的函数体
    /**
     * @param args: 对应函数体实际接受到的实参列表（注意：带默认值的形参，如果没有传递实参的话是不生效的）
     * @returns 
     */
    descriptor.value = function emitter(...args: any[]) {
      // 定义一个新的方法，相当于是事件触发函数的策略函数。
      /**
       * @param returnValue: 指的是原始函数体执行的返回值。（详见下边的代码）
       */
      const emit = (returnValue: any) => {
        // 选取Emit触发的事件名。优先使用自定义的事件名称，如果没有自定义事件名称的话，就采用方法名的短横线变量风格
        const emitName = event || key

        // 如果原函数没有返回值
        if (returnValue === undefined) {
          if (args.length === 0) {
            // 如果实参列表为空触发事件，不携带参数
            this.$emit(emitName)
          } else if (args.length === 1) {
            // 只携带一个参数
            this.$emit(emitName, args[0])
          } else {
            // 把参数都携带上
            this.$emit(emitName, ...args)
          }
        } else {
          // 如果原函数有返回值，就把函数的返回值拼接到实参列表的头部
          args.unshift(returnValue)
          this.$emit(emitName, ...args)
        }
      }

      // 调用原始方法，传参新方法的实参列表。得到原始方法的返回值
      const returnValue: any = original.apply(this, args)

      if (isPromise(returnValue)) {
        // 如果returnValue是Promise对象，调用then方法去执行事件触发函数
        returnValue.then(emit)
      } else {
        // 如果返回值不是原生的Promise对象，直接事件触发的策略函数。
        emit(returnValue)
      }

      return returnValue
    }
  }
}


/**
 * 判断原生Promise实例的方法：
 *  1、obj对象是Promise的实例
 *  2、obj的then方法是一个函数类型
 */
function isPromise(obj: any): obj is Promise<any> {
  return obj instanceof Promise || (obj && typeof obj.then === 'function')
}





// const hyphenateRE = /\B([A-Z])/g
// const hyphenate = str => {
//   let reg = str.replace(hyphenateRE, '-$1').toLowerCase();
//   console.log(reg);
//   return reg;
// }
// hyphenate('vueCli');
