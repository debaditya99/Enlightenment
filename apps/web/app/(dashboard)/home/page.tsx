'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../utils/supabase/client'
import { addTask, toggleTaskStatus, deleteTask, addCanvasNode, syncCanvasElements, deleteCanvasNode, deleteCanvasEdge } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactFlow, Background, Controls, addEdge, useNodesState, useEdgesState } from '@xyflow/react'

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [tasks, setTasks] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [shape, setShape] = useState('rectangle')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const fetchDashboardData = useCallback(async () => {
    const { data: taskData } = await supabase.from('tasks').select('*').order('created_at', { ascending: true })
    if (taskData) setTasks(taskData)

    const { data: canvasData } = await supabase.from('canvas_elements').select('*')
    if (canvasData) {
      const dbNodes = canvasData.filter(el => el.type === 'node').map(node => {
        // Uniform color and shape definitions with built-in deletion handle action overlays
        let shapeClasses = 'border-zinc-800 bg-zinc-900/90 hover:border-zinc-700 rounded-xl'
        if (node.shape === 'circle') shapeClasses = 'border-zinc-800 bg-zinc-900/90 rounded-full aspect-square flex items-center justify-center'
        if (node.shape === 'rounded') shapeClasses = 'border-zinc-800 bg-zinc-900/90 rounded-2xl'
        if (node.shape === 'diamond') shapeClasses = 'border-zinc-800 bg-zinc-900/90 rotate-45 aspect-square flex items-center justify-center'

        return {
          id: node.id,
          type: 'default',
          position: { x: node.x_pos, y: node.y_pos },
          data: { 
            label: (
              <div className={`p-1.5 relative group/node text-left select-none ${node.shape === 'diamond' ? '-rotate-45' : ''}`}>
                {/* Micro Node Deletion Command Button anchor */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await deleteCanvasNode(node.id)
                  }}
                  className="absolute -top-3 -right-3 w-5 h-5 bg-zinc-800 border border-zinc-700 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all opacity-0 group-hover/node:opacity-100 z-50 shadow-md"
                  title="Remove Shape"
                >
                  ✕
                </button>
                <div className="font-semibold text-xs text-zinc-100 pr-2">{node.title}</div>
                {node.description && <div className="text-[10px] text-zinc-400 mt-1 max-w-[130px] truncate leading-snug">{node.description}</div>}
              </div>
            )
          },
          className: `shadow-xl text-zinc-200 min-w-[140px] p-2 transition-all ${shapeClasses}`
        }
      })

      const dbEdges = canvasData.filter(el => el.type === 'edge').map(edge => ({
        id: edge.id,
        source: edge.source_id,
        target: edge.target_id,
        animated: true,
        style: { stroke: '#27272a', strokeWidth: 2 }, // Slate-zinc link connectors
        interactionWidth: 20,
      }))

      setNodes(dbNodes)
      setEdges(dbEdges)
    }
  }, [supabase, setNodes, setEdges])

  useEffect(() => {
    fetchDashboardData()

    const channel = supabase
      .channel('realtime-dashboard-sync')
      .on('postgres_changes', { event: '*', scheme: 'public', table: 'tasks' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', scheme: 'public', table: 'canvas_elements' }, () => fetchDashboardData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchDashboardData])

  const handleNodeDragStop = async (event: any, node: any) => {
    await syncCanvasElements([node])
  }

  const handleConnect = async (params: any) => {
    setEdges((eds) => addEdge(params, eds))
    const uniqueId = `edge_${crypto.randomUUID()}`
    await syncCanvasElements([{
      id: uniqueId,
      source: params.source,
      target: params.target
    }])
  }

  // Deletion hook triggered when clicking an arrow line connection directly
  const onEdgeClick = async (event: any, edge: any) => {
    await deleteCanvasEdge(edge.id)
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 px-6 min-h-[90vh]">
      
      {/* LEFT CONTROL PANEL */}
      <div className="space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="border-b border-zinc-800 pb-4 space-y-1">
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Control Desk</h2>
            <p className="text-xs text-zinc-400">Manage infrastructure tracking layers.</p>
          </div>

          <form action={addTask} className="flex gap-2">
            <Input name="title" placeholder="Queue system tasks..." required className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 shadow-inner" />
            <Button type="submit" className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs px-4">Add</Button>
          </form>

          <Card className="bg-zinc-900/20 border-zinc-800 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-3 space-y-1.5 max-h-[45vh] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-[11px] text-zinc-600 text-center py-4">No parameters active.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex justify-between items-center group/task transition-all hover:border-zinc-700">
                    <div className="flex items-center gap-3 truncate">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        disabled={processingId === task.id}
                        onChange={async () => { setProcessingId(task.id); await toggleTaskStatus(task.id, task.status); setProcessingId(null) }}
                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 text-zinc-100 accent-zinc-100 cursor-pointer"
                      />
                      <span className={`text-xs font-medium truncate ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{task.title}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={async () => { setProcessingId(task.id); await deleteTask(task.id); setProcessingId(null) }} className="opacity-0 group-hover/task:opacity-100 h-5 px-1.5 text-[10px] text-rose-400 hover:bg-rose-950/30">Delete</Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        
        <Button variant="outline" onClick={handleSignOut} className="w-full border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 text-xs h-9 font-medium transition-colors">
          Sign Out Node Session
        </Button>
      </div>

      {/* CANVAS GRAPH ENGINE WORKSPACE */}
      <div className="lg:col-span-2">
        <Card className="bg-zinc-900/20 border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[78vh] backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/40 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-sm font-bold tracking-wide text-zinc-200">Graph Node Engine</CardTitle>
              <CardDescription className="text-[11px] text-zinc-400">Spawn shapes. Hover elements to toggle deletion markers. Click any edge line to erase link bindings.</CardDescription>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fData = new FormData(form);
              await addCanvasNode(fData.get('nodeTitle') as string, fData.get('nodeDesc') as string, shape);
              form.reset();
            }} className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              <Input name="nodeTitle" placeholder="Title (Required)" required className="bg-zinc-900/60 border-zinc-800 h-8 text-xs w-28 text-zinc-200" />
              <Input name="nodeDesc" placeholder="Desc (Optional)" className="bg-zinc-900/60 border-zinc-800 h-8 text-xs w-28 text-zinc-200" />
              <select 
                value={shape} 
                onChange={(e) => setShape(e.target.value)} 
                className="bg-zinc-900/60 border border-zinc-800 rounded px-2 h-8 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              >
                <option value="rectangle">Rectangle</option>
                <option value="rounded">Rounded Box</option>
                <option value="circle">Circle Orbit</option>
                <option value="diamond">Diamond Gate</option>
              </select>
              <Button type="submit" size="sm" className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 h-8 font-bold text-xs px-3 shadow-md">Spawn</Button>
            </form>
          </CardHeader>

          {/* INFINITE CANVAS GRAPH BOX */}
          <div className="flex-1 w-full bg-zinc-950 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeDragStop={handleNodeDragStop}
              onEdgeClick={onEdgeClick}
              fitView
            >
              <Background color="#1f1f23" gap={18} size={1} />
              <Controls className="bg-zinc-900 border border-zinc-800 text-white fill-white !p-1 [&_button]:!bg-zinc-800 [&_button]:!border-zinc-700 [&_button_svg]:!fill-white" />
            </ReactFlow>
          </div>
        </Card>
      </div>
    </div>
  )
}