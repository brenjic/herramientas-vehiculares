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

  async function buscarFotoReferencial(marca, modelo, anio) {
    try {
      // Consulta limpia y directa sin términos ambiguos
      const consulta = `${marca || ""} ${modelo || ""} ${anio || ""} automobile`;
      const parametros = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: consulta,
        gsrnamespace: "6",
        gsrlimit: "15", // Pedimos un poco más de opciones para filtrar
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "600",
        format: "json",
        origin: "*",
      });

      const respuesta = await fetch(
        `https://commons.wikimedia.org/w/api.php?${parametros}`,
      );

      if (!respuesta.ok) throw new Error("No se pudo buscar la imagen");

      const resultado = await respuesta.json();
      const paginas = Object.values(resultado.query?.pages || {});

      const textoBuscado = `${marca || ""} ${modelo || ""}`
        .toLowerCase()
        .trim();

      // Filtro estricto: Buscamos una página cuyo título mencione la marca o modelo
      // Y descartamos cualquier cosa que contenga palabras no deseadas (aviones, etc.)
      const paginaValida =
        paginas.find((p) => {
          const titulo = (p.title || "").toLowerCase();

          // Palabras prohibidas por si acaso aparece algo extraño
          const esBasura =
            titulo.includes("airplane") ||
            titulo.includes("station") ||
            titulo.includes("map");

          const coincideModelo = textoBuscado && titulo.includes(textoBuscado);

          return coincideModelo && !esBasura;
        }) || paginas[0]; // Si no halla coincidencia exacta, toma el primer resultado seguro

      const info = paginaValida?.imageinfo?.[0];
      const urlImagen = info?.thumburl || info?.url;

      if (!urlImagen) return null;

      const respuestaImagen = await fetch(urlImagen);
      if (!respuestaImagen.ok)
        throw new Error("No se pudo descargar la imagen");

      const blob = await respuestaImagen.blob();
      const urlTemporal = URL.createObjectURL(blob);

      try {
        const imagen = new Image();

        await new Promise((resolve, reject) => {
          imagen.onload = resolve;
          imagen.onerror = reject;
          imagen.src = urlTemporal;
        });

        const canvas = document.createElement("canvas");
        canvas.width = imagen.naturalWidth;
        canvas.height = imagen.naturalHeight;

        const contexto = canvas.getContext("2d");
        contexto.drawImage(imagen, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        const metadatos = info.extmetadata || {};

        return {
          dataUrl,
          titulo: paginaValida.title || "Imagen referencial",
          autor:
            metadatos.Artist?.value?.replace(/<[^>]*>/g, "").trim() ||
            "Autor no indicado",
          licencia: metadatos.LicenseShortName?.value || "Consultar licencia",
          paginaFuente: info.descriptionurl || urlImagen,
        };
      } finally {
        URL.revokeObjectURL(urlTemporal);
      }
    } catch (error) {
      console.warn("No se pudo cargar la foto referencial:", error);
      return null;
    }
  }
  async function exportarOperacionesPDF(lista, nombreArchivo) {
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
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 12;
    const anchoUtil = ancho - margen * 2;
    const vino = [100, 27, 40];
    const vinoClaro = [248, 243, 244];
    const tinta = [45, 45, 45];
    const gris = [105, 105, 105];
    const verde = [34, 112, 74];
    const rojo = [174, 48, 55];
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

    function texto(valor, alternativo = "No indicado") {
      const limpio = String(valor ?? "").trim();
      return limpio || alternativo;
    }

    function nuevaPagina() {
      pdf.addPage();
      y = 18;
    }

    function asegurarEspacio(altura) {
      if (y + altura > alto - 17) nuevaPagina();
    }

    function encabezadoSeccion(titulo) {
      asegurarEspacio(11);
      pdf.setFillColor(...vino);
      pdf.roundedRect(margen, y, anchoUtil, 7, 1.5, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(titulo, margen + 3, y + 4.8);
      y += 10;
      pdf.setTextColor(...tinta);
    }

    function tarjeta(x, top, w, titulo, valor, colorValor = vino) {
      pdf.setFillColor(...vinoClaro);
      pdf.roundedRect(x, top, w, 20, 2, 2, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...gris);
      pdf.text(titulo, x + 3, top + 5.5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...colorValor);
      const lineas = pdf.splitTextToSize(String(valor), w - 6);
      pdf.text(lineas.slice(0, 2), x + 3, top + 12);
      pdf.setTextColor(...tinta);
    }

    function filaDoble(etiqueta1, valor1, etiqueta2, valor2, opciones = {}) {
      const gap = 5;
      const colW = (anchoUtil - gap) / 2;
      const x1 = margen;
      const x2 = margen + colW + gap;
      const val1 = texto(valor1);
      const val2 = texto(valor2);
      const labelW = 27;
      const valW = colW - labelW - 5;
      const lines1 = pdf.splitTextToSize(val1, valW);
      const lines2 = pdf.splitTextToSize(val2, valW);
      const h = Math.max(7, Math.max(lines1.length, lines2.length) * 3.7 + 3);
      asegurarEspacio(h);

      if (opciones.destacado) {
        pdf.setFillColor(...vinoClaro);
        pdf.roundedRect(margen, y - 3.5, anchoUtil, h, 1.5, 1.5, "F");
      }

      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gris);
      pdf.text(String(etiqueta1), x1 + 2, y);
      pdf.text(String(etiqueta2), x2 + 2, y);
      pdf.setFont("helvetica", opciones.destacado ? "bold" : "normal");
      pdf.setTextColor(...(opciones.color || tinta));
      pdf.text(lines1, x1 + labelW, y);
      pdf.text(lines2, x2 + labelW, y);
      y += h;
      pdf.setTextColor(...tinta);
    }

    function filaAncha(etiqueta, valor, opciones = {}) {
      const textoValor = texto(valor);
      const labelW = 49;
      const lines = pdf.splitTextToSize(textoValor, anchoUtil - labelW - 7);
      const h = Math.max(7, lines.length * 3.8 + 3);
      asegurarEspacio(h);
      if (opciones.destacado) {
        pdf.setFillColor(...vinoClaro);
        pdf.roundedRect(margen, y - 3.5, anchoUtil, h, 1.5, 1.5, "F");
      }
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gris);
      pdf.text(String(etiqueta), margen + 2, y);
      pdf.setFont("helvetica", opciones.destacado ? "bold" : "normal");
      pdf.setTextColor(...(opciones.color || tinta));
      pdf.text(lines, margen + labelW, y);
      y += h;
      pdf.setTextColor(...tinta);
    }

    function filaImporte(etiqueta, importe, opciones = {}) {
      asegurarEspacio(8);

      if (opciones.destacado) {
        pdf.setFillColor(...vinoClaro);
        pdf.roundedRect(margen, y - 3.5, anchoUtil, 7, 1.5, 1.5, "F");
      }

      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", opciones.destacado ? "bold" : "normal");
      pdf.setTextColor(...(opciones.color || tinta));

      pdf.text(String(etiqueta), margen + 2, y);

      pdf.text(dinero(importe), ancho - margen - 2, y, {
        align: "right",
      });

      y += 7;
      pdf.setTextColor(...tinta);
    }
    function filaDerecha(etiqueta, valorTexto, opciones = {}) {
      asegurarEspacio(8);

      if (opciones.destacado) {
        pdf.setFillColor(...vinoClaro);
        pdf.roundedRect(margen, y - 3.5, anchoUtil, 7, 1.5, 1.5, "F");
      }

      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", opciones.destacado ? "bold" : "normal");
      pdf.setTextColor(...(opciones.color || tinta));

      pdf.text(String(etiqueta), margen + 2, y);

      pdf.text(String(valorTexto), ancho - margen - 2, y, {
        align: "right",
      });

      y += 7;
      pdf.setTextColor(...tinta);
    }
    function cuadricula(items, etiquetaFallback = "No indicado") {
      const visibles = items.filter(
        (item) => item && item.valor !== null && item.valor !== undefined,
      );
      if (!visibles.length) {
        filaAncha("Detalle", etiquetaFallback);
        return;
      }
      for (let i = 0; i < visibles.length; i += 2) {
        const a = visibles[i];
        const b = visibles[i + 1] || { etiqueta: "", valor: "" };
        filaDoble(a.etiqueta, a.valor, b.etiqueta, b.valor);
      }
    }

    function etiquetaGasto(campo) {
      const etiquetas = {
        notary: "Notaría",
        mechanic: "Mecánico",
        filterCost: "Filtro vehicular",
        fuel: "Gasolina",
        bodywork: "Planchado",
        misc: "Otros",
        repairs: "Reparaciones",
        paperwork: "Trámites",
        cleaning: "Limpieza",
        storage: "Estacionamiento",
        sat: "SAT",
        atu: "ATU",
        sutran: "SUTRAN",
        fines: "Multas",
        liens: "Gravámenes",
        fees: "Comisiones",
      };
      return etiquetas[campo] || campo;
    }

    function estadoCorto(valor) {
      const estado = texto(valor, "Por verificar");
      return estado.length > 34 ? estado.slice(0, 31) + "..." : estado;
    }

    function piePagina() {
      const total = pdf.internal.getNumberOfPages();
      for (let pagina = 1; pagina <= total; pagina++) {
        pdf.setPage(pagina);
        pdf.setDrawColor(225, 225, 225);
        pdf.line(margen, alto - 12, ancho - margen, alto - 12);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...gris);
        pdf.text(
          "Herramientas Vehiculares · Informe de compra y reventa",
          margen,
          alto - 7,
        );
        pdf.text(`Página ${pagina} de ${total}`, ancho - margen, alto - 7, {
          align: "right",
        });
      }
    }

    const resultados = lista.map((operacion) => ({
      operacion,
      resultado: calculateForData(operacion.data || {}),
    }));
    const fotosReferenciales = await Promise.all(
      resultados.map(({ operacion }) => {
        const data = operacion.data || {};
        return buscarFotoReferencial(data.make, data.vehicle, data.year);
      }),
    );
    const inversionTotal = resultados.reduce(
      (s, item) => s + item.resultado.investment,
      0,
    );
    const gastosTotal = resultados.reduce(
      (s, item) => s + item.resultado.expenses,
      0,
    );
    const gananciaTotal = resultados.reduce(
      (s, item) => s + item.resultado.profit,
      0,
    );
    const roiTotal =
      inversionTotal > 0 ? (gananciaTotal / inversionTotal) * 100 : null;

    // Portada-resumen, útil tanto para una operación como para un historial.
    pdf.setFillColor(...vino);
    pdf.rect(0, 0, ancho, 39, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text("HERRAMIENTAS VEHICULARES", margen, 15);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("INFORME DE COMPRA Y REVENTA", margen, 23);
    pdf.setFontSize(7.5);
    pdf.text("Generado: " + new Date().toLocaleString("es-PE"), margen, 31);
    y = 48;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...tinta);
    pdf.text("Resumen ejecutivo", margen, y);
    y += 7;

    const gap = 3;
    const w = (anchoUtil - gap * 3) / 4;
    tarjeta(margen, y, w, "OPERACIONES", String(lista.length));
    tarjeta(
      margen + (w + gap),
      y,
      w,
      "INVERSIÓN TOTAL",
      dinero(inversionTotal),
    );
    tarjeta(
      margen + 2 * (w + gap),
      y,
      w,
      "GASTOS TOTALES",
      dinero(gastosTotal),
    );
    tarjeta(
      margen + 3 * (w + gap),
      y,
      w,
      "GANANCIA EST.",
      dinero(gananciaTotal),
      gananciaTotal < 0 ? rojo : verde,
    );
    y += 25;
    filaAncha(
      "Rentabilidad global (ROI)",
      roiTotal === null ? "No disponible" : roiTotal.toFixed(2) + "%",
      {
        destacado: true,
        color: roiTotal !== null && roiTotal < 0 ? rojo : verde,
      },
    );
    y += 3;

    resultados.forEach(({ operacion, resultado }, indice) => {
      const data = operacion.data || {};

      // La primera operación continúa en la portada.
      // Las siguientes empiezan en una página nueva.
      if (indice > 0) {
        nuevaPagina();
      } else {
        y += 5;
      }
      const nombreVehiculo =
        `${texto(data.make, "")} ${texto(data.vehicle, "Vehículo sin nombre")}`.trim();
      pdf.setFillColor(...vino);
      pdf.roundedRect(margen, y, anchoUtil, 13, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${indice + 1}. ${nombreVehiculo}`, margen + 4, y + 5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        `Placa: ${texto(data.plate, "No indicada")}  ·  Estado: ${texto(data.status, "Evaluando")}`,
        margen + 4,
        y + 10,
      );
      y += 19;
      pdf.setTextColor(...tinta);

      // Ficha visual compacta del vehículo
      encabezadoSeccion("IDENTIFICACIÓN DEL VEHÍCULO");

      const nombreVehiculoPDF =
        `${texto(data.make, "")} ${texto(data.vehicle, "Vehículo sin modelo")}`.trim();

      const fotoX = margen;
      const fotoY = y;
      const fotoW = 55;
      const fotoH = 34;
      const infoX = fotoX + fotoW + 5;
      const infoW = anchoUtil - fotoW - 5;
      const fotoReferencial = fotosReferenciales[indice];
      // Marco para la fotografía
      pdf.setFillColor(248, 243, 244);
      pdf.roundedRect(fotoX, fotoY, fotoW, fotoH, 2, 2, "F");

      // Si ya existe una foto en los datos, úsala.
      // data.vehicleImage debe contener una imagen en formato Data URL.
      if (fotoReferencial?.dataUrl) {
        try {
          pdf.addImage(
            fotoReferencial.dataUrl,
            "JPEG",
            fotoX + 1,
            fotoY + 1,
            fotoW - 2,
            fotoH - 2,
            undefined,
            "FAST",
          );
        } catch (error) {
          pdf.setFontSize(7);
          pdf.setTextColor(...gris);
          pdf.text("Foto no disponible", fotoX + fotoW / 2, fotoY + 18, {
            align: "center",
          });
        }
      } else {
        pdf.setFontSize(7);
        pdf.setTextColor(...gris);
        pdf.text("Foto no disponible", fotoX + fotoW / 2, fotoY + 18, {
          align: "center",
        });
      }

      // Datos principales al lado de la foto
      pdf.setTextColor(...tinta);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(
        pdf.splitTextToSize(nombreVehiculoPDF, infoW).slice(0, 2),
        infoX,
        fotoY + 5,
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...gris);

      const datosRapidos = [
        `Placa: ${texto(data.plate, "No indicada")}`,
        `Año: ${texto(data.year)} · Color: ${texto(data.color)}`,
        `Kilometraje: ${
          Number(data.km) > 0
            ? Number(data.km).toLocaleString("es-PE") + " km"
            : "No indicado"
        }`,
        `Ubicación: ${texto(data.location)}`,
      ];

      datosRapidos.forEach((linea, i) => {
        pdf.text(
          pdf.splitTextToSize(linea, infoW).slice(0, 1),
          infoX,
          fotoY + 13 + i * 5,
        );
      });

      y += fotoH + 4;

      // Cuatro cuadros informativos compactos
      const cardGap = 2;
      const infoCardW = (anchoUtil - cardGap * 3) / 4;
      const infoCardH = 20;

      function miniTarjeta(indice, titulo, valor, simbolo) {
        const x = margen + indice * (infoCardW + cardGap);

        pdf.setFillColor(248, 243, 244);
        pdf.roundedRect(x, y, infoCardW, infoCardH, 1.5, 1.5, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...vino);
        pdf.text(simbolo, x + infoCardW / 2, y + 6, {
          align: "center",
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.setTextColor(...gris);
        pdf.text(titulo.toUpperCase(), x + infoCardW / 2, y + 10, {
          align: "center",
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(...tinta);

        const lineas = pdf.splitTextToSize(String(valor), infoCardW - 3);
        pdf.text(lineas.slice(0, 2), x + infoCardW / 2, y + 14, {
          align: "center",
        });
      }

      miniTarjeta(0, "Marca", texto(data.make), "M");
      miniTarjeta(1, "Transmisión", texto(data.transmission), "⚙");
      miniTarjeta(2, "Combustible", texto(data.fuelType), "F");

      const kilometraje = Number(data.km) || 0;
      const anioFabricacion = Number(data.year) || 0;
      const anioActual = new Date().getFullYear();
      const antiguedad =
        anioFabricacion > 0 ? Math.max(1, anioActual - anioFabricacion) : 0;
      const kmPorAnio =
        antiguedad > 0 && kilometraje > 0
          ? Math.round(kilometraje / antiguedad)
          : null;

      miniTarjeta(
        3,
        "Promedio anual",
        kmPorAnio !== null
          ? kmPorAnio.toLocaleString("es-PE") + " km/año"
          : "Sin datos",
        "KM",
      );

      y += infoCardH + 5;

      // Datos complementarios, sin volver a repetir los datos principales
      cuadricula([
        { etiqueta: "Versión", valor: data.version },
        { etiqueta: "Año modelo", valor: data.modelYear },
      ]);

      if (data.notes) {
        encabezadoSeccion("OBSERVACIONES");
        filaAncha("Notas", data.notes);
      }

      // =========================================
      // DESGLOSE DETALLADO DE GASTOS Y DEUDAS
      // =========================================

      encabezadoSeccion("1. DESGLOSE DE GASTOS DEL VEHÍCULO");

      const etiquetasGastosPDF = {
        notary: "Notaría",
        mechanic: "Mecánico",
        filterCost: "Filtro vehicular",
        fuel: "Gasolina",
        bodywork: "Planchado",
        misc: "Otros gastos",
        repairs: "Reparaciones",
        paperwork: "Trámites",
        cleaning: "Limpieza",
        storage: "Estacionamiento",
        sat: "Otros gastos SAT",
        atu: "Otros gastos ATU",
        sutran: "Otros gastos SUTRAN",
        fines: "Multas registradas como gasto",
        liens: "Gravámenes registrados como gasto",
        fees: "Comisiones",
      };

      for (const campo of expenseFields) {
        filaImporte(
          etiquetasGastosPDF[campo] || campo,
          Math.max(0, Number(data[campo]) || 0),
        );
      }

      filaImporte("SUBTOTAL DE GASTOS REGISTRADOS", resultado.regularExpenses, {
        destacado: true,
      });

      y += 3;

      // =========================================
      // DEUDAS POR ENTIDAD DEL FILTRO VEHICULAR
      // =========================================

      encabezadoSeccion("2. DEUDAS DEL FILTRO VEHICULAR");

      const etiquetasDeudasPDF = {
        "deuda-sat-lima": "SAT Lima",
        "deuda-sutran": "SUTRAN",
        "deuda-callao": "Municipalidad del Callao",
        "deuda-atu": "ATU",
        "deuda-infogas": "Infogas",
        "deuda-cuzco": "Entidad de Cusco",
        "deuda-pucallpa": "Entidad de Pucallpa",
        "deuda-huanuco": "Entidad de Huánuco",
        "deuda-tarapoto": "Entidad de Tarapoto",
        "deuda-trujillo": "Entidad de Trujillo",
        "deuda-cajamarca": "Entidad de Cajamarca",
        "deuda-arequipa": "Entidad de Arequipa",
        "deuda-huancayo": "Entidad de Huancayo",
        "deuda-andahuaylas": "Entidad de Andahuaylas",
        "deuda-ica": "Entidad de Ica",
        "deuda-chachapoyas": "Entidad de Chachapoyas",
        "deuda-tacna": "Entidad de Tacna",
        "deuda-chiclayo": "Entidad de Chiclayo",
        "deuda-piura": "Entidad de Piura",
      };

      for (const campo of filterDebtFields) {
        filaImporte(
          etiquetasDeudasPDF[campo] || campo,
          Math.max(0, Number(data[campo]) || 0),
        );
      }

      filaImporte("TOTAL DE DEUDAS POR ENTIDAD", resultado.filterDebts, {
        destacado: true,
      });

      y += 3;

      // =========================================
      // DOCUMENTOS Y COSTOS PENDIENTES
      // =========================================

      encabezadoSeccion("3. DOCUMENTOS DEL VEHÍCULO");

      const documentosPDF = [
        {
          nombre: "SOAT",
          estado: data.soatEstado,
          costo: data.soatCosto,
          incluido: resultado.docs.soatCosto,
        },
        {
          nombre: "CAT",
          estado: data.catEstado,
          costo: data.catCosto,
          incluido: resultado.docs.catCosto,
        },
        {
          nombre: "Revisión técnica",
          estado: data.revisionEstado,
          costo: data.revisionCosto,
          incluido: resultado.docs.revisionCosto,
        },
      ];

      for (const documento of documentosPDF) {
        filaAncha(
          documento.nombre,
          `Estado: ${texto(documento.estado, "Por verificar")}`,
        );

        filaDoble(
          "Costo registrado",
          dinero(documento.costo),
          "Costo incluido",
          dinero(documento.incluido),
        );
      }

      filaImporte("TOTAL DE DOCUMENTOS INCLUIDOS", resultado.documentTotal, {
        destacado: true,
      });

      y += 3;

      // =========================================
      // RESUMEN ECONÓMICO FINAL
      // =========================================

      encabezadoSeccion("4. RESUMEN DE COMPRA Y REVENTA");

      filaImporte("Precio anunciado por el vendedor", data.sellerAsk);

      filaImporte("Precio de compra u oferta", data.buy);

      filaImporte("Subtotal de gastos registrados", resultado.regularExpenses);

      filaImporte("Total de deudas por entidad", resultado.filterDebts);

      filaImporte("Total de documentos incluidos", resultado.documentTotal);

      filaImporte("TOTAL DE GASTOS Y DEUDAS", resultado.expenses, {
        destacado: true,
      });

      filaImporte("INVERSIÓN TOTAL", resultado.investment, { destacado: true });

      filaImporte("Precio de venta estimado", resultado.estimatedSale);

      filaImporte("GANANCIA ESTIMADA", resultado.profit, {
        destacado: true,
        color: resultado.profit < 0 ? rojo : verde,
      });

      filaDerecha(
        "RENTABILIDAD (ROI)",
        resultado.estimatedSale > 0 && resultado.investment > 0
          ? `${resultado.roi.toFixed(2)}%`
          : "—",
        {
          destacado: true,
          color: resultado.roi < 0 ? rojo : verde,
        },
      );

      if (!(resultado.estimatedSale > 0 && resultado.investment > 0)) {
        filaAncha(
          "Nota sobre el ROI",
          "No disponible: ingresa un precio de venta estimado y una inversión mayor que cero.",
        );
      }

      if (Number(data.real) > 0) {
        filaImporte("Precio de venta real registrado", data.real);

        filaImporte("GANANCIA CON PRECIO REAL", resultado.actualProfit, {
          destacado: true,
          color: resultado.actualProfit < 0 ? rojo : verde,
        });
      }
    });

    piePagina();
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

${item("Total filtro vehicular (deudas + documentos)", deudaTotal)}

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
${item(
  "Ganancia estimada",
  result.estimatedSale > 0 ? money(result.profit) : "—",
)}
${item(
  "Rentabilidad (ROI)",
  result.estimatedSale > 0 && result.investment > 0
    ? result.roi.toFixed(2) + "%"
    : "—",
)}
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
  const leerNumero = (id) => {
    const campo = document.getElementById(id);
    if (!campo) return 0;

    // Acepta números enteros y decimales.
    const valor = campo.value.trim().replace(",", ".");
    if (valor === "") return 0;

    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.max(0, numero) : 0;
  };

  const leerEstado = (id) => (document.getElementById(id)?.value || "").trim();

  const debeIncluirCosto = (estado) =>
    ["Vencido", "Vencida", "No tiene"].includes(estado);

  const sumaDeudas = satInputIds.reduce(
    (total, id) => total + leerNumero(id),
    0,
  );

  let costoSoat = debeIncluirCosto(leerEstado("soatEstado"))
    ? leerNumero("soatCosto")
    : 0;

  let costoCat = debeIncluirCosto(leerEstado("catEstado"))
    ? leerNumero("catCosto")
    : 0;

  const costoRevision = debeIncluirCosto(leerEstado("revisionEstado"))
    ? leerNumero("revisionCosto")
    : 0;

  // Evitar sumar SOAT y CAT al mismo tiempo:
  // se conserva el costo mayor si ambos aplican.
  if (costoSoat > 0 && costoCat > 0) {
    if (costoSoat >= costoCat) {
      costoCat = 0;
    } else {
      costoSoat = 0;
    }
  }

  const totalFiltro = sumaDeudas + costoSoat + costoCat + costoRevision;

  const totalDisplay = document.getElementById("satTotalSum");

  if (totalDisplay) {
    totalDisplay.textContent = `S/ ${totalFiltro.toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
