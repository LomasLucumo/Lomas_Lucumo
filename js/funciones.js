
/*Inicialización*/
function safeInit(nombre, fn) {
  try {
    fn();
  } catch (error) {
    console.error("Error al inicializar '" + nombre + "':", error);
  }
}

/*Suma Personas*/
function initTotalPersonas() {
  const campos = ["numAdultos", "numProfesores", "numNinos", "numEscolares"];
  const total = document.getElementById("totalPersonas");
  if (!total) return;

  function recalcular() {
    let suma = 0;
    campos.forEach(function (id) {
      const el = document.getElementById(id);
      const val = el ? parseInt(el.value, 10) : 0;
      suma += isNaN(val) ? 0 : val;
    });
    total.value = suma;
  }

  campos.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", recalcular);
  });

  recalcular();
}

/*Firma Vista Previa*/
function initFirmaPreview() {
  const input = document.getElementById("firmaConformidad");
  const preview = document.getElementById("firmaPreview");
  if (!input || !preview) return;

  input.addEventListener("change", function () {
    const file = input.files && input.files[0];
    if (!file) {
      preview.hidden = true;
      preview.src = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
}

/*Limpiar Campos*/
function initResetHandler() {
  const form = document.getElementById("ficha-form");
  if (!form) return;

  form.addEventListener("reset", function () {
    setTimeout(function () {
      limpiarMarcasInvalidas(form);
      const preview = document.getElementById("firmaPreview");
      if (preview) preview.hidden = true;
      const total = document.getElementById("totalPersonas");
      if (total) total.value = 0;
      const horaManana = document.getElementById("horaManana");
      if (horaManana) horaManana.value = "08:30";
      const horaTarde = document.getElementById("horaTarde");
      if (horaTarde) horaTarde.value = "13:00";
    }, 0);
  });
}

/*Limpiar casillas*/
function limpiarMarcasInvalidas(form) {
  form.querySelectorAll(".campo-invalido").forEach(function (el) {
    el.classList.remove("campo-invalido");
  });
}

function marcarInvalido(campo) {
  if (campo && campo.classList) campo.classList.add("campo-invalido");
}

function labelDe(campo) {
  const contenedor = campo.closest(".row") || campo.closest("div");
  if (contenedor) {
    const label = contenedor.querySelector("label.form-label");
    if (label) return label.textContent.trim();
  }
  return campo.name || campo.id || "Campo";
}

function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/*Inicializar funciones*/
document.addEventListener("DOMContentLoaded", function () {
  safeInit("totalPersonas", initTotalPersonas);
  safeInit("firmaPreview", initFirmaPreview);
  safeInit("resetHandler", initResetHandler);
});