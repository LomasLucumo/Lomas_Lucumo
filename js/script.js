
/*Validar*/
function validarFormulario(form) {
  const camposInvalidos = [];
  limpiarMarcasInvalidas(form);

  const requeridos = form.querySelectorAll("[required]");
  requeridos.forEach(function (campo) {

    if (campo.type === "radio") {
      const grupo = form.querySelectorAll('input[name="' + campo.name + '"]');
      const marcado = Array.from(grupo).some(function (r) { return r.checked; });
      if (!marcado && camposInvalidos.indexOf("Hora de llegada") === -1) {
        camposInvalidos.push("Hora de llegada");
      }
      return;
    }

    if (campo.type === "file") {
      if (!campo.files || campo.files.length === 0) {
        camposInvalidos.push(labelDe(campo));
        marcarInvalido(campo);
      }
      return;
    }

    if (!campo.value || !campo.value.trim()) {
      camposInvalidos.push(labelDe(campo));
      marcarInvalido(campo);
    } else if (campo.type === "email" && !validarEmail(campo.value)) {
      camposInvalidos.push("Correo electrónico (formato inválido)");
      marcarInvalido(campo);
    }
  });


  const tipoEntidad = form.querySelectorAll(".tipo-entidad");
  const algunoMarcado = Array.from(tipoEntidad).some(function (c) { return c.checked; });
  if (!algunoMarcado) {
    camposInvalidos.push("Tipo de entidad (Empresa / Institución / Otros)");
  }

  return camposInvalidos;
}

/* Puntos de Corte*/
function obtenerPuntosDeCorte(card) {
  const cardRect = card.getBoundingClientRect();
  const bloques = card.querySelectorAll(".card-header, .card-body > .row, .card-footer");
  const puntos = [];
  bloques.forEach(function (el) {
    const rect = el.getBoundingClientRect();
    const borde = rect.bottom - cardRect.top; // borde inferior relativo a la tarjeta
    if (borde > 0) puntos.push(borde);
  });
  return Array.from(new Set(puntos)).sort(function (a, b) { return a - b; });
}

function agregarImagenMultiPagina(pdf, canvas, margen, anchoPagina, altoPagina, puntosDeCorteDom, escalaDomACanvas) {
  const relacion = canvas.height / canvas.width;
  const altoImagenTotal = anchoPagina * relacion;

  if (altoImagenTotal <= altoPagina) {
    const imgData = canvas.toDataURL("image/png", 1.0);
    pdf.addImage(imgData, "PNG", margen, margen, anchoPagina, altoImagenTotal);
    return;
  }

  const pxPorMm = canvas.width / anchoPagina;
  const altoPaginaPx = altoPagina * pxPorMm;

  const puntosCanvasPx = puntosDeCorteDom
    .map(function (p) { return p * escalaDomACanvas; })
    .filter(function (p) { return p > 0 && p < canvas.height; });

  let renderizadoPx = 0;
  let primeraPagina = true;

  while (renderizadoPx < canvas.height) {
    const limiteIdeal = renderizadoPx + altoPaginaPx;
    let alturaRebanadaPx = Math.min(altoPaginaPx, canvas.height - renderizadoPx);

    if (limiteIdeal < canvas.height) {
      const candidatos = puntosCanvasPx.filter(function (p) {
        return p > renderizadoPx && p <= limiteIdeal;
      });
      if (candidatos.length > 0) {
        const mejorCorte = candidatos[candidatos.length - 1];
        alturaRebanadaPx = mejorCorte - renderizadoPx;
      }
    }

    const canvasRebanada = document.createElement("canvas");
    canvasRebanada.width = canvas.width;
    canvasRebanada.height = alturaRebanadaPx;

    const ctx = canvasRebanada.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRebanada.width, canvasRebanada.height);
    ctx.drawImage(
      canvas,
      0, renderizadoPx, canvas.width, alturaRebanadaPx,
      0, 0, canvas.width, alturaRebanadaPx
    );

    const imgRebanada = canvasRebanada.toDataURL("image/png", 1.0);
    const altoRebanadaMm = alturaRebanadaPx / pxPorMm;

    if (!primeraPagina) pdf.addPage();
    pdf.addImage(imgRebanada, "PNG", margen, margen, anchoPagina, altoRebanadaMm);

    renderizadoPx += alturaRebanadaPx;
    primeraPagina = false;
  }
}

/* Generar PDF*/
async function generarPdf(boton, form, card) {
  const invalidos = validarFormulario(form);

  if (invalidos.length > 0) {
    window.alert(
      "Por favor complete todos los campos obligatorios antes de generar el PDF.\n\n" +
      "Campos pendientes:\n- " + invalidos.join("\n- ")
    );
    const primerInvalido = form.querySelector(".campo-invalido");
    if (primerInvalido) primerInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (typeof html2canvas === "undefined") {
    window.alert("No se pudo cargar la librería html2canvas. Verifique su conexión a internet y recargue la página.");
    return;
  }
  if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
    window.alert("No se pudo cargar la librería jsPDF. Verifique su conexión a internet y recargue la página.");
    return;
  }

  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Generando PDF...";
  card.classList.add("pdf-capture-mode");

  try {
    const anchoDom = card.scrollWidth;
    const puntosDeCorteDom = obtenerPuntosDeCorte(card);

    const canvas = await html2canvas(card, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: card.scrollWidth,
      windowHeight: card.scrollHeight
    });

    const escalaDomACanvas = canvas.width / anchoDom;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const margen = 10;
    const anchoPagina = pdf.internal.pageSize.getWidth() - margen * 2;
    const altoPagina = pdf.internal.pageSize.getHeight() - margen * 2;

    agregarImagenMultiPagina(pdf, canvas, margen, anchoPagina, altoPagina, puntosDeCorteDom, escalaDomACanvas);

    pdf.save("ficha-de-reserva.pdf");
  } catch (error) {
    console.error("Error al generar el PDF:", error);
    window.alert("Ocurrió un error al generar el PDF: " + (error && error.message ? error.message : error));
  } finally {
    card.classList.remove("pdf-capture-mode");
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

/* Inicializar Boton*/
document.addEventListener("DOMContentLoaded", function () {
  const boton = document.getElementById("btnGenerarPdf");
  const form = document.getElementById("ficha-form");
  const card = document.querySelector(".ficha-card");

  if (!boton || !form || !card) {
    console.error("No se encontraron los elementos necesarios para generar el PDF (botón, formulario o tarjeta).");
    return;
  }

  boton.addEventListener("click", function () {
    generarPdf(boton, form, card);
  });
});