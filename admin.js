const SUPABASE_URL = "https://hcmxzjiqgpahwxwnxumx.supabase.co";
const SUPABASE_KEY = "sb_publishable_KmnL86_q_yPcMP687qqBlA_-EumI91u";

const clienteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
);

const formulario = document.getElementById("formCliente");
const mensaje = document.getElementById("mensajeAdmin");
const listaClientes = document.getElementById("listaClientes");

// Elementos de la ventana modal
const modal = document.getElementById("modalCliente");
const formularioModal = document.getElementById("formModalCliente");
const camposModal = document.getElementById("modalCampos");
const tituloModal = document.getElementById("modalTitulo");
const descripcionModal = document.getElementById("modalDescripcion");
const iconoModal = document.getElementById("modalIcono");
const mensajeModal = document.getElementById("modalMensaje");
const botonConfirmarModal = document.getElementById("modalConfirmar");
const botonCerrarModal = document.getElementById("modalCerrar");
const botonCancelarModal = document.getElementById("modalCancelar");

let accionModal = "";
let clienteModal = null;
let datosModal = {};

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

// Llamar a la función segura de Supabase
async function gestionarCliente(accion, id, datos = {}) {
  const { data, error } = await clienteSupabase.functions.invoke(
    "gestionar-cliente",
    {
      body: { accion, id, ...datos },
    },
  );

  if (error) {
    throw new Error(
      data?.error || error.message || "No se pudo realizar la operación.",
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// Crear campos dentro de la ventana
function crearCampoModal(id, etiqueta, tipo, valor = "") {
  const contenedor = document.createElement("div");
  contenedor.className = "modal-campo";

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = etiqueta;

  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = tipo;
  input.value = valor;
  input.required = true;

  if (tipo === "email") {
    input.autocomplete = "email";
  }

  if (tipo === "password") {
    input.autocomplete = "new-password";
    input.minLength = 8;
    input.placeholder = "Mínimo 8 caracteres";
  }

  contenedor.append(label, input);
  camposModal.appendChild(contenedor);

  return input;
}

// Abrir una ventana según la acción
function abrirModal(accion, cliente) {
  accionModal = accion;
  clienteModal = cliente;
  datosModal = {};

  formularioModal.reset();
  camposModal.innerHTML = "";
  mensajeModal.textContent = "";
  mensajeModal.style.color = "#dc2626";
  botonConfirmarModal.disabled = false;
  botonCancelarModal.disabled = false;
  botonCerrarModal.disabled = false;
  botonConfirmarModal.classList.remove("modal-btn-peligro");

  if (accion === "editar") {
    iconoModal.textContent = "✏️";
    tituloModal.textContent = "Editar cliente";
    descripcionModal.textContent =
      "Actualiza los datos de acceso de este cliente.";
    botonConfirmarModal.textContent = "Guardar cambios";

    crearCampoModal(
      "modalNombre",
      "Nombre completo",
      "text",
      cliente.nombre || "",
    );

    crearCampoModal(
      "modalCorreo",
      "Correo electrónico",
      "email",
      cliente.email || "",
    );
  }

  if (accion === "estado") {
    const activar = !cliente.activo;

    iconoModal.textContent = activar ? "✅" : "⏸️";
    tituloModal.textContent = activar
      ? "Activar cliente"
      : "Desactivar cliente";

    descripcionModal.textContent = activar
      ? `¿Quieres permitir que ${cliente.nombre} vuelva a ingresar al sistema?`
      : `¿Quieres impedir que ${cliente.nombre} ingrese al sistema?`;

    botonConfirmarModal.textContent = activar
      ? "Sí, activar cuenta"
      : "Sí, desactivar cuenta";

    if (!activar) {
      botonConfirmarModal.classList.add("modal-btn-peligro");
    }

    datosModal.activo = activar;
  }

  if (accion === "contrasena") {
    iconoModal.textContent = "🔐";
    tituloModal.textContent = "Restablecer contraseña";
    descripcionModal.textContent =
      "Establece una contraseña temporal nueva para este cliente.";

    botonConfirmarModal.textContent = "Cambiar contraseña";

    crearCampoModal("modalPassword", "Nueva contraseña temporal", "password");
  }

  if (accion === "eliminar") {
    iconoModal.textContent = "🗑️";
    tituloModal.textContent = "Eliminar cliente";
    descripcionModal.textContent = `Vas a eliminar la cuenta de ${cliente.nombre || cliente.email}. Esta acción no se puede deshacer.`;

    botonConfirmarModal.textContent = "Eliminar definitivamente";
    botonConfirmarModal.classList.add("modal-btn-peligro");

    const aviso = document.createElement("p");
    aviso.textContent =
      "La cuenta de acceso será eliminada. Revisa primero si existen datos asociados que deban conservarse.";
    aviso.style.color = "#b91c1c";
    aviso.style.fontSize = "13px";
    aviso.style.lineHeight = "1.6";
    camposModal.appendChild(aviso);

    const confirmacion = crearCampoModal(
      "modalConfirmacion",
      "Escribe ELIMINAR para confirmar",
      "text",
    );

    confirmacion.placeholder = "ELIMINAR";
    confirmacion.autocomplete = "off";
    datosModal.campoConfirmacion = true;
  }

  modal.classList.add("modal-abierto");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const primerCampo = camposModal.querySelector("input");
  if (primerCampo) primerCampo.focus();
  else botonConfirmarModal.focus();
}

function cerrarModal() {
  if (!modal || botonConfirmarModal.disabled) return;

  modal.classList.remove("modal-abierto");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  accionModal = "";
  clienteModal = null;
  datosModal = {};
}

botonCerrarModal.addEventListener("click", cerrarModal);
botonCancelarModal.addEventListener("click", cerrarModal);

modal.addEventListener("click", (evento) => {
  if (evento.target === modal) cerrarModal();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && modal.classList.contains("modal-abierto")) {
    cerrarModal();
  }
});

// Guardar la operación solicitada en la ventana
formularioModal.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!clienteModal || !accionModal) return;

  if (
    accionModal === "eliminar" &&
    document.getElementById("modalConfirmacion")?.value !== "ELIMINAR"
  ) {
    mensajeModal.textContent = "Escribe ELIMINAR exactamente para confirmar.";
    return;
  }

  const accion = accionModal;
  const cliente = clienteModal;
  const datos = { ...datosModal };

  if (accion === "editar") {
    datos.nombre = document.getElementById("modalNombre").value.trim();
    datos.email = document.getElementById("modalCorreo").value.trim();
  }

  if (accion === "contrasena") {
    datos.password = document.getElementById("modalPassword").value;
  }

  delete datos.campoConfirmacion;

  botonConfirmarModal.disabled = true;
  botonCancelarModal.disabled = true;
  botonCerrarModal.disabled = true;
  botonConfirmarModal.textContent = "Procesando...";
  mensajeModal.textContent = "";

  try {
    await gestionarCliente(accion, cliente.id, datos);

    const mensajes = {
      editar: "Cliente actualizado correctamente.",
      estado: datos.activo
        ? "Cliente activado correctamente."
        : "Cliente desactivado correctamente.",
      contrasena: "Contraseña restablecida correctamente.",
      eliminar: "Cliente eliminado correctamente.",
    };

    modal.classList.remove("modal-abierto");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    accionModal = "";
    clienteModal = null;
    datosModal = {};

    mostrarMensaje(mensajes[accion] || "Operación completada.");
    await cargarClientes();

    if (accion === "contrasena") {
      mostrarMensaje(
        "Contraseña actualizada. Comunícala al cliente de forma privada.",
      );
    }
  } catch (error) {
    console.error("Error al gestionar cliente:", error);

    mensajeModal.textContent =
      error.message || "No se pudo completar la operación.";

    botonConfirmarModal.disabled = false;
    botonCancelarModal.disabled = false;
    botonCerrarModal.disabled = false;

    const textos = {
      editar: "Guardar cambios",
      estado: datos.activo ? "Sí, activar cuenta" : "Sí, desactivar cuenta",
      contrasena: "Cambiar contraseña",
      eliminar: "Eliminar definitivamente",
    };

    botonConfirmarModal.textContent = textos[accion] || "Reintentar";
  }
});

// Crear botones de la tabla
function crearBoton(texto, clase, accion) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.className = clase;

  boton.addEventListener("click", accion);

  return boton;
}

// Cargar clientes y actualizar contadores
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

      const nombre = document.createElement("td");
      nombre.textContent = cliente.nombre || "Sin nombre";

      const correo = document.createElement("td");
      correo.textContent = cliente.email || "Sin correo";

      const estado = document.createElement("td");
      estado.textContent = cliente.activo ? "Activo" : "Inactivo";

      const acciones = document.createElement("td");
      acciones.className = "acciones-cliente";

      acciones.append(
        crearBoton("Editar", "btn-editar", () => abrirModal("editar", cliente)),
        crearBoton(
          cliente.activo ? "Desactivar" : "Activar",
          "btn-estado",
          () => abrirModal("estado", cliente),
        ),
        crearBoton("Restablecer contraseña", "btn-contrasena", () =>
          abrirModal("contrasena", cliente),
        ),
        crearBoton("Eliminar", "btn-eliminar", () =>
          abrirModal("eliminar", cliente),
        ),
      );

      fila.append(nombre, correo, estado, acciones);
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

// Registrar nuevos clientes
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

  if (autorizado) {
    await cargarClientes();
  }
})();
