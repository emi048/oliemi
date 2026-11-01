// Libro de visitas (el MSN): todos ven los mensajes de todos.
// GET  /api/msn   → [{ nick, texto }]
// POST /api/msn   → agrega { nick, texto } y devuelve la lista actualizada
import { getStore } from '@netlify/blobs';

const MAXIMO = 60;
const INICIALES = [
  { nick: 'Oli ♡', texto: 'bienvenidxs a nuestro blog!! dejen un mensajito :)' },
  { nick: 'Emi ♡', texto: 'firmen el libro de visitas 🌸' },
];

export default async (req) => {
  const store = getStore({ name: 'blog', consistency: 'strong' });
  const mensajes = (await store.get('msn', { type: 'json' })) ?? INICIALES;

  if (req.method === 'GET') return Response.json(mensajes);

  if (req.method === 'POST') {
    const { nick, texto } = await req.json().catch(() => ({}));
    if (typeof texto !== 'string' || !texto.trim()) return Response.json({ error: 'mensaje vacío' }, { status: 400 });

    const nuevo = {
      nick: (typeof nick === 'string' && nick.trim() ? nick.trim() : 'anónimx').slice(0, 20),
      texto: texto.trim().slice(0, 200),
    };
    const lista = [...mensajes, nuevo].slice(-MAXIMO);
    await store.setJSON('msn', lista);
    return Response.json(lista);
  }

  return new Response('método no permitido', { status: 405 });
};

export const config = { path: '/api/msn' };
