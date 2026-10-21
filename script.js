(() => {
  "use strict";

  const TEMPLATE_URL =
    "https://sites.google.com/view/revisionvehicular7?usp=sharing";

  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const tableBody = $("rows");
  const searchInput = $("search");
  const importInput = $("importFile");

  const currency = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  });

  const numberFields = [
    "year",
    "km",
    "buy",
    "ask",
    "sale",
    "real",
    "repairs",
    "paperwork",
    "cleaning",
    "fuel",
    "storage",
    "sat",
    "atu",
    "sutran",
    "fines",
    "liens",
    "fees",
    "misc",
    "target",
    "soatCosto",
    "catCosto",
    "revisionCosto",
  ];

  const expenseFields = [
    "repairs",
    "paperwork",
    "cleaning",
    "fuel",
    "storage",
    "sat",
    "atu",
    "sutran",
    "fines",
    "liens",
    "fees",
    "misc",
  ];

  const documentFields = [
    { status: "soatEstado", cost: "soatCosto" },
    { status: "catEstado", cost: "catCosto" },
    { status: "revisionEstado", cost: "revisionCosto" },
  ];

  let currentUser = null;
  let operations = [];
  const selectedOperationIds = new Set();
  let loading = false;
  let temporizadorNotificacion;

  function money(value) {
    return currency.format(Number(value) || 0);
  }

  const priceFields = ["sellerAsk", "buy", "ask", "sale", "real", "target"];
  const originalPriceLabels = {};

  priceFields.forEach((id) => {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) originalPriceLabels[id] = label.textContent;
  });

  function updateCurrencyLabels(isUSD) {
    priceFields.forEach((id) => {
      const label = document.querySelector(`label[for="${id}"]`);
      if (!label || !originalPriceLabels[id]) return;

      label.textContent = isUSD
        ? originalPriceLabels[id].replace("(S/)", "(US$)")
        : originalPriceLabels[id];
    });

    $("exchangeRateBox").hidden = !isUSD;

    $("applyCurrency").textContent = isUSD
      ? "Aceptar y convertir a soles"
      : "Moneda configurada: soles (S/)";

    $("currencyMessage").textContent = isUSD
      ? "Introduce los precios en dólares y luego pulsa Aceptar para convertirlos a soles."
      : "Los precios se trabajan en soles.";
  }

  function convertPricesToSoles() {
    const mode = $("currencyMode").value;

    if (mode !== "USD") {
      $("currencyMessage").textContent =
        "La calculadora está trabajando en soles.";
      return;
    }

    const rate = Number($("exchangeRate").value);

    if (!Number.isFinite(rate) || rate <= 0) {
      alert("Introduce un tipo de cambio válido.");
      $("exchangeRate").focus();
      return;
    }

    priceFields.forEach((id) => {
      const input = $(id);
      if (!input) return;
      input.value = ((Number(input.value) || 0) * rate).toFixed(2);
    });

    $("currencyMode").value = "PEN";
    updateCurrencyLabels(false);
    calculate();

    $("currencyMessage").textContent =
      `Conversión aplicada: US$ 1 = S/ ${rate.toFixed(3)}. Los precios ahora están en soles.`;
  }

  $("currencyMode").addEventListener("change", () => {
    updateCurrencyLabels($("currencyMode").value === "USD");
  });

  $("applyCurrency").addEventListener("click", convertPricesToSoles);
  updateCurrencyLabels(false);

  function numberValue(id) {
    return Math.max(0, Number($(id)?.value) || 0);
  }

  function mostrarNotificacion(titulo, mensaje) {
    const notificacion = $("notificacion");

    if (!notificacion) {
      alert(mensaje);
      return;
    }

    $("notificacionTitulo").textContent = titulo;
    $("notificacionTexto").textContent = mensaje;
    notificacion.classList.add("visible");

    clearTimeout(temporizadorNotificacion);

    temporizadorNotificacion = setTimeout(() => {
      notificacion.classList.remove("visible");
    }, 3500);
  }

  function readForm() {
    const data = {};

    for (const element of form.elements) {
      if (!element.id || ["file", "submit", "button"].includes(element.type)) {
        continue;
      }

      data[element.id] = element.value;
    }

    for (const field of numberFields) {
      if (field in data) data[field] = Number(data[field]) || 0;
    }

    return data;
  }

  function documentExpenses(data) {
    const result = {};

    for (const field of documentFields) {
      const estado = String(data[field.status] || "");
      const costo = Math.max(0, Number(data[field.cost]) || 0);
      const debePagar = ["Vencido", "Vencida", "No tiene"].includes(estado);

      result[field.cost] = debePagar ? costo : 0;
    }

    // Evita sumar SOAT y CAT simultáneamente.
    if (result.soatCosto > 0 && result.catCosto > 0) {
      if (result.soatCosto >= result.catCosto) {
        result.catCosto = 0;
      } else {
        result.soatCosto = 0;
      }
    }

    return result;
  }

  function calculateForData(data) {
    const docs = documentExpenses(data);

    const regularExpenses = expenseFields.reduce(
      (total, field) => total + Math.max(0, Number(data[field]) || 0),
      0,
    );

    const documentTotal = Object.values(docs).reduce(
      (total, value) => total + value,
      0,
    );

    const expenses = regularExpenses + documentTotal;
    const investment = Math.max(0, Number(data.buy) || 0) + expenses;
    const estimatedSale = Math.max(0, Number(data.sale) || 0);
    const actualSale = Math.max(0, Number(data.real) || 0);
    const profit = estimatedSale - investment;
    const roi = investment > 0 ? (profit / investment) * 100 : 0;
    const targetPrice = investment + Math.max(0, Number(data.target) || 0);

    return {
      docs,
      expenses,
      investment,
      profit,
      roi,
      targetPrice,
      actualProfit: actualSale > 0 ? actualSale - investment : null,
    };
  }

  function calculate() {
    const data = readForm();
    const result = calculateForData(data);

    $("investment").textContent = money(result.investment);
    $("expenses").textContent = money(result.expenses);
    $("profit").textContent = money(result.profit);
    $("roi").textContent =
      result.investment > 0 ? `${result.roi.toFixed(2)}%` : "—";

    $("breakEven").textContent = money(result.investment);
    $("targetPrice").textContent = money(result.targetPrice);
    $("realProfit").textContent =
      result.actualProfit !== null ? money(result.actualProfit) : "Pendiente";

    $("profit").classList.toggle("negative", result.profit < 0);
    $("realProfit").classList.toggle(
      "negative",
      result.actualProfit !== null && result.actualProfit < 0,
    );
  }

  function toDatabase(data) {
    const gastos = {};

    for (const field of expenseFields) {
      gastos[field] = Number(data[field]) || 0;
    }

    for (const field of documentFields) {
      gastos[field.status] = data[field.status] || "Por verificar";
      gastos[field.cost] = Math.max(0, Number(data[field.cost]) || 0);
    }

    return {
      usuario_id: currentUser.id,
      modelo: String(data.vehicle || "").trim(),
      placa: String(data.plate || "").trim() || null,
      anio: Number(data.year) || null,
      kilometraje: Number(data.km) || null,
      estado: String(data.status || "").trim() || "Evaluando",
      precio_anuncio_vendedor: Number(data.sellerAsk) || 0,
      precio_compra: Number(data.buy) || 0,
      precio_publicado: Number(data.ask) || 0,
      precio_venta: Number(data.sale) || 0,
      precio_venta_real: Number(data.real) || 0,
      gastos,
      ganancia_objetivo: Number(data.target) || 0,
      notas: String(data.notes || "").trim() || null,
    };
  }

  function fromDatabase(row) {
    const gastos = row.gastos || {};

    const data = {
      vehicle: row.modelo || "",
      plate: row.placa || "",
      year: row.anio ?? "",
      km: row.kilometraje ?? "",
      status: row.estado || "Evaluando",
      sellerAsk: Number(row.precio_anuncio_vendedor) || 0,
      buy: Number(row.precio_compra) || 0,
      ask: Number(row.precio_publicado) || 0,
      sale: Number(row.precio_venta) || 0,
      real: Number(row.precio_venta_real) || 0,
      target: Number(row.ganancia_objetivo) || 0,
      notes: row.notas || "",
      soatEstado: gastos.soatEstado || "Por verificar",
      soatCosto: Number(gastos.soatCosto) || 100,
      catEstado: gastos.catEstado || "No corresponde",
      catCosto: Number(gastos.catCosto) || 100,
      revisionEstado: gastos.revisionEstado || "Por verificar",
      revisionCosto: Number(gastos.revisionCosto) || 90,
    };

    for (const field of expenseFields) {
      data[field] = Number(gastos[field]) || 0;
    }

    return { id: row.id, savedAt: row.creado_en, data };
  }

  async function loadOperations() {
    const { data, error } = await supabaseClient
      .from("operaciones")
      .select("*")
      .order("creado_en", { ascending: false });

    if (error) throw error;

    operations = (data || []).map(fromDatabase);

    // Quita de la selección los registros que ya no existen.
    const idsExistentes = new Set(operations.map((operation) => operation.id));

    for (const id of selectedOperationIds) {
      if (!idsExistentes.has(id)) selectedOperationIds.delete(id);
    }
  }

  function operationSummary(data) {
    const result = calculateForData(data);
    return { investment: result.investment, profit: result.profit };
  }

  // Genera un único PDF con una o varias operaciones.

  function exportarOperacionesPDF(lista, nombreArchivo) {
    if (!lista.length) {
      alert("No hay operaciones para exportar.");
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert(
        "No se pudo cargar la herramienta para generar PDF. Recarga la página.",
      );
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 14;
    const vino = [100, 27, 40];
    const gris = [95, 95, 95];
    let y = 0;

    function dinero(valor) {
      return (
        "S/ " +
        (Number(valor) || 0).toLocaleString("es-PE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }

    function nuevaPaginaSiHaceFalta(altura = 12) {
      if (y + altura > alto - 16) {
        pdf.addPage();
        y = 20;
      }
    }

    function encabezadoSeccion(texto) {
      nuevaPaginaSiHaceFalta(16);
      pdf.setFillColor(...vino);
      pdf.roundedRect(margen, y - 5, ancho - margen * 2, 9, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(texto, margen + 4, y + 1);
      pdf.setTextColor(40, 40, 40);
      y += 12;
    }

    function fila(etiqueta, valor, destacado = false) {
      const texto = String(valor ?? "No indicado");
      const lineas = pdf.splitTextToSize(texto, ancho - margen * 2 - 65);
      const altura = Math.max(7, lineas.length * 5 + 2);

      nuevaPaginaSiHaceFalta(altura);

      if (destacado) {
        pdf.setFillColor(248, 243, 244);
        pdf.roundedRect(
          margen,
          y - 4,
          ancho - margen * 2,
          altura,
          1.5,
          1.5,
          "F",
        );
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...gris);
      pdf.text(etiqueta, margen + 3, y);

      pdf.setFont("helvetica", destacado ? "bold" : "normal");
      pdf.setTextColor(40, 40, 40);
      pdf.text(lineas, margen + 65, y);

      y += altura;
    }

    function tarjeta(x, titulo, valor, anchoTarjeta) {
      pdf.setFillColor(248, 243, 244);
      pdf.roundedRect(x, y, anchoTarjeta, 22, 3, 3, "F");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...gris);
      pdf.text(titulo, x + 4, y + 7);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...vino);

      const valorLineas = pdf.splitTextToSize(String(valor), anchoTarjeta - 8);
      pdf.text(valorLineas, x + 4, y + 15);
    }

    function tituloVehiculo(texto, numero) {
      nuevaPaginaSiHaceFalta(24);
      pdf.setFillColor(100, 27, 40);
      pdf.roundedRect(margen, y, ancho - margen * 2, 15, 3, 3, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${numero}. ${texto}`, margen + 5, y + 9);

      y += 22;
      pdf.setTextColor(40, 40, 40);
    }

    // Portada y encabezado del informe
    pdf.setFillColor(...vino);
    pdf.rect(0, 0, ancho, 43, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text("HERRAMIENTAS VEHICULARES", margen, 17);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("INFORME DE COMPRA Y REVENTA", margen, 26);

    pdf.setFontSize(8);
    pdf.text("Generado: " + new Date().toLocaleString("es-PE"), margen, 35);

    y = 54;
    pdf.setTextColor(40, 40, 40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Resumen del reporte", margen, y);
    y += 8;

    const resultados = lista.map((operacion) => ({
      operacion,
      resultado: calculateForData(operacion.data),
    }));

    const inversionTotal = resultados.reduce(
      (suma, item) => suma + item.resultado.investment,
      0,
    );
    const gastosTotal = resultados.reduce(
      (suma, item) => suma + item.resultado.expenses,
      0,
    );
    const gananciaTotal = resultados.reduce(
      (suma, item) => suma + item.resultado.profit,
      0,
    );

    const roiTotal =
      inversionTotal > 0
        ? ((gananciaTotal / inversionTotal) * 100).toFixed(2) + "%"
        : "No disponible";

    const espacio = 3;
    const anchoTarjeta = (ancho - margen * 2 - espacio * 3) / 4;

    tarjeta(margen, "OPERACIONES", String(lista.length), anchoTarjeta);
    tarjeta(
      margen + anchoTarjeta + espacio,
      "INVERSIÓN TOTAL",
      dinero(inversionTotal),
      anchoTarjeta,
    );
    tarjeta(
      margen + (anchoTarjeta + espacio) * 2,
      "GASTOS",
      dinero(gastosTotal),
      anchoTarjeta,
    );
    tarjeta(
      margen + (anchoTarjeta + espacio) * 3,
      "GANANCIA EST.",
      dinero(gananciaTotal),
      anchoTarjeta,
    );

    y += 30;
    fila("Rentabilidad global estimada (ROI)", roiTotal, true);
    y += 7;

    // Fichas detalladas de cada operación
    resultados.forEach(({ operacion, resultado }, indice) => {
      const data = operacion.data;

      if (indice > 0) {
        pdf.addPage();
        y = 20;
      }

      tituloVehiculo(
        `${data.vehicle || "Vehículo sin nombre"} | Placa: ${data.plate || "No indicada"}`,
        indice + 1,
      );

      encabezadoSeccion("01. DATOS DEL VEHÍCULO");
      fila("Placa", data.plate || "No indicada");
      fila("Año", data.year || "No indicado");
      fila(
        "Kilometraje",
        data.km
          ? Number(data.km).toLocaleString("es-PE") + " km"
          : "No indicado",
      );
      fila("Estado", data.status || "No indicado");

      encabezadoSeccion("02. PRECIOS");
      fila("Precio del anuncio original", dinero(data.sellerAsk));
      fila("Precio de compra", dinero(data.buy));
      fila("Precio de publicación", dinero(data.ask));
      fila("Precio de venta estimado", dinero(data.sale), true);
      fila(
        "Precio de venta real",
        Number(data.real) > 0 ? dinero(data.real) : "Pendiente",
      );

      encabezadoSeccion("03. DOCUMENTACIÓN Y SEGUROS");
      fila("Estado SOAT", data.soatEstado || "No indicado");
      fila("Costo SOAT considerado", dinero(resultado.docs.soatCosto));
      fila("Estado CAT", data.catEstado || "No indicado");
      fila("Costo CAT considerado", dinero(resultado.docs.catCosto));
      fila("Revisión técnica", data.revisionEstado || "No indicada");
      fila(
        "Costo de revisión considerado",
        dinero(resultado.docs.revisionCosto),
      );

      encabezadoSeccion("04. DESGLOSE DE GASTOS");
      expenseFields.forEach((campo) => fila(campo, dinero(data[campo])));

      encabezadoSeccion("05. RESULTADO FINANCIERO");
      fila("Total de gastos", dinero(resultado.expenses));
      fila("Inversión total", dinero(resultado.investment), true);
      fila("Punto de equilibrio", dinero(resultado.investment));
      fila("Ganancia objetivo", dinero(data.target));
      fila("Precio para ganancia objetivo", dinero(resultado.targetPrice));
      fila("Ganancia estimada", dinero(resultado.profit), true);
      fila(
        "Rentabilidad (ROI)",
        resultado.investment > 0
          ? resultado.roi.toFixed(2) + "%"
          : "No disponible",
      );
      fila(
        "Ganancia real",
        resultado.actualProfit !== null
          ? dinero(resultado.actualProfit)
          : "Pendiente",
      );

      if (data.notes) {
        encabezadoSeccion("06. OBSERVACIONES");
        fila("Notas", data.notes);
      }
    });

    // Numeración de páginas
    const totalPaginas = pdf.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      pdf.setPage(pagina);
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margen, alto - 12, ancho - margen, alto - 12);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Herramientas Vehiculares", margen, alto - 7);
      pdf.text(
        `Página ${pagina} de ${totalPaginas}`,
        ancho - margen,
        alto - 7,
        { align: "right" },
      );
    }

    pdf.save(nombreArchivo);
  }

  function makeCell(value) {
    const td = document.createElement("td");
    td.textContent = value ?? "";
    return td;
  }

  function fillForm(data) {
    for (const [key, value] of Object.entries(data)) {
      const element = $(key);
      if (element && element.type !== "file") element.value = value ?? "";
    }

    actualizarVisibilidadCostos();
  }

  function renderTable() {
    const query = (searchInput.value || "").trim().toLowerCase();
    tableBody.replaceChildren();

    const filtered = operations.filter((operation) => {
      const vehicle = String(operation.data.vehicle || "").toLowerCase();
      const plate = String(operation.data.plate || "").toLowerCase();
      return vehicle.includes(query) || plate.includes(query);
    });

    if (!filtered.length) {
      const tr = document.createElement("tr");
      const td = makeCell(
        query
          ? "No se encontraron coincidencias."
          : "Todavía no hay operaciones guardadas.",
      );
      td.colSpan = 7;
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    for (const operation of filtered) {
      const data = operation.data;
      const summary = operationSummary(data);
      const tr = document.createElement("tr");

      // Casilla para seleccionar esta operación.
      const selectionCell = document.createElement("td");
      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.checked = selectedOperationIds.has(operation.id);
      checkbox.setAttribute(
        "aria-label",
        `Seleccionar ${data.vehicle || "vehículo"} ${data.plate || ""}`,
      );

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedOperationIds.add(operation.id);
        } else {
          selectedOperationIds.delete(operation.id);
        }
      });

      selectionCell.appendChild(checkbox);
      tr.appendChild(selectionCell);

      tr.appendChild(makeCell(data.vehicle || "Sin nombre"));
      tr.appendChild(makeCell(data.plate || "Sin placa"));
      tr.appendChild(makeCell(money(data.buy)));
      tr.appendChild(makeCell(money(summary.investment)));
      tr.appendChild(makeCell(money(summary.profit)));

      const actions = document.createElement("td");

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.textContent = "Cargar";
      loadButton.addEventListener("click", () => {
        fillForm(data);
        calculate();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      // Descargar solamente esta operación.
      const pdfButton = document.createElement("button");
      pdfButton.type = "button";
      pdfButton.textContent = "PDF";
      pdfButton.title = "Exportar esta operación a PDF";
      pdfButton.addEventListener("click", () => {
        const placa = String(data.plate || "sin-placa").replace(
          /[^a-zA-Z0-9_-]/g,
          "",
        );

        exportarOperacionesPDF([operation], `operacion_${placa}.pdf`);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Eliminar";

      deleteButton.addEventListener("click", async () => {
        const modal = $("modalEliminar");
        const cancelar = $("cancelarEliminar");
        const confirmar = $("confirmarEliminar");

        $("textoEliminar").textContent =
          `Se eliminará "${data.vehicle || "Sin nombre"}" (${data.plate || "Sin placa"}). Esta acción no se puede deshacer.`;

        modal.classList.add("visible");

        const confirmado = await new Promise((resolve) => {
          const cerrar = (respuesta) => {
            modal.classList.remove("visible");
            confirmar.removeEventListener("click", aceptar);
            cancelar.removeEventListener("click", rechazar);
            modal.removeEventListener("click", fuera);
            document.removeEventListener("keydown", teclaEscape);
            resolve(respuesta);
          };

          const aceptar = () => cerrar(true);
          const rechazar = () => cerrar(false);
          const fuera = (event) => {
            if (event.target === modal) rechazar();
          };
          const teclaEscape = (event) => {
            if (event.key === "Escape") rechazar();
          };

          confirmar.addEventListener("click", aceptar);
          cancelar.addEventListener("click", rechazar);
          modal.addEventListener("click", fuera);
          document.addEventListener("keydown", teclaEscape);
        });

        if (!confirmado) return;

        deleteButton.disabled = true;

        const { error } = await supabaseClient
          .from("operaciones")
          .delete()
          .eq("id", operation.id);

        if (error) {
          console.error(error);
          mostrarNotificacion(
            "No se pudo eliminar",
            "Ocurrió un error al eliminar la operación.",
          );
          deleteButton.disabled = false;
          return;
        }

        selectedOperationIds.delete(operation.id);

        try {
          await loadOperations();
          renderTable();
          mostrarNotificacion(
            "¡Operación eliminada!",
            "La operación se eliminó correctamente de tu historial.",
          );
        } catch (err) {
          console.error(err);
          mostrarNotificacion(
            "Operación eliminada",
            "Se eliminó, pero no se pudo actualizar el historial.",
          );
        }
      });

      actions.append(loadButton, pdfButton, deleteButton);
      tr.appendChild(actions);
      tableBody.appendChild(tr);
    }
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function actualizarVisibilidadCostos() {
    const documentos = [
      { estado: "soatEstado", contenedor: "soatCostoContenedor" },
      { estado: "catEstado", contenedor: "catCostoContenedor" },
      { estado: "revisionEstado", contenedor: "revisionCostoContenedor" },
    ];

    for (const documento of documentos) {
      const seleccion = $(documento.estado);
      const contenedor = $(documento.contenedor);
      if (!seleccion || !contenedor) continue;

      const mostrar = ["Vencido", "Vencida", "No tiene"].includes(
        seleccion.value,
      );
      contenedor.style.display = mostrar ? "" : "none";
    }
  }

  form.addEventListener("input", calculate);

  form.addEventListener("change", () => {
    actualizarVisibilidadCostos();
    calculate();
  });

  actualizarVisibilidadCostos();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || loading) return;

    const data = readForm();

    if (!String(data.vehicle || "").trim()) {
      alert("Escribe el nombre o modelo del vehículo.");
      $("vehicle").focus();
      return;
    }

    loading = true;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const { error } = await supabaseClient
        .from("operaciones")
        .insert(toDatabase(data));

      if (error) throw error;

      await loadOperations();
      renderTable();

      mostrarNotificacion(
        "¡Operación guardada!",
        "Tu operación se guardó correctamente en tu cuenta.",
      );

      form.reset();
      actualizarVisibilidadCostos();
      calculate();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert(
        "No se pudo guardar la operación. Comprueba la conexión y la configuración de Supabase.",
      );
    } finally {
      loading = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  $("clear").addEventListener("click", () => {
    if (
      !window.confirm("¿Limpiar el formulario? El historial no se eliminará.")
    ) {
      return;
    }

    form.reset();
    actualizarVisibilidadCostos();
    calculate();
  });

  searchInput.addEventListener("input", renderTable);

  // Descargar únicamente las operaciones seleccionadas.
  const pdfSelectedButton = $("pdfSelected");

  if (pdfSelectedButton) {
    pdfSelectedButton.addEventListener("click", () => {
      const selected = operations.filter((operation) =>
        selectedOperationIds.has(operation.id),
      );

      if (!selected.length) {
        alert("Marca al menos una operación del historial para descargarla.");
        return;
      }

      exportarOperacionesPDF(selected, "operaciones_seleccionadas.pdf");
    });
  }

  // Descargar todas las operaciones en un único PDF.
  const pdfAllButton = $("pdfAll");

  if (pdfAllButton) {
    pdfAllButton.addEventListener("click", () => {
      exportarOperacionesPDF(operations, "historial_completo_vehicular.pdf");
    });
  }

  $("csv").addEventListener("click", () => {
    if (!operations.length) {
      alert("No hay operaciones para exportar.");
      return;
    }

    const columns = [
      ["vehicle", "Vehículo"],
      ["plate", "Placa"],
      ["year", "Año"],
      ["km", "Kilometraje"],
      ["status", "Estado de operación"],
      ["sellerAsk", "Precio del anuncio original"],
      ["buy", "Mi precio de compra"],
      ["ask", "Mi precio de publicación"],
      ["sale", "Precio de venta estimado"],
      ["real", "Precio de venta real"],
      ...expenseFields.map((field) => [field, field]),
      ["soatEstado", "Estado SOAT"],
      ["soatCosto", "Costo estimado SOAT"],
      ["catEstado", "Estado CAT"],
      ["catCosto", "Costo estimado CAT"],
      ["revisionEstado", "Estado revisión técnica"],
      ["revisionCosto", "Costo revisión técnica"],
      ["target", "Ganancia objetivo"],
      ["notes", "Notas"],
    ];

    const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = [
      columns.map((column) => csvCell(column[1])).join(","),
      ...operations.map((operation) =>
        columns.map(([key]) => csvCell(operation.data[key])).join(","),
      ),
    ];

    downloadFile(
      "\uFEFF" + lines.join("\r\n"),
      "operaciones_vehiculares.csv",
      "text/csv;charset=utf-8;",
    );
  });

  $("backup").addEventListener("click", () => {
    downloadFile(
      JSON.stringify(operations, null, 2),
      "respaldo_vehicular.json",
      "application/json;charset=utf-8;",
    );
  });

  $("import").addEventListener("click", () => importInput.click());

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      if (!Array.isArray(parsed)) {
        throw new Error("El archivo debe contener una lista de operaciones.");
      }

      const valid = parsed.every(
        (item) =>
          item &&
          typeof item === "object" &&
          item.data &&
          typeof item.data === "object",
      );

      if (!valid) throw new Error("El archivo no tiene el formato esperado.");

      if (
        !window.confirm(
          `Se intentarán importar ${parsed.length} operaciones a tu cuenta. ¿Continuar?`,
        )
      ) {
        return;
      }

      for (const item of parsed) {
        const data = item.data;
        if (!String(data.vehicle || "").trim()) continue;

        const { error } = await supabaseClient
          .from("operaciones")
          .insert(toDatabase(data));

        if (error) throw error;
      }

      await loadOperations();
      renderTable();
      alert("Importación completada.");
    } catch (error) {
      console.error("Error al importar:", error);
      alert(`No se pudo completar la importación: ${error.message}`);

      try {
        await loadOperations();
        renderTable();
      } catch (reloadError) {
        console.error(reloadError);
      }
    } finally {
      importInput.value = "";
    }
  });

  const templateLink = $("templateLink");

  if (templateLink) {
    templateLink.href = TEMPLATE_URL;
    templateLink.target = "_blank";
    templateLink.rel = "noopener noreferrer";
  }

  async function initialize() {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        window.location.replace("login.html");
        return;
      }

      currentUser = data.session.user;
      await loadOperations();
      renderTable();
      calculate();
    } catch (error) {
      console.error("Error al iniciar la calculadora:", error);
      alert("No se pudo conectar con Supabase. Revisa tu configuración.");
    }
  }

  calculate();
  initialize();
})();

/* =========================================
   MODO CLARO Y MODO OSCURO
   ========================================= */

const themeButton = document.getElementById("toggleTheme");

function aplicarTema(tema) {
  const modoOscuro = tema === "dark";

  document.documentElement.classList.toggle("dark-mode", modoOscuro);

  if (!themeButton) return;

  themeButton.innerHTML = modoOscuro
    ? "☀️ <span>Modo claro</span>"
    : "🌙 <span>Modo oscuro</span>";

  themeButton.setAttribute(
    "aria-label",
    modoOscuro ? "Activar modo claro" : "Activar modo oscuro",
  );

  localStorage.setItem("temaCalculadora", tema);
}

const temaGuardado = localStorage.getItem("temaCalculadora") || "light";
aplicarTema(temaGuardado);

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const estaOscuro = document.documentElement.classList.contains("dark-mode");
    aplicarTema(estaOscuro ? "light" : "dark");
  });
}
