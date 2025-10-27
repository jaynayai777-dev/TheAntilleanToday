import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import sanitize from 'sanitize-filename'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posts')

function toIsoOrNull(val) {
  try {
    if (!val) return null
    const d = new Date(val)
    return d.toISOString()
  } catch {
    return null
  }
}

function buildFrontmatter(post) {
  return {
    title: post.title ?? '',
    slug: post.slug ?? '',
    date: toIsoOrNull(post.date) ?? new Date().toISOString(),
    author: post.author ?? '',
    summary: post.summary ?? '',
    featured_image: post.featured_image ?? '',
    thumbnail_image: post.thumbnail_image ?? '',
    source_link: post.source_link ?? '',
    status: post.status ?? 'draft'
  }
}

function filenameForPost(slug) {
  const safe = sanitize(slug || '')
  return safe.length ? `${safe}.md` : `${Date.now()}.md`
}

async function exportPosts() {
  // Get only published posts
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('date', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    process.exit(1)
  }

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
  }

  // Write each post as a Markdown file
  for (const post of posts) {
    const front = buildFrontmatter(post)
    const body = post.content || ''
    const md = matter.stringify(body, front)
    const filePath = path.join(CONTENT_DIR, filenameForPost(front.slug))
    fs.writeFileSync(filePath, md)
    console.log('Wrote', filePath)
  }

  // Optional: remove files for posts no longer published
  // (simple approach: keep existing files; advanced sync can be added later)
}

exportPosts().catch(err => {
  console.error(err)
  process.exit(1)
})
