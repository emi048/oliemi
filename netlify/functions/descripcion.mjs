// Descripción de "quiénes somos", compartida entre todos los que visitan el blog.
// GET  /api/descripcion        → { texto }
// PUT  /api/descripcion        → guarda { texto } si viene la clave correcta en el header x-clave
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore({ name: 'blog', consistency: 'strong' });

  if (req.method === 'GET') {
    const texto = await store.get('descripcion');
    return Response.json({ texto });
  }

  if (req.method === 'PUT') {
    const claveBlog = process.env.CLAVE_BLOG;
    if (!claveBlog) return Response.json({ error: 'falta configurar CLAVE_BLOG en Netlify' }, { status: 503 });
    if (req.headers.get('x-clave') !== claveBlog) return Response.json({ error: 'clave incorrecta' }, { status: 401 });

    const { texto } = await req.json().catch(() => ({}));
    if (typeof texto !== 'string' || !texto.trim()) return Response.json({ error: 'texto vacío' }, { status: 400 });

    const limpio = texto.trim().slice(0, 600);
    await store.set('descripcion', limpio);
    return Response.json({ texto: limpio });
  }

  return new Response('método no permitido', { status: 405 });
};

export const config = { path: '/api/descripcion' };
