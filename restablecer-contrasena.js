const SUPABASE_URL = "https://hcmxzjiqgpahwxwnxumx.supabase.co";

const SUPABASE_KEY = "sb_publishable_KmnL86_q_yPcMP687qqBlA_-EumI91u";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

const formulario = document.getElementById("formRestablecer");
const nuevaContrasena = document.getElementById("nuevaContrasena");
const confirmarContrasena = document.getElementById("confirmarContrasena");
const botonGuardar = document.getElementById("btnGuardarContrasena");
const mensaje = document.getElementById("mensajeRestablecer");

// Mostrar mensajes
function mostrarMensaje(texto, tipo = "error") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

// Mostrar u ocultar las contraseñas
document.querySelectorAll(".btn-ver-contrasena").forEach((boton) => {
  boton.addEventListener("click", () => {
    const campo = document.getElementById(boton.dataset.campo);

    if (!campo) return;

    const mostrar = campo.type === "password";

    campo.type = mostrar ? "text" : "password";
    boton.textContent = mostrar ? "🙈" : "👁️";
    boton.setAttribute(
      "aria-label",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña",
    );
    boton.setAttribute("aria-pressed", String(mostrar));
  });
});

// Comprobar que exista una sesión de recuperación válida
let sesionComprobada = false;

async function comprobarSesion() {
  const { data, error } = await clienteSupabase.auth.getSession();

  if (error || !data.session) {
    mostrarMensaje(
      "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde el inicio de sesión.",
    );
    botonGuardar.disabled = true;
    return;
  }

  sesionComprobada = true;
}

clienteSupabase.auth.onAuthStateChange((evento) => {
  if (evento === "PASSWORD_RECOVERY") {
    sesionComprobada = true;
    botonGuardar.disabled = false;
    mostrarMensaje(
      "Enlace validado. Puedes crear tu nueva contraseña.",
      "exito",
    );
  }
});

comprobarSesion();

// Guardar la nueva contraseña
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!sesionComprobada) {
    await comprobarSesion();

    if (!sesionComprobada) return;
  }

  const nueva = nuevaContrasena.value;
  const confirmar = confirmarContrasena.value;

  if (nueva.length < 8) {
    mostrarMensaje("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (nueva !== confirmar) {
    mostrarMensaje("Las contraseñas no coinciden.");
    confirmarContrasena.focus();
    return;
  }

  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando contraseña...";

  try {
    const { error } = await clienteSupabase.auth.updateUser({
      password: nueva,
    });

    if (error) {
      throw error;
    }

    await clienteSupabase.auth.signOut();

    mostrarMensaje(
      "¡Contraseña actualizada! Ahora puedes iniciar sesión con tu nueva contraseña.",
      "exito",
    );

    formulario.reset();

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2500);
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);

    mostrarMensaje(
      error.message ||
        "No se pudo cambiar la contraseña. Solicita un enlace nuevo.",
    );
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar nueva contraseña";
  }
});
