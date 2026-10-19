const SUPABASE_URL = "https://hcmxzjiqgpahwxwnxumx.supabase.co";
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

async function gestionarCliente(accion, id, datos = {}) {
  const { data, error } = await clienteSupabase.functions.invoke(
    "gestionar-cliente",
    {
      body: { accion, id, ...datos },
    },
  );

  if (error) {
    console.error("Error de gestionar-cliente:", error);
    throw new Error(
      data?.error || error.message || "No se pudo realizar la operación.",
    );
  }

  if (data?.error) throw new Error(data.error);

  return data;
}

async function cargarClientes() {
  if (!listaClientes) return;

  listaClientes.innerHTML =
    '<tr><td colspan="4">Cargando clientes...</td></tr>';

  try {
    const { data, error } = await clienteSupabase.functions.invoke(
      "listar-clientes",
      { body: {} },
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const clientes = data?.clientes || [];

    const total = document.getElementById("totalClientes");
    const activos = document.getElementById("clientesActivos");
    const inactivos = document.getElementById("clientesInactivos");

    if (total) total.textContent = clientes.length;
    if (activos) {
      activos.textContent = clientes.filter((c) => c.activo === true).length;
    }
    if (inactivos) {
      inactivos.textContent = clientes.filter((c) => c.activo !== true).length;
    }

    listaClientes.innerHTML = "";

    if (!clientes.length) {
      listaClientes.innerHTML =
        '<tr><td colspan="4">Todavía no hay clientes registrados.</td></tr>';
      return;
    }

    for (const cliente of clientes) {
      const fila = document.createElement("tr");

      const celdaNombre = document.createElement("td");
      celdaNombre.textContent = cliente.nombre || "Sin nombre";

      const celdaCorreo = document.createElement("td");
      celdaCorreo.textContent = cliente.email || "Sin correo";

      const celdaEstado = document.createElement("td");
      celdaEstado.textContent = cliente.activo ? "Activo" : "Inactivo";

      const celdaAcciones = document.createElement("td");
      celdaAcciones.className = "acciones-cliente";

      const botonEditar = crearBoton("Editar", "btn-editar", async () => {
        const nombre = prompt(
          "Nuevo nombre del cliente:",
          cliente.nombre || "",
        );
        if (nombre === null) return;

        const email = prompt("Nuevo correo del cliente:", cliente.email || "");
        if (email === null) return;

        if (!nombre.trim() || !email.trim()) {
          alert("El nombre y el correo son obligatorios.");
          return;
        }

        if (!confirm("¿Guardar los cambios de este cliente?")) return;

        await ejecutarAccion(async () => {
          await gestionarCliente("editar", cliente.id, {
            nombre: nombre.trim(),
            email: email.trim(),
          });
          mostrarMensaje("Cliente actualizado correctamente.");
          await cargarClientes();
        });
      });

      const botonEstado = crearBoton(
        cliente.activo ? "Desactivar" : "Activar",
        "btn-estado",
        async () => {
          const nuevoEstado = !cliente.activo;
          const accionTexto = nuevoEstado ? "activar" : "desactivar";

          if (
            !confirm(
              `¿Deseas ${accionTexto} a ${cliente.nombre || "este cliente"}?`,
            )
          ) {
            return;
          }

          await ejecutarAccion(async () => {
            await gestionarCliente("estado", cliente.id, {
              activo: nuevoEstado,
            });
            mostrarMensaje(
              nuevoEstado ? "Cliente activado." : "Cliente desactivado.",
            );
            await cargarClientes();
          });
        },
      );

      const botonContrasena = crearBoton(
        "Restablecer contraseña",
        "btn-contrasena",
        async () => {
          const password = prompt(
            "Escribe una contraseña temporal de al menos 8 caracteres para este cliente:",
          );

          if (password === null) return;

          if (password.length < 8) {
            alert("La contraseña debe tener al menos 8 caracteres.");
            return;
          }

          if (!confirm("¿Cambiar la contraseña de este cliente?")) return;

          await ejecutarAccion(async () => {
            await gestionarCliente("contrasena", cliente.id, { password });
            mostrarMensaje(
              "Contraseña restablecida. Comunícala al cliente de forma privada.",
            );
            alert(
              "Contraseña actualizada. Guárdala y compártela de forma privada.",
            );
          });
        },
      );

      const botonEliminar = crearBoton("Eliminar", "btn-eliminar", async () => {
        const confirmacion = prompt(
          `Para eliminar definitivamente a ${cliente.nombre || "este cliente"}, escribe ELIMINAR:`,
        );

        if (confirmacion !== "ELIMINAR") return;

        await ejecutarAccion(async () => {
          await gestionarCliente("eliminar", cliente.id);
          mostrarMensaje("Cliente eliminado correctamente.");
          await cargarClientes();
        });
      });

      celdaAcciones.append(
        botonEditar,
        botonEstado,
        botonContrasena,
        botonEliminar,
      );

      fila.append(celdaNombre, celdaCorreo, celdaEstado, celdaAcciones);

      listaClientes.appendChild(fila);
    }
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    listaClientes.innerHTML =
      '<tr><td colspan="4">No se pudieron cargar los clientes.</td></tr>';
    mostrarMensaje(
      error.message || "Error al cargar la lista de clientes.",
      true,
    );
  }
}

function crearBoton(texto, clase, accion) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.className = clase;

  boton.addEventListener("click", async () => {
    boton.disabled = true;
    try {
      await accion();
    } finally {
      boton.disabled = false;
    }
  });

  return boton;
}

async function ejecutarAccion(accion) {
  try {
    await accion();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message || "No se pudo completar la operación.", true);
    alert(error.message || "No se pudo completar la operación.");
  }
}

if (formulario) {
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const boton = formulario.querySelector(
      'button[type="submit"], input[type="submit"]',
    );

    if (boton) boton.disabled = true;

    const nombre = document.getElementById("nombreCliente")?.value.trim() || "";
    const email = document.getElementById("correoCliente")?.value.trim() || "";
    const password = document.getElementById("contrasenaCliente")?.value || "";

    const activo = document.getElementById("estadoCliente")?.value !== "false";

    if (!nombre || !email || password.length < 8) {
      mostrarMensaje(
        "Completa el nombre, el correo y una contraseña de al menos 8 caracteres.",
        true,
      );
      if (boton) boton.disabled = false;
      return;
    }

    try {
      mostrarMensaje("Creando cuenta del cliente...");

      const { data, error } = await clienteSupabase.functions.invoke(
        "crear-cliente",
        {
          body: { nombre, email, password, activo },
        },
      );

      if (error) {
        throw new Error(
          data?.error || error.message || "No se pudo crear el cliente.",
        );
      }

      if (data?.error) throw new Error(data.error);

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
  if (autorizado) await cargarClientes();
})();
