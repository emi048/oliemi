// localStorage puede fallar (modo incógnito, etc.), así que todo va envuelto
const guardado = {
  leer(clave, def) { try { return JSON.parse(localStorage.getItem(clave)) ?? def; } catch { return def; } },
  escribir(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} },
};

/* ---------- Imágenes con fondo blanco: se lo saco para que sirvan sobre cualquier color ---------- */
const sinBlancoCache = {};
// recortar: además deja solo el rectángulo donde hay dibujo (así la guirnalda se repite sin huecos)
function quitarBlanco(src, recortar = false) {
  sinBlancoCache[src + recortar] ??= new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const lienzo = document.createElement('canvas');
      lienzo.width = img.naturalWidth;
      lienzo.height = img.naturalHeight;
      const ctx = lienzo.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      const p = datos.data;
      for (let i = 0; i < p.length; i += 4) {
        const minimo = Math.min(p[i], p[i + 1], p[i + 2]);
        // blanco puro → transparente; casi blanco → semitransparente (bordes suaves)
        if (minimo >= 245) p[i + 3] = 0;
        else if (minimo > 205) p[i + 3] = Math.round(((245 - minimo) / 40) * 255);
      }
      ctx.putImageData(datos, 0, 0);
      if (!recortar) return ok(lienzo.toDataURL('image/png'));

      let x0 = lienzo.width, y0 = lienzo.height, x1 = 0, y1 = 0;
      for (let y = 0; y < lienzo.height; y++) {
        for (let x = 0; x < lienzo.width; x++) {
          if (p[(y * lienzo.width + x) * 4 + 3] > 60) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      const recorte = document.createElement('canvas');
      recorte.width = x1 - x0 + 1;
      recorte.height = y1 - y0 + 1;
      recorte.getContext('2d').drawImage(lienzo, x0, y0, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
      ok(recorte.toDataURL('image/png'));
    };
    img.onerror = mal;
    img.src = src;
  });
  return sinBlancoCache[src + recortar];
}
document.querySelectorAll('[data-sin-blanco]').forEach(el => {
  quitarBlanco(el.dataset.sinBlanco, el.hasAttribute('data-recortar'))
    .then(url => { el.style.backgroundImage = `url(${url})`; })
    .catch(() => { el.style.backgroundImage = `url(${el.dataset.sinBlanco})`; });
});

/* ---------- Portón ---------- */
const porton = document.getElementById('porton');
const saludo = document.getElementById('saludo');

function saludar(quien) {
  saludo.textContent = `hola ${quien.toLowerCase()} ♡`;
  // solo Oli y Emi pueden editar la descripción
  document.getElementById('editar-descripcion').hidden = quien === 'visita';
}

function entrar(quien) {
  try { sessionStorage.setItem('quien', quien); } catch {}
  saludar(quien);
  porton.classList.add('abierto');
}

porton.querySelectorAll('button').forEach(b =>
  b.addEventListener('click', () => entrar(b.dataset.quien)));

let quienYa = null;
try { quienYa = sessionStorage.getItem('quien'); } catch {}
if (quienYa) {
  porton.style.display = 'none';
  saludar(quienYa);
}

/* ---------- Base de datos (funciones de Netlify en /api) ---------- */
// Devuelve { ok, status, datos }. Si no hay servidor (p. ej. en localhost) devuelve ok: false, status: 0.
async function api(ruta, opciones = {}) {
  try {
    const res = await fetch(`/api/${ruta}`, {
      ...opciones,
      headers: { 'content-type': 'application/json', ...opciones.headers },
    });
    const datos = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, datos };
  } catch {
    return { ok: false, status: 0, datos: null };
  }
}

/* ---------- Descripción editable (compartida; pide la clave del blog) ---------- */
const descripcion = document.getElementById('descripcion');
const botonEditar = document.getElementById('editar-descripcion');
const notaEditar = document.getElementById('editar-nota');

api('descripcion').then(({ ok, datos }) => {
  if (ok && datos?.texto) descripcion.textContent = datos.texto;
  else if (!ok) {
    // sin servidor: lo último guardado en este navegador
    const local = guardado.leer('descripcion', null);
    if (local) descripcion.textContent = local;
  }
});

async function guardarDescripcion(texto) {
  let clave = guardado.leer('clave-blog', '');
  if (!clave) {
    clave = prompt('clave del blog ♡') ?? '';
    if (!clave) return 'no se guardó (falta la clave)';
  }
  const { ok, status } = await api('descripcion', {
    method: 'PUT',
    headers: { 'x-clave': clave },
    body: JSON.stringify({ texto }),
  });
  if (ok) { guardado.escribir('clave-blog', clave); return 'guardado para los dos ♡'; }
  if (status === 401) { guardado.escribir('clave-blog', ''); return 'clave incorrecta, probá de nuevo'; }
  guardado.escribir('descripcion', texto);
  return status === 0 ? 'guardado solo en esta compu' : 'no se pudo guardar, probá más tarde';
}

botonEditar.addEventListener('click', async () => {
  const editando = descripcion.isContentEditable;
  if (editando) {
    descripcion.contentEditable = 'false';
    botonEditar.textContent = '✎ editar';
    notaEditar.textContent = 'guardando…';
    notaEditar.textContent = await guardarDescripcion(descripcion.textContent.trim());
  } else {
    descripcion.contentEditable = 'true';
    descripcion.focus();
    botonEditar.textContent = '✓ guardar';
    notaEditar.textContent = '';
  }
});

document.getElementById('salir').addEventListener('click', e => {
  e.preventDefault();
  try { sessionStorage.removeItem('quien'); } catch {}
  location.reload();
});

/* ---------- Panel del perfil (muñequito de messenger) ---------- */
const botonMessenger = document.getElementById('messenger-boton');
const panelPerfil = document.getElementById('panel-perfil');

function abrirPanel(abrir) {
  panelPerfil.hidden = !abrir;
  botonMessenger.setAttribute('aria-expanded', String(abrir));
}
botonMessenger.addEventListener('click', e => {
  e.stopPropagation();
  abrirPanel(panelPerfil.hidden);
});
document.addEventListener('click', e => {
  if (!panelPerfil.hidden && !panelPerfil.contains(e.target)) abrirPanel(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') abrirPanel(false); });

/* ---------- MSN / libro de visitas (compartido) ---------- */
const chat = document.getElementById('msn-chat');
let mensajes = guardado.leer('msn', [
  { nick: 'Oli ♡', texto: 'bienvenidxs a nuestro blog!! dejen un mensajito :)' },
  { nick: 'Emi ♡', texto: 'firmen el libro de visitas 🌸' },
]);
let msnEnServidor = false;

api('msn').then(({ ok, datos }) => {
  if (ok && Array.isArray(datos)) { msnEnServidor = true; mensajes = datos; pintarChat(); }
});

function pintarChat() {
  chat.innerHTML = '';
  mensajes.forEach(m => {
    const nick = document.createElement('div');
    nick.className = 'nick';
    nick.textContent = `${m.nick} dice:`;
    const texto = document.createElement('p');
    texto.className = 'texto';
    texto.textContent = m.texto;
    chat.append(nick, texto);
  });
  chat.scrollTop = chat.scrollHeight;
}
pintarChat();

document.getElementById('msn-form').addEventListener('submit', async e => {
  e.preventDefault();
  const nick = document.getElementById('msn-nombre').value.trim() || 'anónimx';
  const campo = document.getElementById('msn-texto');
  const texto = campo.value.trim();
  if (!texto) return;
  campo.value = '';

  if (msnEnServidor) {
    const { ok, datos } = await api('msn', { method: 'POST', body: JSON.stringify({ nick, texto }) });
    if (ok && Array.isArray(datos)) { mensajes = datos; pintarChat(); return; }
  }
  // sin servidor: queda en este navegador
  mensajes.push({ nick, texto });
  guardado.escribir('msn', mensajes.slice(-30));
  pintarChat();
});

/* ---------- Brillitos que siguen al mouse ---------- */
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
let ultimo = 0;
if (!sinMovimiento) {
  document.addEventListener('mousemove', e => {
    const ahora = Date.now();
    if (ahora - ultimo < 60) return;
    ultimo = ahora;
    const b = document.createElement('span');
    b.className = 'brillo';
    b.textContent = ['✦', '♡', '✧', '⋆'][Math.floor(Math.random() * 4)];
    b.style.left = e.clientX + 6 + 'px';
    b.style.top = e.clientY + 6 + 'px';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 800);
  });
}
