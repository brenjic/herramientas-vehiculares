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

  let currentUser = null;
  let operations = [];
  let loading = false;

  function money(value) {
    return currency.format(Number(value) || 0);
  }

  function numberValue(id) {
    return Math.max(0, Number($(id)?.value) || 0);
  }

  function readForm() {
    const data = {};

    for (const element of form.elements) {
      if (!element.id || ["file", "submit", "button"].includes(element.type))
        continue;

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

  // Convierte una operación del formulario al formato de Supabase.
  function toDatabase(data) {
    const gastos = {};

    for (const field of expenseFields) {
      gastos[field] = Number(data[field]) || 0;
    }

    return {
      usuario_id: currentUser.id,
      modelo: String(data.vehicle || "").trim(),
      placa: String(data.plate || "").trim() || null,
      anio: Number(data.year) || null,
      kilometraje: Number(data.km) || null,
      estado: String(data.status || "").trim() || "Evaluando",
      precio_compra: Number(data.buy) || 0,
      precio_publicado: Number(data.ask) || 0,
      precio_venta: Number(data.sale) || 0,
      precio_venta_real: Number(data.real) || 0,
      gastos,
      ganancia_objetivo: Number(data.target) || 0,
      notas: String(data.notes || "").trim() || null,
    };
  }

  // Convierte una fila de Supabase al formato que usa la página.
  function fromDatabase(row) {
    const gastos = row.gastos || {};

    const data = {
      vehicle: row.modelo || "",
      plate: row.placa || "",
      year: row.anio ?? "",
      km: row.kilometraje ?? "",
      status: row.estado || "",
      buy: Number(row.precio_compra) || 0,
      ask: Number(row.precio_publicado) || 0,
      sale: Number(row.precio_venta) || 0,
      real: Number(row.precio_venta_real) || 0,
      target: Number(row.ganancia_objetivo) || 0,
      notes: row.notas || "",
    };

    for (const field of expenseFields) {
      data[field] = Number(gastos[field]) || 0;
    }

    return {
      id: row.id,
      savedAt: row.creado_en,
      data,
    };
  }

  async function loadOperations() {
    const { data, error } = await supabaseClient
      .from("operaciones")
      .select("*")
      .order("creado_en", { ascending: false });

    if (error) throw error;

    operations = (data || []).map(fromDatabase);
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
      td.colSpan = 6;
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    for (const operation of filtered) {
      const data = operation.data;
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
      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          `¿Eliminar la operación "${data.vehicle || "Sin nombre"}" (${data.plate || "Sin placa"})?`,
        );

        if (!confirmed) return;

        deleteButton.disabled = true;

        const { error } = await supabaseClient
          .from("operaciones")
          .delete()
          .eq("id", operation.id);

        if (error) {
          console.error(error);
          alert("No se pudo eliminar la operación. Revisa la conexión.");
          deleteButton.disabled = false;
          return;
        }

        try {
          await loadOperations();
          renderTable();
        } catch (err) {
          console.error(err);
          alert("Se eliminó, pero no se pudo actualizar el historial.");
        }
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

  form.addEventListener("input", calculate);

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
      alert("Operación guardada en tu cuenta de forma segura.");
      form.reset();
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
    calculate();
  });

  searchInput.addEventListener("input", renderTable);

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
      ["status", "Estado"],
      ["buy", "Precio de compra"],
      ["ask", "Precio publicado"],
      ["sale", "Venta estimada"],
      ["real", "Venta real"],
      ...expenseFields.map((field) => [field, field]),
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

      if (!valid) {
        throw new Error("El archivo no tiene el formato esperado.");
      }

      if (
        !window.confirm(
          `Se intentarán importar ${parsed.length} operaciones a tu cuenta. ¿Continuar?`,
        )
      )
        return;

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
