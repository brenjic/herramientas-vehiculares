const SUPABASE_URL = "https://hcmxzjiqgpahwxwnxumx.supabase.co";

// Pega aquí la MISMA clave publicable que utilizas en login.js.
// Nunca pongas aquí tu clave secreta sb_secret_...
const SUPABASE_KEY = "sb_publishable_KmnL86_q_yPcMP687qqBlA_-EumI91u";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

const formulario = document.getElementById("formCliente");
const mensaje = document.getElementById("mensajeAdmin");
const listaClientes = document.getElementById("listaClientes");

function mostrarMensaje(texto, error = false) {
  if (!mensaje) return;

  mensaje.textContent = texto;
  mensaje.style.color = error ? "#dc2626" : "#15803d";
}

async function comprobarAdministrador() {
  const { data: sesionData, error: sesionError } =
    await clienteSupabase.auth.getSession();

  if (sesionError || !sesionData.session) {
    window.location.href = "login.html";
    return false;
  }

  const { data: usuarioData, error: usuarioError } =
    await clienteSupabase.auth.getUser();

  if (usuarioError || !usuarioData.user) {
    window.location.href = "login.html";
    return false;
  }

  const { data: perfil, error: perfilError } = await clienteSupabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", usuarioData.user.id)
    .single();

  if (
    perfilError ||
    perfil?.rol !== "administrador" ||
    perfil?.activo !== true
  ) {
    alert("No tienes permiso para entrar al panel de administrador.");
    await clienteSupabase.auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  return true;
}

async function cargarClientes() {
  if (!listaClientes) return;

  listaClientes.innerHTML =
    '<tr><td colspan="5">Cargando clientes...</td></tr>';

  try {
    const { data, error } = await clienteSupabase.functions.invoke(
      "listar-clientes",
      {
        body: {},
      },
    );

    if (error) {
      console.error("Error al consultar clientes:", error);
      throw new Error("No se pudo consultar la lista de clientes.");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const clientes = data?.clientes || [];

    const contadorTotal = document.getElementById("totalClientes");
    const contadorActivos = document.getElementById("clientesActivos");
    const contadorInactivos = document.getElementById("clientesInactivos");

    if (contadorTotal) contadorTotal.textContent = clientes.length;

    if (contadorActivos) {
      contadorActivos.textContent = clientes.filter(
        (c) => c.activo === true,
      ).length;
    }

    if (contadorInactivos) {
      contadorInactivos.textContent = clientes.filter(
        (c) => c.activo !== true,
      ).length;
    }

    listaClientes.innerHTML = "";

    if (clientes.length === 0) {
      listaClientes.innerHTML =
        '<tr><td colspan="5">Todavía no hay clientes registrados.</td></tr>';
      return;
    }

    for (const cliente of clientes) {
      const fila = document.createElement("tr");

      const nombre = document.createElement("td");
      nombre.textContent = cliente.nombre || "Sin nombre";

      const correo = document.createElement("td");
      correo.textContent = cliente.email || "Sin correo";

      const estado = document.createElement("td");
      estado.textContent = cliente.activo ? "Activo" : "Inactivo";

      const fecha = document.createElement("td");
      fecha.textContent = cliente.creado_en
        ? new Date(cliente.creado_en).toLocaleDateString("es-PE")
        : "—";

      const rol = document.createElement("td");
      rol.textContent = "Cliente";

      fila.append(nombre, correo, estado, fecha, rol);
      listaClientes.appendChild(fila);
    }
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    listaClientes.innerHTML =
      '<tr><td colspan="5">No se pudieron cargar los clientes.</td></tr>';

    mostrarMensaje(
      error.message || "Error al cargar la lista de clientes.",
      true,
    );
  }
}

if (formulario) {
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const boton = formulario.querySelector(
      'button[type="submit"], input[type="submit"]',
    );

    if (boton) boton.disabled = true;

    mostrarMensaje("Creando cuenta del cliente...");

    const nombre = document.getElementById("nombreCliente")?.value.trim() || "";

    const email = document.getElementById("correoCliente")?.value.trim() || "";

    const password = document.getElementById("contrasenaCliente")?.value || "";

    const activo =
      document.getElementById("estadoCliente")?.value !== "inactivo";

    if (!nombre || !email || password.length < 8) {
      mostrarMensaje(
        "Completa el nombre, el correo y una contraseña de al menos 8 caracteres.",
        true,
      );
      if (boton) boton.disabled = false;
      return;
    }

    try {
      const { data, error } = await clienteSupabase.functions.invoke(
        "crear-cliente",
        {
          body: {
            nombre,
            email,
            password,
            activo,
          },
        },
      );

      if (error) {
        console.error("Error de la función:", error);
        throw new Error(
          data?.error ||
            "No se pudo crear la cuenta. Revisa la consola del navegador.",
        );
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      mostrarMensaje("¡Cliente creado correctamente!");

      formulario.reset();

      await cargarClientes();
    } catch (error) {
      console.error(error);
      mostrarMensaje(
        error.message || "Ocurrió un error al crear el cliente.",
        true,
      );
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

const botonActualizar = document.getElementById("btnActualizar");

if (botonActualizar) {
  botonActualizar.addEventListener("click", cargarClientes);
}

const botonCerrarSesion = document.getElementById("btnCerrarSesion");

if (botonCerrarSesion) {
  botonCerrarSesion.addEventListener("click", async () => {
    await clienteSupabase.auth.signOut();
    window.location.href = "login.html";
  });
}

(async function iniciarPanel() {
  const autorizado = await comprobarAdministrador();

  if (autorizado) {
    await cargarClientes();
  }
})();
