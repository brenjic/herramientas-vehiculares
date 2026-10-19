const SUPABASE_URL = "https://hcmxzjiqgpahwxwnxumx.supabase.co";

const SUPABASE_KEY = "sb_publishable_KmnL86_q_yPcMP687qqBlA_-EumI91u";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

let rolSeleccionado = "cliente";

const botonesRol = document.querySelectorAll(".rol");
const formulario = document.getElementById("formLogin");
const correoInput = document.getElementById("correo");
const contrasenaInput = document.getElementById("contrasena");
const botonIngresar = document.getElementById("btnIngresar");
const mensaje = document.getElementById("mensaje");
const botonVerContrasena = document.getElementById("btnVerContrasena");
const enlaceRecuperar = document.getElementById("enlaceRecuperar");

// Cambiar entre Cliente y Administrador
botonesRol.forEach((boton) => {
  boton.addEventListener("click", () => {
    rolSeleccionado = boton.dataset.rol;

    botonesRol.forEach((otroBoton) => {
      otroBoton.classList.remove("activo");
    });

    boton.classList.add("activo");
    actualizarTextoBoton();

    mensaje.textContent = "";
    mensaje.className = "mensaje";
  });
});

// Actualizar el texto del botón
function actualizarTextoBoton() {
  botonIngresar.textContent =
    rolSeleccionado === "admin"
      ? "Ingresar como administrador"
      : "Ingresar como cliente";
}

// Mostrar mensajes
function mostrarMensaje(texto, tipo = "error") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

// Mostrar u ocultar contraseña
if (botonVerContrasena) {
  botonVerContrasena.addEventListener("click", () => {
    const mostrar = contrasenaInput.type === "password";

    contrasenaInput.type = mostrar ? "text" : "password";

    botonVerContrasena.textContent = mostrar ? "🙈" : "👁️";

    botonVerContrasena.setAttribute(
      "aria-label",
      mostrar ? "Ocultar contraseña" : "Mostrar contraseña",
    );

    botonVerContrasena.setAttribute("aria-pressed", String(mostrar));
  });
}

// Recuperar contraseña por correo electrónico
if (enlaceRecuperar) {
  enlaceRecuperar.addEventListener("click", async (evento) => {
    evento.preventDefault();

    const correo = correoInput.value.trim();

    if (!correo) {
      mostrarMensaje(
        "Escribe tu correo electrónico en el campo de arriba para recibir el enlace de recuperación.",
      );
      correoInput.focus();
      return;
    }

    if (!correoInput.checkValidity()) {
      mostrarMensaje("Escribe un correo electrónico válido.");
      correoInput.focus();
      return;
    }

    enlaceRecuperar.style.pointerEvents = "none";
    mostrarMensaje("Enviando solicitud de recuperación...", "exito");

    try {
      const { error } = await clienteSupabase.auth.resetPasswordForEmail(
        correo,
        {
          redirectTo:
            "https://brenjic.github.io/herramientas-vehiculares/restablecer-contrasena.html",
        },
      );

      if (error) {
        console.error("Error al solicitar recuperación:", error);
        throw new Error(error.message);
      }

      mostrarMensaje(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.",
        "exito",
      );
    } catch (error) {
      mostrarMensaje(error.message);
    } finally {
      enlaceRecuperar.style.pointerEvents = "";
    }
  });
}

// Iniciar sesión
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const correo = correoInput.value.trim();
  const contrasena = contrasenaInput.value;

  botonIngresar.disabled = true;
  botonIngresar.textContent = "Verificando acceso...";

  mostrarMensaje("Comprobando tus datos...", "exito");

  try {
    // Comprobar correo y contraseña
    const { data, error } = await clienteSupabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) {
      console.error("Error real de Supabase:", error.message);
      throw new Error(error.message);
    }

    // Buscar el perfil
    const { data: perfil, error: errorPerfil } = await clienteSupabase
      .from("perfiles")
      .select("rol, activo")
      .eq("id", data.user.id)
      .single();

    if (errorPerfil || !perfil) {
      await clienteSupabase.auth.signOut();

      throw new Error(
        "No se encontró el perfil de esta cuenta en la tabla perfiles.",
      );
    }

    // Comprobar si la cuenta está activa
    if (perfil.activo !== true) {
      await clienteSupabase.auth.signOut();

      throw new Error(
        "Esta cuenta está desactivada. Contacta al administrador.",
      );
    }

    // Comprobar el rol seleccionado
    const rolEsperado =
      rolSeleccionado === "admin" ? "administrador" : "cliente";

    if (perfil.rol !== rolEsperado) {
      await clienteSupabase.auth.signOut();

      if (rolSeleccionado === "admin") {
        throw new Error("Esta cuenta no tiene permisos de administrador.");
      } else {
        throw new Error("Esta cuenta no está registrada como cliente.");
      }
    }

    // Redirigir según el rol
    mostrarMensaje("Acceso correcto. Abriendo el panel...", "exito");

    if (perfil.rol === "administrador") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "calculadora.html";
    }
  } catch (error) {
    mostrarMensaje(error.message);
    console.error("Error de inicio de sesión:", error);
  } finally {
    botonIngresar.disabled = false;
    actualizarTextoBoton();
  }
});

// Texto inicial
actualizarTextoBoton();
