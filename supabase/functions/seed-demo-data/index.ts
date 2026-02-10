import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const users = [
      { email: 'admin@demo.com', password: 'admin123', name: 'Admin User', role: 'admin', employee_type: 'Other' },
      { email: 'employee@demo.com', password: 'employee123', name: 'John Developer', role: 'employee', employee_type: 'Developer' },
      { email: 'sarah@demo.com', password: 'password123', name: 'Sarah Designer', role: 'employee', employee_type: 'Graphic Designer' },
      { email: 'mike@demo.com', password: 'password123', name: 'Mike Marketer', role: 'employee', employee_type: 'Digital Marketer' },
      { email: 'lisa@demo.com', password: 'password123', name: 'Lisa Writer', role: 'employee', employee_type: 'Content Writer' },
    ]

    const createdUsers: Array<{ id: string; email: string; role: string; employee_type: string }> = []

    for (const u of users) {
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 })
      const exists = existingList?.users?.find(eu => eu.email === u.email)

      if (exists) {
        createdUsers.push({ id: exists.id, email: u.email, role: u.role, employee_type: u.employee_type })
        continue
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role, employee_type: u.employee_type },
      })

      if (error) {
        console.error(`Failed to create ${u.email}:`, error.message)
        continue
      }

      createdUsers.push({ id: data.user.id, email: u.email, role: u.role, employee_type: u.employee_type })
    }

    // Seed sample tasks
    const today = new Date().toISOString().split('T')[0]
    const employeeUsers = createdUsers.filter(u => u.role === 'employee')

    for (const emp of employeeUsers) {
      const { data: existingTasks } = await supabaseAdmin.from('tasks').select('id').eq('user_id', emp.id).limit(1)
      if (existingTasks && existingTasks.length > 0) continue

      const sampleTasks: Array<{ title: string; description: string; category: string; status: string }> = []

      if (emp.employee_type === 'Developer') {
        sampleTasks.push(
          { title: 'Build login page', description: 'Create auth UI with validation', category: 'Development', status: 'In Progress' },
          { title: 'Fix navigation bug', description: 'Resolve sidebar collapse on mobile', category: 'Development', status: 'Not Started' },
        )
      } else if (emp.employee_type === 'Graphic Designer') {
        sampleTasks.push(
          { title: 'Design homepage banner', description: 'Hero section graphics', category: 'Design', status: 'In Progress' },
        )
      } else if (emp.employee_type === 'Digital Marketer') {
        sampleTasks.push(
          { title: 'Social media campaign', description: 'Plan product launch posts', category: 'Marketing', status: 'Not Started' },
        )
      } else if (emp.employee_type === 'Content Writer') {
        sampleTasks.push(
          { title: 'Write blog article', description: 'Industry trends Q1', category: 'Content', status: 'Finished' },
        )
      }

      for (const task of sampleTasks) {
        const { data: insertedTask } = await supabaseAdmin
          .from('tasks')
          .insert({
            user_id: emp.id,
            title: task.title,
            description: task.description,
            category: task.category,
            date: today,
            status: task.status,
          })
          .select()
          .single()

        if (insertedTask && task.status !== 'Not Started') {
          await supabaseAdmin.from('time_sessions').insert({
            task_id: insertedTask.id,
            start_time: Date.now() - 3600000,
            end_time: task.status === 'Finished' ? Date.now() - 1800000 : null,
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, users_created: createdUsers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Seed error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
