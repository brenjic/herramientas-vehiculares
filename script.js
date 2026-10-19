(() => {
  "use strict";

  // Pega aquí el enlace real de tu plantilla vehicular.
  const TEMPLATE_URL =
    "https://sites.google.com/view/revisionvehicular7?usp=sharing";

  const STORAGE_KEY = "herramientasVehiculares_operaciones";

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

  function money(value) {
    return currency.format(Number(value) || 0);
  }

  function numberValue(id) {
    return Math.max(0, Number($(id)?.value) || 0);
  }

  function readForm() {
    const data = {};

    for (const element of form.elements) {
      if (
        !element.id ||
        element.type === "file" ||
        element.type === "submit" ||
        element.type === "button"
      ) {
        continue;
      }

      data[element.id] = element.value;
    }

    for (const field of numberFields) {
      if (field in data) {
        data[field] = Number(data[field]) || 0;
      }
    }

    return data;
  }

  function calculate() {
    const buy = numberValue("buy");
    const expenses = expenseFields.reduce(
      (total, field) => total + numberValue(field),
      0,
    );

    const investment = buy + expenses;
    const estimatedSale = numberValue("sale");
    const actualSale = numberValue("real");
    const profit = estimatedSale - investment;
    const roi = investment > 0 ? (profit / investment) * 100 : 0;
    const targetPrice = investment + numberValue("target");

    $("investment").textContent = money(investment);
    $("expenses").textContent = money(expenses);
    $("profit").textContent = money(profit);
    $("roi").textContent = investment > 0 ? `${roi.toFixed(2)}%` : "—";
    $("breakEven").textContent = money(investment);
    $("targetPrice").textContent = money(targetPrice);
    $("realProfit").textContent =
      actualSale > 0 ? money(actualSale - investment) : "Pendiente";

    $("profit").classList.toggle("negative", profit < 0);
    $("realProfit").classList.toggle(
      "negative",
      actualSale > 0 && actualSale < investment,
    );
  }

  function loadOperations() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const operations = saved ? JSON.parse(saved) : [];
      return Array.isArray(operations) ? operations : [];
    } catch (error) {
      console.error("No se pudo leer el historial:", error);
      return [];
    }
  }

  function saveOperations(operations) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
      return true;
    } catch (error) {
      alert("No se pudo guardar. Revisa el espacio disponible del navegador.");
      console.error(error);
      return false;
    }
  }

  function createId() {
    return (
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  }

  function operationSummary(data) {
    const expenses = expenseFields.reduce(
      (total, field) => total + (Number(data[field]) || 0),
      0,
    );
    const investment = (Number(data.buy) || 0) + expenses;

    return {
      investment,
      profit: (Number(data.sale) || 0) - investment,
    };
  }

  function makeCell(value) {
    const td = document.createElement("td");
    td.textContent = value ?? "";
    return td;
  }

  function renderTable() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const operations = loadOperations();

    tableBody.replaceChildren();

    const filtered = operations.filter((operation) => {
      const vehicle = String(operation.data?.vehicle || "").toLowerCase();
      const plate = String(operation.data?.plate || "").toLowerCase();

      return vehicle.includes(query) || plate.includes(query);
    });

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      const td = makeCell(
        query
          ? "No se encontraron coincidencias."
          : "Todavía no hay operaciones guardadas.",
      );
      td.colSpan = 6;
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    for (const operation of filtered) {
      const data = operation.data || {};
      const summary = operationSummary(data);
      const tr = document.createElement("tr");

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

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Eliminar";
      deleteButton.addEventListener("click", () => {
        const confirmed = window.confirm(
          `¿Eliminar la operación "${data.vehicle || "Sin nombre"}" (${data.plate || "Sin placa"})?`,
        );

        if (!confirmed) return;

        const updated = loadOperations().filter(
          (item) => item.id !== operation.id,
        );

        if (saveOperations(updated)) renderTable();
      });

      actions.append(loadButton, deleteButton);
      tr.appendChild(actions);
      tableBody.appendChild(tr);
    }
  }

  function fillForm(data) {
    for (const [key, value] of Object.entries(data)) {
      const element = $(key);
      if (element && key !== "form" && element.type !== "file") {
        element.value = value ?? "";
      }
    }
  }

  form.addEventListener("input", calculate);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = readForm();

    if (!String(data.vehicle || "").trim()) {
      alert("Escribe el nombre o modelo del vehículo.");
      $("vehicle").focus();
      return;
    }

    const operations = loadOperations();
    operations.unshift({
      id: createId(),
      savedAt: new Date().toISOString(),
      data,
    });

    if (saveOperations(operations)) {
      renderTable();
      alert("Operación guardada en este navegador.");
    }
  });

  $("clear").addEventListener("click", () => {
    const confirmed = window.confirm(
      "¿Limpiar el formulario? El historial guardado no se eliminará.",
    );

    if (!confirmed) return;

    form.reset();
    calculate();
  });

  searchInput.addEventListener("input", renderTable);

  // Exportar el historial como CSV para abrirlo en Excel.
  $("csv").addEventListener("click", () => {
    const operations = loadOperations();

    if (operations.length === 0) {
      alert("No hay operaciones para exportar.");
      return;
    }

    const columns = [
      ["vehicle", "Vehículo"],
      ["plate", "Placa"],
      ["year", "Año"],
      ["km", "Kilometraje"],
      ["status", "Estado"],
      ["buy", "Precio de compra"],
      ["ask", "Precio publicado"],
      ["sale", "Venta estimada"],
      ["real", "Venta real"],
      ...expenseFields.map((field) => [field, field]),
      ["target", "Ganancia objetivo"],
      ["notes", "Notas"],
    ];

    function csvCell(value) {
      let text = String(value ?? "");
      text = text.replace(/"/g, '""');
      return `"${text}"`;
    }

    const lines = [
      columns.map((column) => csvCell(column[1])).join(","),
      ...operations.map((operation) =>
        columns.map(([key]) => csvCell(operation.data?.[key])).join(","),
      ),
    ];

    downloadFile(
      "\uFEFF" + lines.join("\r\n"),
      "operaciones_vehiculares.csv",
      "text/csv;charset=utf-8;",
    );
  });

  // Copia de seguridad completa en formato JSON.
  $("backup").addEventListener("click", () => {
    const operations = loadOperations();

    downloadFile(
      JSON.stringify(operations, null, 2),
      "respaldo_vehicular.json",
      "application/json;charset=utf-8;",
    );
  });

  $("import").addEventListener("click", () => {
    importInput.click();
  });

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

      if (!valid) {
        throw new Error("El archivo no tiene el formato esperado.");
      }

      const confirmed = window.confirm(
        `Se importarán ${parsed.length} operaciones. ¿Deseas agregarlas al historial actual?`,
      );

      if (!confirmed) return;

      const current = loadOperations();
      const existingIds = new Set(current.map((item) => item.id));

      const imported = parsed.map((item) => ({
        id: item.id && !existingIds.has(item.id) ? item.id : createId(),
        savedAt: item.savedAt || new Date().toISOString(),
        data: item.data,
      }));

      if (saveOperations([...imported, ...current])) {
        renderTable();
        alert("Importación completada.");
      }
    } catch (error) {
      alert(`No se pudo importar el archivo: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });

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

  // Enlace de la plantilla: se configura cuando tengas su URL real.
  const templateLink = $("templateLink");

  if (templateLink) {
    if (TEMPLATE_URL.trim()) {
      templateLink.href = TEMPLATE_URL;
      templateLink.target = "_blank";
      templateLink.rel = "noopener noreferrer";
    } else {
      templateLink.addEventListener("click", (event) => {
        event.preventDefault();
        alert(
          "Primero pega el enlace de tu plantilla en la constante TEMPLATE_URL de script.js.",
        );
      });
    }
  }

  calculate();
  renderTable();
})();
