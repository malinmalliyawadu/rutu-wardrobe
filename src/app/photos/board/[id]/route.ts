import { pinFile } from '@/lib/board'

/**
 * GET /photos/board/:id?v=thumb
 *
 * The picture of one pin on her board. Like her other photos, these live
 * outside public/, behind the sign-in (src/proxy.ts), and this handler is the
 * one door. The file name is the content hash, so an id's bytes never change.
 */
export async function GET(request: Request, context: RouteContext<'/photos/board/[id]'>): Promise<Response> {
  const { id } = await context.params
  const numeric = Number(id)
  if (!Number.isInteger(numeric) || numeric <= 0) return new Response('Not found', { status: 404 })

  const variant = new URL(request.url).searchParams.get('v') === 'thumb' ? 'thumb' : 'master'
  const bytes = await pinFile(numeric, variant)
  if (!bytes) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'image/jpeg',
      'content-length': String(bytes.byteLength),
      'cache-control': 'private, max-age=31536000, immutable',
    },
  })
}
