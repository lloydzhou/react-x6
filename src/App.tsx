import { Graph, Node, Edge, ElementOfPlugin } from './lib/Graph'
import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { Snapline } from "@antv/x6-plugin-snapline";
import { MiniMap } from "@antv/x6-plugin-minimap";
import { SourceMarker, TargetMarker } from './lib/Graph'
import { Label } from './lib/Graph'
import { PortGroup, Port, NodeTool, EdgeTool } from './lib/Graph'

const SnaplinePlugin = ElementOfPlugin('Snapline', Snapline)
const MiniMapPlugin = ElementOfPlugin('MiniMap', MiniMap)


function App() {
  const minimapContainer = useRef()
  const node4 = useRef()

  useEffect(() => {
    console.log('node4', node4.current)
  })

  const click = useCallback(e => {
    console.log('onClick', e)
  }, [])

  const [visible, setVisible] = useState(true)

  return (
    <div className="App">
      <button onClick={e => setVisible(!visible)}>显示/隐藏node2</button>
      <Graph background grid width={800} height={600}>
        <Node id="1" x={100} y={100} label="node1" width={80} height={40}>
          <PortGroup name="group1" position={{name: 'top'}} />
          <PortGroup name="group2" position={{name: 'bottom'}} />
          <Port id="port1" group="group1" />
          <Port id="port2" group="group1" />
          <Port id="port3" group="group2" />
          <Port id="port4" group="group2" />
          <NodeTool name="button-remove" args={{ x: 10, y: 10 }} />
        </Node>
        <Node id="3" x={200} y={100} label="node3" width={80} height={40} parent="1" />
        {visible && <Node id="2" x={200} y={200} label="node2" width={80} height={40} onClick={click} />}
        <Node id="4" x={200} y={250} label="node4" width={80} height={40} ref={node4} />
        <Node id="5" x={300} y={250} label="node5" width={80} height={40} onClick={click} />
        <Edge source="1" target="2">
          <EdgeTool name="button-remove" args={{ x: 10, y: 10 }} />
          <Label attrs={{
            text: {
              text: "Hello Label1",
            },
          }} position={{distance: 0.3}} />
          <Label attrs={{
            text: {
              text: "Hello Label3",
            },
          }} position={{distance: 0.5}} />
          <Label attrs={{
            text: {
              text: "Hello Label2",
            },
          }} position={{distance: 0.7}} />
          <SourceMarker name="diamond" />
          <TargetMarker name="ellipse" />
        </Edge>
      </Graph>
    </div>
  )
}

export default App
