import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = await request.json()

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName = typeof fullName === 'string' ? fullName.trim() : ''

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json({ error: 'Full name, email, and password are required.' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Signup is temporarily unavailable. Missing server configuration.' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: normalizedName },
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    const user = signUpData.user
    if (!user) {
      return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 400 })
    }

    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: signUpData.session?.access_token
        ? { headers: { Authorization: `Bearer ${signUpData.session.access_token}` } }
        : undefined,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error: profileError } = await authedSupabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: normalizedName,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      needsEmailConfirmation: !signUpData.session,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
