(() => {
  "use strict";

  const TEMPLATE_URL =
    "https://sites.google.com/view/revisionvehicular7?usp=sharing";

  const $ = (id) => document.getElementById(id);

  const form = $("form");

  //*&#x20;Organizar las secciones de rentabilidad*

  const seccionCompraVenta = document.querySelector(".panel-compra-venta");

  const seccionGastos = [...form.querySelectorAll("section")].find(
    (seccion) =>
      seccion.querySelector("h2")?.textContent.trim() === "Gastos del vehículo",
  );

  if (seccionCompraVenta && seccionGastos) {
    //*&#x20;Mostrar primero los gastos y debajo compra y venta*

    seccionGastos.after(seccionCompraVenta);

    //*&#x20;Cambiar el título de gastos*
  }

  //*&#x20;Cambiar el nombre de la pestaña*

  const pestañaGastos = document.querySelector(
    '.calculator-tab[data-tab="gastos"]',
  );

  if (pestañaGastos) {
    pestañaGastos.textContent = "Tu RENTABILIDAD";
  }

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

    "modelYear",

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

    "soatCosto",

    "catCosto",

    "revisionCosto",
  ];

  const expenseFields = [
    "notary", // Notaría
    "mechanic", // Mecánico
    "filterCost", // Filtro vehicular
    "fuel", // Gasolina
    "bodywork", // Planchado
    "misc", // Otros

    // Gastos adicionales que ya tenía tu calculadora
    "repairs",
    "paperwork",
    "cleaning",
    "storage",
    "sat",
    "atu",
    "sutran",
    "fines",
    "liens",
    "fees",
  ];
  const documentFields = [
    { status: "soatEstado", cost: "soatCosto" },

    { status: "catEstado", cost: "catCosto" },

    { status: "revisionEstado", cost: "revisionCosto" },
  ];

  let currentUser = null;
  let sessionVersion = null;
  let sessionCheckInterval = null;

  let operations = [];

  const selectedOperationIds = new Set();

  let loading = false;

  let temporizadorNotificacion;

  function money(value) {
    return currency.format(Number(value) || 0);
  }

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

    //**&#x20;Evita sumar SOAT y CAT simultáneamente.**

    if (result.soatCosto > 0 && result.catCosto > 0) {
      if (result.soatCosto >= result.catCosto) {
        result.catCosto = 0;
      } else {
        result.soatCosto = 0;
      }
    }

    return result;
  }
  const filterDebtFields = [
    "deuda-sat-lima",
    "deuda-sutran",
    "deuda-callao",
    "deuda-atu",
    "deuda-infogas",
    "deuda-cuzco",
    "deuda-pucallpa",
    "deuda-huanuco",
    "deuda-tarapoto",
    "deuda-trujillo",
    "deuda-cajamarca",
    "deuda-arequipa",
    "deuda-huancayo",
    "deuda-andahuaylas",
    "deuda-ica",
    "deuda-chachapoyas",
    "deuda-tacna",
    "deuda-chiclayo",
    "deuda-piura",
  ];

  function calculateForData(data) {
    const docs = documentExpenses(data);

    const regularExpenses = expenseFields.reduce(
      (total, field) => total + Math.max(0, Number(data[field]) || 0),
      0,
    );

    const filterDebts = filterDebtFields.reduce(
      (total, field) => total + Math.max(0, Number(data[field]) || 0),
      0,
    );

    const documentTotal = Object.values(docs).reduce(
      (total, value) => total + value,
      0,
    );

    const expenses = regularExpenses + filterDebts + documentTotal;

    const buy = Math.max(0, Number(data.buy) || 0);
    const investment = buy + expenses;

    const filtroPrice = Math.max(0, Number(data.marketFiltro) || 0);
    const marketplacePrice = Math.max(0, Number(data.marketMarketplace) || 0);

    const marketAverage =
      filtroPrice > 0 && marketplacePrice > 0
        ? (filtroPrice + marketplacePrice) / 2
        : 0;

    // Si no se escribe un precio real, se usa el promedio del mercado.
    const actualSale = Math.max(0, Number(data.real) || 0);

    const estimatedSale =
      actualSale > 0
        ? actualSale
        : marketAverage || Math.max(0, Number(data.sale) || 0);

    // La ganancia estimada se ajusta al precio real cuando se ingresa.
    const profit = estimatedSale - investment;
    const roi = investment > 0 ? (profit / investment) * 100 : 0;

    return {
      docs,
      regularExpenses,
      filterDebts,
      documentTotal,
      expenses,
      investment,
      marketAverage,
      estimatedSale,
      profit,
      roi,
      scenarioLow: estimatedSale * 0.9 - investment,
      scenarioMid: estimatedSale - investment,
      scenarioHigh: estimatedSale * 1.1 - investment,

      // Ganancia real solo cuando se ha escrito un precio de venta real.
      actualProfit: actualSale > 0 ? actualSale - investment : null,
    };
  }

  function calculate() {
    const data = readForm();
    const result = calculateForData(data);
    const investment = $("investment");
    const expenses = $("expenses");
    const profit = $("profit");
    const roi = $("roi");
    const breakEven = $("breakEven");
    const realProfit = $("realProfit");
    if (investment) investment.textContent = money(result.investment);
    if (expenses) expenses.textContent = money(result.expenses);
    if (profit) {
      profit.textContent = money(result.profit);
      profit.classList.toggle("negative", result.profit < 0);
    }
    if (roi)
      roi.textContent =
        result.investment > 0 ? `${result.roi.toFixed(2)}%` : "—";
    if (breakEven) breakEven.textContent = money(result.investment);
    if (realProfit) {
      realProfit.textContent =
        result.actualProfit !== null ? money(result.actualProfit) : "Pendiente";
      realProfit.classList.toggle(
        "negative",
        result.actualProfit !== null && result.actualProfit < 0,
      );
    }
    const expenseTotalAuto = $("expenseTotalAuto");
    const gastoTotalVista = $("gastoTotalVista");
    const marketAverageDisplay = $("marketAverageDisplay");
    const rentabilidadMonto = $("rentabilidadMonto");
    const rentabilidadPorcentaje = $("rentabilidadPorcentaje");
    if (expenseTotalAuto) expenseTotalAuto.textContent = money(result.expenses);
    if (gastoTotalVista) gastoTotalVista.textContent = money(result.investment);
    if (marketAverageDisplay) {
      marketAverageDisplay.textContent =
        result.marketAverage > 0
          ? money(result.marketAverage)
          : "Ingresa ambos precios";
    }
    if (rentabilidadMonto) {
      rentabilidadMonto.textContent =
        result.estimatedSale > 0 ? money(result.profit) : "—";

      rentabilidadMonto.classList.toggle("negative", result.profit < 0);
    }
    if (rentabilidadPorcentaje) {
      rentabilidadPorcentaje.textContent =
        result.estimatedSale > 0 && result.investment > 0
          ? `${result.roi.toFixed(2)}%`
          : "—";

      rentabilidadPorcentaje.classList.toggle("negative", result.roi < 0);
    }
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

    for (const field of [
      "make",
      "version",
      "modelYear",
      "color",
      "transmission",
      "fuelType",
      "location",
      "multasEstado",
      "gravamenEstado",
      "satEstado",
      "atuEstado",
      "sutranEstado",
      "marketFiltro",
      "marketMarketplace",
      ...filterDebtFields,
    ]) {
      gastos[field] = [
        "marketFiltro",
        "marketMarketplace",
        ...filterDebtFields,
      ].includes(field)
        ? Math.max(0, Number(data[field]) || 0)
        : (data[field] ?? "");
    }

    return {
      usuario_id: currentUser.id,

      modelo: String(data.vehicle || "").trim(),

      placa:
        String(data.plate || "")
          .trim()
          .toUpperCase() || null,

      anio: Number(data.year) || null,

      kilometraje: Number(data.km) || null,

      estado: String(data.status || "").trim() || "Evaluando",

      precio_anuncio_vendedor: Number(data.sellerAsk) || 0,

      precio_compra: Number(data.buy) || 0,

      precio_publicado: Number(data.ask) || 0,

      precio_venta:
        Number(data.marketFiltro) > 0 && Number(data.marketMarketplace) > 0
          ? (Number(data.marketFiltro) + Number(data.marketMarketplace)) / 2
          : Number(data.sale) || 0,

      precio_venta_real: Number(data.real) || 0,

      gastos,

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

      notes: row.notas || "",

      soatEstado: gastos.soatEstado || "Por verificar",

      soatCosto: Number(gastos.soatCosto ?? 0),

      catEstado: gastos.catEstado || "No corresponde",

      catCosto: Number(gastos.catCosto ?? 0),

      revisionEstado: gastos.revisionEstado || "Por verificar",

      revisionCosto: Number(gastos.revisionCosto ?? 0),

      make: gastos.make || "",

      version: gastos.version || "",

      modelYear: gastos.modelYear ?? "",

      color: gastos.color || "",

      transmission: gastos.transmission || "",

      fuelType: gastos.fuelType || "",

      location: gastos.location || "",

      multasEstado: gastos.multasEstado || "Por verificar",

      gravamenEstado: gastos.gravamenEstado || "Por verificar",

      satEstado: gastos.satEstado || "Por verificar",

      atuEstado: gastos.atuEstado || "Por verificar",

      sutranEstado: gastos.sutranEstado || "Por verificar",
      marketFiltro: Number(gastos.marketFiltro) || 0,
      marketMarketplace: Number(gastos.marketMarketplace) || 0,
    };

    for (const field of expenseFields) data[field] = Number(gastos[field]) || 0;
    for (const field of filterDebtFields)
      data[field] = Number(gastos[field]) || 0;

    return { id: row.id, savedAt: row.creado_en, data };
  }

  async function loadOperations() {
    const { data, error } = await supabaseClient

      .from("operaciones")

      .select("*")

      .order("creado_en", { ascending: false });

    if (error) throw error;

    operations = (data || []).map(fromDatabase);

    //**&#x20;Quita de la selección los registros que ya no existen.**

    const idsExistentes = new Set(operations.map((operation) => operation.id));

    for (const id of selectedOperationIds) {
      if (!idsExistentes.has(id)) selectedOperationIds.delete(id);
    }
  }

  function operationSummary(data) {
    const result = calculateForData(data);

    return { investment: result.investment, profit: result.profit };
  }

  //**&#x20;Genera un único PDF con una o varias operaciones.**

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

    //**&#x20;Portada y encabezado del informe**

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

    //**&#x20;Fichas detalladas de cada operación**

    resultados.forEach(({ operacion, resultado }, indice) => {
      const data = operacion.data;

      if (indice > 0) {
        pdf.addPage();

        y = 20;
      }

      tituloVehiculo(
        `${data.make ? data.make + " " : ""}${data.vehicle || "Vehículo sin nombre"} | Placa: ${data.plate || "No indicada"}`,

        indice + 1,
      );

      encabezadoSeccion("01. DATOS DEL VEHÍCULO");

      fila("Marca", data.make || "No indicada");

      fila("Modelo", data.vehicle || "No indicado");

      fila("Versión", data.version || "No indicada");

      fila("Placa", data.plate || "No indicada");

      fila("Año de fabricación", data.year || "No indicado");

      fila("Año modelo", data.modelYear || "No indicado");

      fila("Color", data.color || "No indicado");

      fila("Transmisión", data.transmission || "No indicada");

      fila("Combustible", data.fuelType || "No indicado");

      fila("Ubicación", data.location || "No indicada");

      fila(
        "Kilometraje",

        data.km
          ? Number(data.km).toLocaleString("es-PE") + " km"
          : "No indicado",
      );

      fila("Estado", data.status || "No indicado");

      encabezadoSeccion("02. PRECIOS");

      fila("Precio publicado por el vendedor", dinero(data.sellerAsk));

      fila("Tu oferta", dinero(data.buy));

      fila(
        "Precio de mercado según Filtro Vehicular",
        dinero(data.marketFiltro),
      );
      fila(
        "Precio de mercado según Marketplace",
        dinero(data.marketMarketplace),
      );
      fila(
        "Precio de mercado promedio",
        resultado.marketAverage > 0
          ? dinero(resultado.marketAverage)
          : "No indicado",
        true,
      );

      fila(
        "GASTO TOTAL (oferta + gastos + filtro)",
        dinero(resultado.investment),
        true,
      );
      fila(
        "Ganancia estimada según mercado",
        resultado.marketAverage > 0 ? dinero(resultado.profit) : "No calculada",
        true,
      );

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

      fila("Multas / papeletas", data.multasEstado || "Por verificar");

      fila("Gravámenes / cargas", data.gravamenEstado || "Por verificar");

      fila("Consulta SAT", data.satEstado || "Por verificar");

      fila("Consulta ATU", data.atuEstado || "Por verificar");

      fila("Consulta SUTRAN", data.sutranEstado || "Por verificar");

      encabezadoSeccion("04. DESGLOSE DE GASTOS");

      expenseFields.forEach((campo) => fila(campo, dinero(data[campo])));

      encabezadoSeccion("05. RESULTADO FINANCIERO");

      fila("Total de gastos y deudas", dinero(resultado.expenses));
      fila(
        "Total de deudas ingresadas en el filtro",
        dinero(resultado.filterDebts),
      );

      fila("Inversión total", dinero(resultado.investment), true);

      fila("Punto de equilibrio", dinero(resultado.investment));

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

    //**&#x20;Numeración de páginas**

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

    actualizarModelos();

    actualizarUsoAnual();

    actualizarVisibilidadCostos();

    renderVehicleSummary();
  }

  function renderTable() {
    const query = (searchInput.value || "").trim().toLowerCase();

    tableBody.replaceChildren();

    const normalizarBusqueda = (texto) =>
      String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const busqueda = normalizarBusqueda(query);

    const filtered = operations.filter((operation) => {
      const data = operation.data;

      const camposBusqueda = [
        data.vehicle,
        data.plate,
        data.make,
        data.version,
        data.modelYear,
        data.year,
      ];

      return camposBusqueda.some((campo) =>
        normalizarBusqueda(campo).includes(busqueda),
      );
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

      //**&#x20;Casilla para seleccionar esta operación.**

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

      tr.appendChild(
        makeCell(
          `${data.make ? data.make + " " : ""}${data.vehicle || "Sin nombre"}`,
        ),
      );

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

      //**&#x20;Descargar solamente esta operación.**

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

  const modelosPorMarca = {
    Toyota: [
      "Corolla",

      "Yaris",

      "Hilux",

      "RAV4",

      "Avanza",

      "Etios",

      "Rush",

      "Fortuner",

      "Prius",
    ],

    Hyundai: [
      "Accent",

      "Elantra",

      "Tucson",

      "Santa Fe",

      "Creta",

      "i10",

      "i20",

      "Kona",
    ],

    Kia: [
      "Rio",

      "Sportage",

      "Cerato",

      "Picanto",

      "Sorento",

      "Seltos",

      "Soluto",
    ],

    Nissan: [
      "Sentra",

      "Versa",

      "X-Trail",

      "Qashqai",

      "Kicks",

      "Navara",

      "March",
    ],

    Chevrolet: ["Spark", "Sail", "Cruze", "Tracker", "Captiva", "Onix", "N300"],

    Suzuki: [
      "Swift",

      "SX-4",

      "Vitara",

      "Grand Vitara",

      "Celerio",

      "S-Presso",

      "Jimny",
    ],

    Honda: ["Civic", "CR-V", "HR-V", "City", "Fit"],

    Mazda: ["Mazda 2", "Mazda 3", "CX-3", "CX-5", "BT-50"],

    Mitsubishi: ["Lancer", "Outlander", "ASX", "L200", "Montero"],

    Volkswagen: ["Gol", "Polo", "Jetta", "Tiguan", "Amarok"],

    Ford: ["Fiesta", "Focus", "EcoSport", "Escape", "Ranger"],

    BMW: ["Serie 1", "Serie 3", "Serie 5", "X1", "X3", "X5"],

    "Mercedes-Benz": ["Clase A", "Clase C", "Clase E", "GLA", "GLC"],

    Audi: ["A1", "A3", "A4", "Q3", "Q5"],

    Jeep: ["Renegade", "Compass", "Cherokee", "Wrangler"],

    Renault: ["Logan", "Sandero", "Duster", "Kwid", "Stepway"],

    Peugeot: ["208", "301", "2008", "3008", "Partner"],

    Subaru: ["Impreza", "Forester", "XV", "Outback"],

    Chery: ["Tiggo 2", "Tiggo 4", "Tiggo 7", "Arrizo 5"],

    JAC: ["S2", "S3", "T6", "JS2", "JS4"],

    BYD: ["Dolphin", "Yuan", "Song", "Seagull"],

    Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  };

  function actualizarModelos() {
    const marca = $("make")?.value?.trim();

    const lista = $("modelosVehiculos");

    if (!lista) return;

    lista.replaceChildren();

    for (const modelo of modelosPorMarca[marca] || []) {
      const opcion = document.createElement("option");

      opcion.value = modelo;

      lista.appendChild(opcion);
    }
  }

  function actualizarUsoAnual() {
    const year = Number($("year")?.value) || 0;

    const km = Number($("km")?.value) || 0;

    const value = $("annualUseValue");

    const help = $("annualUseHelp");

    if (!value || !help) return;

    const currentYear = new Date().getFullYear();

    const age = currentYear - year;

    if (year < 1900 || year > currentYear || km <= 0 || age < 1) {
      value.textContent =
        "Completa un año de fabricación válido y un kilometraje mayor que cero.";

      help.textContent =
        "Es una referencia aproximada y no determina el estado mecánico.";

      return;
    }

    const average = km / age;

    const level =
      average < 12000 ? "Bajo" : average <= 20000 ? "Medio" : "Alto";

    value.textContent = `${Math.round(average).toLocaleString("es-PE")} km por año · Uso ${level.toLowerCase()}`;

    help.textContent = `Cálculo aproximado: ${km.toLocaleString("es-PE")} km ÷ ${age} años. Este rango es orientativo y no determina el estado mecánico.`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,

      (character) =>
        ({
          "&": "&amp;",

          "<": "&lt;",

          ">": "&gt;",

          '"': "&quot;",

          "'": "&#39;",
        })[character],
    );
  }

  function renderVehicleSummary() {
    const data = readForm();

    const summary = $("vehicleSummary");

    const filter = $("filterSummary");

    const expenses = $("expenseSummary");

    if (!summary || !filter || !expenses) return;

    const item = (label, value) =>
      `<div class="summary-item"><span>${label}</span><strong>${escapeHTML(value || "No indicado")}</strong></div>`;

    summary.innerHTML = `<h3>Datos del vehículo</h3><div class="summary-grid">

      ${item("Marca", data.make)}${item("Modelo", data.vehicle)}${item("Versión", data.version)}

      ${item("Placa", data.plate)}${item("Año fabricación", data.year)}${item("Año modelo", data.modelYear)}

      ${item("Kilometraje", data.km ? Number(data.km).toLocaleString("es-PE") + " km" : "")}

      ${item("Color", data.color)}${item("Transmisión", data.transmission)}${item("Combustible", data.fuelType)}

      ${item("Ubicación", data.location)}${item("Estado operación", data.status)}</div>`;

    const deudaTotal = $("satTotalSum")?.textContent || "S/ 0.00";

    filter.innerHTML = `<h3>Filtro del vehículo</h3>

  <div class="summary-grid">

    ${item("Deuda total", deudaTotal)}

    ${item("Propietarios anteriores", data.duenosAnteriores)}

    ${item("Gravámenes", data.gravamenEstado)}

    ${item("Orden de captura policial", data.ordenCaptura)}

    ${item("Orden de captura por infracción", data.ordenCapturaInfraccion)}

  </div>`;

    const result = calculateForData(data);

    expenses.innerHTML = `<h3>Tu RENTABILIDAD</h3>
  <div class="summary-grid">
    ${item("Precio publicado por el vendedor", money(data.sellerAsk))}
    ${item("Tu oferta", money(data.buy))}
    ${item("Total de gastos y deudas", money(result.expenses))}
    ${item("GASTO TOTAL", money(result.investment))}
    ${item("Precio Filtro Vehicular", money(data.marketFiltro))}
    ${item("Precio Marketplace", money(data.marketMarketplace))}
    ${item("Precio de mercado promedio", result.marketAverage > 0 ? money(result.marketAverage) : "Ingresa ambos precios")}
    ${item("Ganancia estimada", result.marketAverage > 0 ? money(result.profit) : "—")}
    ${item("Rentabilidad (ROI)", result.marketAverage > 0 && result.investment > 0 ? result.roi.toFixed(2) + "%" : "—")}
    ${item("Precio de venta real", Number(data.real) > 0 ? money(data.real) : "Pendiente")}
  </div>`;
  }

  function activarPestana(tab) {
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== tab;
    });

    document.querySelectorAll(".calculator-tab").forEach((button) => {
      const active = button.dataset.tab === tab;

      button.classList.toggle("active", active);

      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    if (tab === "resultado") {
      calculate();

      renderVehicleSummary();
    }
  }

  document.querySelectorAll(".calculator-tab").forEach((button) => {
    button.addEventListener("click", () => activarPestana(button.dataset.tab));
  });

  $("make")?.addEventListener("input", actualizarModelos);

  $("make")?.addEventListener("change", actualizarModelos);

  $("year")?.addEventListener("input", actualizarUsoAnual);

  $("km")?.addEventListener("input", actualizarUsoAnual);

  // Convertir automáticamente la placa a mayúsculas.
  const campoPlaca = $("plate");

  if (campoPlaca) {
    campoPlaca.addEventListener("input", () => {
      const inicio = campoPlaca.selectionStart;
      const fin = campoPlaca.selectionEnd;

      campoPlaca.value = campoPlaca.value.toUpperCase();

      // Mantener la posición del cursor mientras escribe.
      campoPlaca.setSelectionRange(inicio, fin);
    });
  }

  actualizarModelos();

  actualizarUsoAnual();

  activarPestana("datos");

  form.addEventListener("input", () => {
    calculate();

    actualizarUsoAnual();

    if (!document.querySelector('[data-tab-panel="resultado"]')?.hidden)
      renderVehicleSummary();
  });

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
      alert("Completa el modelo del vehículo.");

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

  //**&#x20;Descargar únicamente las operaciones seleccionadas.**

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

  //**&#x20;Descargar todas las operaciones en un único PDF.**

  const pdfAllButton = $("pdfAll");

  if (pdfAllButton) {
    pdfAllButton.addEventListener("click", () => {
      exportarOperacionesPDF(operations, "historial_completo_vehicular.pdf");
    });
  }

  const pdfCurrentButton = $("pdfCurrent");

  if (pdfCurrentButton) {
    pdfCurrentButton.addEventListener("click", () => {
      exportarOperacionesPDF(
        [{ data: readForm(), savedAt: new Date().toISOString() }],

        "resultado_actual_vehicular.pdf",
      );
    });
  }

  const goToExpensesButton = $("goToExpenses");

  if (goToExpensesButton) {
    goToExpensesButton.addEventListener("click", () =>
      activarPestana("gastos"),
    );
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

      ["multasEstado", "Filtro multas"],

      ["gravamenEstado", "Filtro gravámenes"],

      ["satEstado", "Filtro SAT"],

      ["atuEstado", "Filtro ATU"],

      ["sutranEstado", "Filtro SUTRAN"],

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

      // Consultar si la cuenta está activa y obtener la versión de sesión.
      const { data: perfil, error: errorPerfil } = await supabaseClient
        .from("perfiles")
        .select("activo, session_version")
        .eq("id", currentUser.id)
        .single();

      if (errorPerfil || !perfil) {
        console.error("No se pudo verificar el perfil:", errorPerfil);
        await supabaseClient.auth.signOut();
        alert("No se pudo verificar tu cuenta. Inicia sesión nuevamente.");
        window.location.replace("login.html");
        return;
      }

      if (perfil.activo !== true) {
        await supabaseClient.auth.signOut();
        alert("Tu cuenta está desactivada. Contacta al administrador.");
        window.location.replace("login.html");
        return;
      }

      sessionVersion = perfil.session_version;

      await loadOperations();
      renderTable();
      calculate();

      // Revisar el estado de la cuenta cada 10 segundos.
      if (sessionCheckInterval !== null) {
        clearInterval(sessionCheckInterval);
      }

      sessionCheckInterval = setInterval(() => {
        checkSessionStatus().catch((error) => {
          console.error("Error al comprobar la sesión:", error);
        });
      }, 10000);
    } catch (error) {
      console.error("Error al iniciar la calculadora:", error);
      alert("No se pudo conectar con Supabase. Revisa tu configuración.");
    }
  }

  async function checkSessionStatus() {
    if (!currentUser || sessionVersion === null) return;

    const { data: perfil, error } = await supabaseClient
      .from("perfiles")
      .select("activo, session_version")
      .eq("id", currentUser.id)
      .single();

    // Si hay un error de conexión, se intentará nuevamente.
    if (error || !perfil) {
      console.error("No se pudo verificar el estado de la cuenta:", error);
      return;
    }

    const cuentaDesactivada = perfil.activo !== true;
    const versionCambiada = perfil.session_version !== sessionVersion;

    if (cuentaDesactivada || versionCambiada) {
      if (sessionCheckInterval !== null) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
      }

      currentUser = null;
      sessionVersion = null;

      await supabaseClient.auth.signOut();

      alert(
        cuentaDesactivada
          ? "Tu cuenta ha sido desactivada. Contacta al administrador."
          : "Tu contraseña ha sido cambiada por el administrador. Inicia sesión nuevamente con tu nueva contraseña.",
      );

      window.location.replace("login.html");
    }
  }

  calculate();

  initialize();
})();

/***&#x20;=========================================**



**&#xA0;  MODO CLARO Y MODO OSCURO**



**&#xA0;  =========================================&#x20;***/

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

//*&#x20;--- SINCRONIZACIÓN Y SUMA AUTOMÁTICA DE DEUDAS SAT Y ENTIDADES ---*

//*&#x20;--- TOTAL DE DEUDAS DEL FILTRO VEHICULAR ---*

const satInputIds = [
  "deuda-sat-lima",

  "deuda-sutran",

  "deuda-callao",

  "deuda-atu",

  "deuda-infogas",

  "deuda-cuzco",

  "deuda-pucallpa",

  "deuda-huanuco",

  "deuda-tarapoto",

  "deuda-trujillo",

  "deuda-cajamarca",

  "deuda-arequipa",

  "deuda-huancayo",

  "deuda-andahuaylas",

  "deuda-ica",

  "deuda-chachapoyas",

  "deuda-tacna",

  "deuda-chiclayo",

  "deuda-piura",
];

function actualizarTotalSat() {
  let sumaSat = 0;

  //*&#x20;Sumar deudas de SAT y demás entidades.*

  satInputIds.forEach((id) => {
    const el = document.getElementById(id);

    if (el) {
      sumaSat += Math.max(0, Number(el.value) || 0);
    }
  });

  // Documentos pendientes: aplicar las mismas reglas que usa el cálculo de rentabilidad.
  const estadoRevision = document.getElementById("revisionEstado")?.value;
  const costoRevision = Math.max(
    0,
    Number(document.getElementById("revisionCosto")?.value) || 0,
  );
  if (["Vencida", "No tiene"].includes(estadoRevision))
    sumaSat += costoRevision;

  const estadoSoat = document.getElementById("soatEstado")?.value;
  const costoSoat = Math.max(
    0,
    Number(document.getElementById("soatCosto")?.value) || 0,
  );
  const soatAplicable = ["Vencido", "No tiene"].includes(estadoSoat)
    ? costoSoat
    : 0;

  const estadoCat = document.getElementById("catEstado")?.value;
  const costoCat = Math.max(
    0,
    Number(document.getElementById("catCosto")?.value) || 0,
  );
  const catAplicable = ["Vencido", "No tiene"].includes(estadoCat)
    ? costoCat
    : 0;
  // Si aparecen SOAT y CAT al mismo tiempo, cuenta solo el costo mayor para evitar duplicarlos.
  sumaSat +=
    soatAplicable > 0 && catAplicable > 0
      ? Math.max(soatAplicable, catAplicable)
      : soatAplicable + catAplicable;

  //*&#x20;Actualizar el total visible.*

  const totalDisplay = document.getElementById("satTotalSum");

  if (totalDisplay) {
    totalDisplay.textContent = `S/ ${sumaSat.toLocaleString("es-PE", {
      minimumFractionDigits: 2,

      maximumFractionDigits: 2,
    })}`;
  }

  //*&#x20;Actualizar el resumen del filtro si corresponde.*

  if (
    !document.querySelector('[data-tab-panel="resultado"]')?.hidden &&
    typeof renderVehicleSummary === "function"
  ) {
    renderVehicleSummary();
  }
}

//*&#x20;Actualizar al modificar cualquier deuda o documento.*

document.addEventListener("input", (e) => {
  if (
    satInputIds.includes(e.target.id) ||
    [
      "revisionEstado",

      "revisionCosto",

      "soatEstado",

      "soatCosto",

      "catEstado",

      "catCosto",
    ].includes(e.target.id)
  ) {
    actualizarTotalSat();
  }
});

document.addEventListener("change", (e) => {
  if (
    satInputIds.includes(e.target.id) ||
    [
      "revisionEstado",

      "revisionCosto",

      "soatEstado",

      "soatCosto",

      "catEstado",

      "catCosto",
    ].includes(e.target.id)
  ) {
    actualizarTotalSat();
  }
});

//*&#x20;Calcular el total inicial.*

actualizarTotalSat();

//*&#x20;Ejecutar suma inicial apenas cargue la página*

document.addEventListener("DOMContentLoaded", actualizarTotalSat);

window.addEventListener("load", actualizarTotalSat);

setTimeout(actualizarTotalSat, 300);

/* ==========================================
   SUMA AUTOMÁTICA DE DEUDAS Y GASTOS
   ========================================== */

function actualizarTotalesVehiculares() {
  const obtenerValor = (id) => {
    const elemento = document.getElementById(id);
    if (!elemento) return 0;

    const valor = Number(elemento.value);
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  };

  const soles = (valor) =>
    "S/ " +
    valor.toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // 1. Sumar automáticamente todas las deudas por entidad.
  const camposDeuda = document.querySelectorAll(
    ".sat-card input[type='number']",
  );

  let totalDeudas = 0;

  camposDeuda.forEach((campo) => {
    const valor = Number(campo.value);
    if (Number.isFinite(valor) && valor > 0) {
      totalDeudas += valor;
    }
  });

  const vistaDeudas = document.getElementById("satTotalSum");
  if (vistaDeudas) {
    vistaDeudas.textContent = soles(totalDeudas);
  }

  // 2. Sumar los seis gastos de la operación.
  const gastos = [
    "notary",
    "mechanic",
    "filterCost",
    "fuel",
    "bodywork",
    "misc",
  ];

  let totalGastos = 0;

  gastos.forEach((id) => {
    totalGastos += obtenerValor(id);
  });

  // 3. Agregar costos de documentos pendientes aplicables.
  const documentosPendientes = [
    {
      estado: "revisionEstado",
      costo: "revisionCosto",
      pendientes: ["Vencida", "No tiene"],
    },
    {
      estado: "soatEstado",
      costo: "soatCosto",
      pendientes: ["Vencido", "No tiene"],
    },
    {
      estado: "catEstado",
      costo: "catCosto",
      pendientes: ["Vencido", "No tiene"],
    },
  ];

  documentosPendientes.forEach((documento) => {
    const estado = document.getElementById(documento.estado);
    const contenedor = document.getElementById(documento.costo + "Contenedor");

    if (estado && contenedor && documento.pendientes.includes(estado.value)) {
      totalGastos += obtenerValor(documento.costo);
    }
  });

  // 4. Total general de gastos: incluye las deudas una sola vez.
  totalGastos += totalDeudas;

  const vistaGastos = document.getElementById("expenseTotalAuto");
  if (vistaGastos) {
    vistaGastos.textContent = soles(totalGastos);
  }

  // 5. Gasto total: oferta de compra + todos los gastos.
  const oferta = obtenerValor("buy");
  const gastoTotal = oferta + totalGastos;

  const vistaTotal = document.getElementById("gastoTotalVista");
  if (vistaTotal) {
    vistaTotal.textContent = soles(gastoTotal);
  }

  // Actualizar resultados estimados de rentabilidad.
  const mercadoFiltro = obtenerValor("marketFiltro");
  const mercadoMarketplace = obtenerValor("marketMarketplace");

  const preciosMercado = [mercadoFiltro, mercadoMarketplace].filter(
    (precio) => precio > 0,
  );

  const promedio = preciosMercado.length
    ? preciosMercado.reduce((suma, precio) => suma + precio, 0) /
      preciosMercado.length
    : 0;

  const vistaPromedio = document.getElementById("marketAverageDisplay");
  if (vistaPromedio) {
    vistaPromedio.textContent =
      preciosMercado.length === 2
        ? soles(promedio)
        : preciosMercado.length === 1
          ? soles(promedio) + " (precio disponible)"
          : "Ingresa al menos un precio";
  }

  const precioReal = obtenerValor("real");
  const precioUsado = precioReal > 0 ? precioReal : promedio;
  const gananciaEstimada = precioUsado - gastoTotal;
  const vistaGanancia = document.getElementById("rentabilidadMonto");

  if (vistaGanancia) {
    vistaGanancia.textContent = soles(gananciaEstimada);
  }

  const vistaROI = document.getElementById("rentabilidadPorcentaje");

  if (vistaROI) {
    vistaROI.textContent =
      gastoTotal > 0
        ? ((gananciaEstimada / gastoTotal) * 100).toLocaleString("es-PE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) + "%"
        : "—";
  }
}

// Recalcular al escribir, seleccionar o modificar un importe.
const formularioVehicular = document.getElementById("form");

if (formularioVehicular) {
  formularioVehicular.addEventListener("input", actualizarTotalesVehiculares);
  formularioVehicular.addEventListener("change", actualizarTotalesVehiculares);
}

// Calcular los totales también al abrir la calculadora.
actualizarTotalesVehiculares();
