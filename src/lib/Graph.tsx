// @ts-nocheck
import { Children, forwardRef, useRef, useLayoutEffect, useState, useMemo, cloneElement } from 'react'
import type { ReactNode, CSSProperties, Ref } from 'react'
import { Graph as X6Graph, Node as X6Node, Edge as X6Edge, StringExt, ObjectExt } from '@antv/x6'
import { Renderer, ElementOf } from './reconciler';

const toArray = (children) => {
  return (children ? children.length && children || [children] : []).filter(i => i)
}

const processProps = (props) => {
  return Object.entries(props).reduce((res, [name, value]) => {
    if (name.startsWith('on')) {
      res.events[name.substr(2).toLowerCase()] = value
    } else {
      res.props[name] = value
    }
    return res
  }, {props:{}, events: {}})
}

const bindEvent = (node, events, graph) => {
  // 绑定事件都是包了一层的，返回一个取消绑定的函数
  const ubindEvents = Object.entries(events).map(([name, callback]) => {
    const handler = (e) => {
      const { cell } = e
      if (node && cell.id === node.id) {
        // @ts-ignore
        callback(e)
      }
    }
    graph.on(`cell:${name}`, handler)
    return () => graph.off(`cell:${name}`, handler)
  })
  return () => ubindEvents.forEach(h => h())
}

interface Props {
  className?: string;
  style?: CSSProperties;
  container?: HTMLDivElement;
  children?: ReactNode;
};

export const Graph = forwardRef<X6Graph, X6Graph.Options & Props>(({ children, width, height, className, style, ...other }, ref) => {
  const container = useRef();
  const divRef = useRef(null);

  const innerGraphRef = useRef<X6Graph | null>(null);

  const gRef = (ref || innerGraphRef) as Ref<X6Graph | null>;

  useLayoutEffect(() => {
    const graph = new X6Graph({
      container: divRef.current,
      width,
      height,
      ...other,
    });

    // @ts-ignore
    gRef.current = graph;

    // @ts-ignore
    container.current = Renderer.createContainer(graph, 1, false, null);

    return () => {
      Renderer.updateContainer(null, container.current, null);
      gRef.current.dispose()
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 1. 不使用react生成的Children，而是强行生成带key的新
   * 2. childrens Map<props.id | props, key>
   * 3. 使用cloneElement把key更新到组件里面
   */

  const idMap = useRef(new Map())
  const processChildren = (children, prefix='') => toArray(children).map((child, count) => {
    const { type, props, ref } = child
    const { id, children, ...other } = props
    const hash = StringExt.hashcode(JSON.stringify(other))
    let key = id || (id && idMap.current.get(`${prefix}:${id}`)) || idMap.current.get(`${prefix}:${hash}`)
    if (!key) {
      key = StringExt.uuid()
      // 边可能会在节点删除的时候隐式删除，使用旧的对象导致渲染出问题并且不能更新
      // TODO 所以边不传id的时候就使用新的uuid创建
      if (!id && type !== 'Edge') {
        idMap.current.set(id ? `${prefix}:${id}` : `${prefix}:${hash}`, key)
      }
    }
    // 使用cloneElement，将key重置，不更改props这些信息
    // 如果当前节点有children，递归处理
    return cloneElement(child, { id: id || key, key }, children && processChildren(children))
  })

  const childrens = useMemo(() => processChildren(children), [children])

  useLayoutEffect(() => {
    if (container.current) {
      Renderer.updateContainer(childrens, container.current, null);
    }
  }, [childrens]);

  useLayoutEffect(() => {
    gRef.current.resize(width, height);
  }, [width, height, gRef]);

  return (
    <div
      className={className}
      ref={divRef}
      style={style}
    />
  );
});


const createCell = (Ctor, shape, newProps, graph) => {
  const { props={}, events={} } = processProps(newProps)
  let node = Ctor({shape: shape || props.shape || 'rect', ...props, parent: undefined})
  node._removeFrom = function(parentNode) {
    node._removeEvent()
    graph.model.removeCell(node)
  }
  node._update = (oldProps, newProps) => {
    const { props: pprops={}, events: pevents={} } = processProps(oldProps)
    const { props={}, events={} } = processProps(newProps)
    if (!ObjectExt.isEqual(pprops, props)) {
      const t = Ctor({shape: node.shape, ...props, parent: undefined})
      const prop = t.getProp()
      if (!ObjectExt.isEqual(node.getProp(), prop)) {
        Object.keys(prop).forEach((key) => {
          if (['id', 'parent', 'shape'].indexOf(key) === -1) {
            node.setProp(key, prop[key])
          }
        });
      }
    }
    // 移除旧事件，监听新事件
    node._removeEvent()
    // 重新监听新的事件
    node._removeEvent = bindEvent(node, events, graph)
  }

  // 增加监听事件
  node._removeEvent = bindEvent(node, events, graph)
  graph.model.addCell(node)
  if (props.parent) {
    const parentNode = graph.getCellById(props.parent)
    if (parentNode) {
      parentNode.addChild(node)
    }
  }
  return node
}

const createPlugin = (Ctor, newProps, graph) => {
  const { props={}, events={} } = processProps(newProps)
  const plugin = new Ctor({ enabled: true, ...props })
  graph.use(plugin)
  bindEvent(null, events, plugin)
  plugin._removeFrom = () => plugin.dispose()
  // TODO
  plugin._update = () => null
  return plugin
}

// TODO port+group，感觉抽象复杂，收益并不高

// label
const createLabel = (props) => {
  let edge
  const { id } = props
  // 使用id标记当前的对象
  const label = {props}
  label._update = (newProps) => {
    label.props = newProps
    if (edge) {
      const labels = edge.getLabels()
      const i = labels.findIndex(i => i.id === id)
      // 如果通过id找不到index，就认为在最后（类似push）
      const index = i === -1 ? labels.length : i
      // 如果newProps为空，就表示移除当前配置
      if (newProps) {
        labels.splice(index, 1, newProps)
      } else {
        labels.splice(index, 1)
      }
      edge.setLabels([...labels])
    }
  }
  label._insert = (e) => {
    edge = e
    label._update(props)
  }
  label._removeFrom = () => label._update(null)
  return label
}

// marker
const createMarker = (type, props) => {
  // type=sourceMarker/targetMarker
  let edge
  const marker = {props}
  marker._update = (newProps) => {
    marker.props = newProps
    if (edge) {
      const lineAttr = edge.attr('line')
      edge.attr('line', { ...lineAttr, [type]: marker.props })
    }
  }
  marker._insert = (e) => {
    edge = e
    marker._update(props)
  }
  marker._removeFrom = () => marker._update(undefined)
  return marker
}

export const Node = ElementOf("Node", createCell.bind(null, X6Node.create, 'rect'))
export const Edge = ElementOf("Edge", createCell.bind(null, X6Edge.create, 'edge'))
export const SourceMarker = ElementOf("SourceMarker", createMarker.bind(null, 'sourceMarker'))
export const TargetMarker = ElementOf("TargetMarker", createMarker.bind(null, 'targetMarker'))
export const Label = ElementOf("Label", createLabel.bind(null))

export function ElementOfPlugin(name, type) {
  return ElementOf(name, createPlugin.bind(null, type)) as any
}

