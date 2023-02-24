# react-x6

<a href="https://www.npmjs.com/package/react-x6"><img alt="NPM Package" src="https://img.shields.io/npm/v/react-x6.svg?style=flat-square"></a>
![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-x6?style=flat-square)
![npm](https://img.shields.io/npm/dm/react-x6?style=flat-square)
<a href="/LICENSE"><img src="https://img.shields.io/github/license/lloydzhou/react-x6?style=flat-square" alt="MIT License"></a>

## 提供自定义渲染器在react中直接渲染x6画布

1. 使用`react-reconciler`自定义渲染器
2. 只需抽象create/update/removeFrom既可
3. 最后渲染出来的instance就是Graph/Node/Edge对象，这些对象使用ref可以直接绑定
4. Graph内部将Children做进一步处理，通过cloneElement强行生成带key的子组件（避免list diff导致元素id变化）

## 安装
```
npm install react-x6
yarn add react-x6
```

## demo

[online demo](https://codesandbox.io/s/react-x6-demo-nhogrp?file=/src/App.js)

```
import { Graph, Node, Edge } from 'react-x6'


export default function App() {
  // ...
  return (
    <Graph background grid width={800} height={600}>
      <Node id="1" x={100} y={100} label="node1" width={80} height={40}></Node>
      <Node id="3" x={200} y={100} label="node3" width={80} height={40} parent="1" />
      <Node id="2" x={200} y={200} label="node2" width={80} height={40} />
      <Node id="4" x={200} y={250} label="node4" width={80} height={40} ref={node4} />
      <Node id="5" x={300} y={250} label="node5" width={80} height={40} onClick={e => {
        console.log('onClick', e)
      }} />
      <Edge source="1" target="2" />
    </Graph>
  )
}
```

## TODO
- [x] 提供渲染器
- [x] Graph组件
- [x] Node/Edge组件
- [ ] ElementOfPlugin函数方便封装官方plugin
- [ ] NodePort
- [ ] NodeTool/EdgeTool

