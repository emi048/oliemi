// localStorage puede fallar (modo incógnito, etc.), así que todo va envuelto
const guardado = {
  leer(clave, def) { try { return JSON.parse(localStorage.getItem(clave)) ?? def; } catch { return def; } },
  escribir(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} },
};

/* ---------- Imágenes con fondo blanco: se lo saco para que sirvan sobre cualquier color ---------- */
const sinBlancoCache = {};
function quitarBlanco(src) {
  sinBlancoCache[src] ??= new Promise((ok, mal) => {
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
      ok(lienzo.toDataURL('image/png'));
    };
    img.onerror = mal;
    img.src = src;
  });
  return sinBlancoCache[src];
}
document.querySelectorAll('[data-sin-blanco]').forEach(el => {
  quitarBlanco(el.dataset.sinBlanco)
    .then(url => { el.style.backgroundImage = `url(${url})`; })
    .catch(() => { el.style.backgroundImage = `url(${el.dataset.sinBlanco})`; });
});

/* ---------- Portón ---------- */
const porton = document.getElementById('porton');
const saludo = document.getElementById('saludo');

function entrar(quien) {
  try { sessionStorage.setItem('quien', quien); } catch {}
  saludo.textContent = quien === 'visita' ? 'hola visita ♡' : `hola ${quien} ♡`;
  porton.classList.add('abierto');
}

porton.querySelectorAll('button').forEach(b =>
  b.addEventListener('click', () => entrar(b.dataset.quien)));

let quienYa = null;
try { quienYa = sessionStorage.getItem('quien'); } catch {}
if (quienYa) {
  porton.style.display = 'none';
  saludo.textContent = quienYa === 'visita' ? 'hola visita ♡' : `hola ${quienYa} ♡`;
}

document.getElementById('salir').addEventListener('click', e => {
  e.preventDefault();
  try { sessionStorage.removeItem('quien'); } catch {}
  location.reload();
});

/* ---------- Contador de visitas ---------- */
const visitas = guardado.leer('visitas', 1240) + 1;
guardado.escribir('visitas', visitas);
document.getElementById('contador').textContent = String(visitas).padStart(6, '0');

/* ---------- iPod (de mentirita, cambia de canción) ---------- */
const temas = [...document.querySelectorAll('#playlist li')];
const cancion = document.getElementById('cancion');
const progreso = document.getElementById('progreso');
const play = document.getElementById('play');
let actual = 0, avance = 0, reloj = null;

function mostrar(i) {
  temas.forEach(t => t.classList.remove('sonando'));
  temas[i].classList.add('sonando');
  cancion.textContent = temas[i].textContent;
}
function tic() {
  avance += 2;
  if (avance > 100) { avance = 0; actual = (actual + 1) % temas.length; mostrar(actual); }
  progreso.style.width = avance + '%';
}
play.addEventListener('click', () => {
  if (reloj) { clearInterval(reloj); reloj = null; play.textContent = '▶'; return; }
  mostrar(actual);
  reloj = setInterval(tic, 500);
  play.textContent = '❚❚';
});
temas.forEach((t, i) => t.addEventListener('click', () => { actual = i; avance = 0; mostrar(i); }));

/* ---------- MSN / libro de visitas ---------- */
const chat = document.getElementById('msn-chat');
const mensajes = guardado.leer('msn', [
  { nick: 'Oli ♡', texto: 'bienvenidxs a nuestro blog!! dejen un mensajito :)' },
  { nick: 'Emi ♡', texto: 'firmen el libro de visitas 🌸' },
]);

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

document.getElementById('msn-form').addEventListener('submit', e => {
  e.preventDefault();
  const nick = document.getElementById('msn-nombre').value.trim() || 'anónimx';
  const campo = document.getElementById('msn-texto');
  const texto = campo.value.trim();
  if (!texto) return;
  mensajes.push({ nick, texto });
  guardado.escribir('msn', mensajes.slice(-30));
  campo.value = '';
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
