'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function addTask(formData: FormData) {
  const title = formData.get('title') as string
  if (!title) return

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // Grab current user session safely on server
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Insert task linked to user
  await supabase.from('tasks').insert({
    title,
    user_id: user.id
  })

  revalidatePath('/home')
}

export async function toggleTaskStatus(id: string, currentStatus: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending'

  // Update status in PostgreSQL
  await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('id', id)

  revalidatePath('/home')
}

export async function deleteTask(id: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // Delete row from PostgreSQL
  await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  revalidatePath('/home')
}

export async function syncCanvasElements(elements: any[]) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Format incoming runtime client elements into clean database rows
  const rows = elements.map((el) => ({
    id: el.id,
    user_id: user.id,
    type: el.source ? 'edge' : 'node',
    title: el.data?.label || null,
    description: el.data?.description || null,
    shape: el.data?.shape || 'rectangle',
    source_id: el.source || null,
    target_id: el.target || null,
    x_pos: el.position?.x || 0.0,
    y_pos: el.position?.y || 0.0,
  }))

  // Bulk upsert modifications (Insert new items or overwrite existing coordinate/text changes)
  if (rows.length > 0) {
    await supabase.from('canvas_elements').upsert(rows)
  }
}

export async function addCanvasNode(title: string, description: string, shape: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('canvas_elements').insert({
    id: `node_${crypto.randomUUID()}`,
    user_id: user.id,
    type: 'node',
    title,
    description: description || null,
    shape,
    x_pos: Math.random() * 250 + 50,
    y_pos: Math.random() * 250 + 50,
  })

  revalidatePath('/home')
}

export async function deleteCanvasNode(nodeId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // 1. Clean up the database by wiping any connecting arrow lines attached to this node
  await supabase
    .from('canvas_elements')
    .delete()
    .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)

  // 2. Remove the physical node item block itself
  await supabase
    .from('canvas_elements')
    .delete()
    .eq('id', nodeId)

  revalidatePath('/home')
}

export async function deleteCanvasEdge(edgeId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  await supabase
    .from('canvas_elements')
    .delete()
    .eq('id', edgeId)

  revalidatePath('/home')
}