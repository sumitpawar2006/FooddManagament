(function () {
  "use strict";

  const TOKEN_KEY = "foodog-admin-token";
  const loginPanel = document.querySelector("[data-login-panel]");
  const dashboard = document.querySelector("[data-dashboard]");
  const loginForm = document.querySelector("#admin-login-form");
  const loginStatus = document.querySelector("[data-login-status]");
  const ordersBody = document.querySelector("[data-orders-body]");
  const emptyOrders = document.querySelector("[data-empty-orders]");
  const statusFilter = document.querySelector("[data-status-filter]");
  const detailsDialog = document.querySelector("#order-details-dialog");
  const adminMessage = document.querySelector("[data-admin-message]");
  let orders = [];
  let selectedReference = "";

  function token() { return sessionStorage.getItem(TOKEN_KEY) || ""; }

  function currency(paisa) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paisa || 0) / 100);
  }

  function readable(value) { return String(value || "").replaceAll("_", " "); }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(payload.error || "Request failed.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showMessage(message, tone) {
    adminMessage.textContent = message;
    adminMessage.className = `admin-message ${tone || ""}`;
    adminMessage.hidden = false;
  }

  function showLogin(message) {
    sessionStorage.removeItem(TOKEN_KEY);
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginStatus.textContent = message || "";
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = document.querySelector("[data-login-button]");
    const body = Object.fromEntries(new FormData(loginForm).entries());
    button.disabled = true;
    button.textContent = "Signing in…";
    loginStatus.textContent = "";
    try {
      const result = await api("/api/admin/login", { method: "POST", body: JSON.stringify(body) });
      sessionStorage.setItem(TOKEN_KEY, result.accessToken);
      showDashboard();
      await loadOrders();
    } catch (error) {
      loginStatus.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Sign in securely";
    }
  });

  async function loadOrders() {
    const filter = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : "";
    showMessage("Loading orders…");
    try {
      const result = await api(`/api/admin/orders${filter}`);
      orders = result.orders || [];
      renderOrders();
      adminMessage.hidden = true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showLogin("Your session expired. Please sign in again.");
        return;
      }
      showMessage(error.message, "is-error");
    }
  }

  function updateMetrics() {
    const active = orders.filter(function (order) { return ["confirmed", "preparing", "out_for_delivery", "cancellation_requested"].includes(order.order_status); }).length;
    const paid = orders.filter(function (order) { return order.payment_status === "paid"; });
    const revenue = paid.reduce(function (total, order) { return total + Number(order.amount_paisa || 0); }, 0);
    document.querySelector("[data-metric-total]").textContent = orders.length;
    document.querySelector("[data-metric-active]").textContent = active;
    document.querySelector("[data-metric-paid]").textContent = paid.length;
    document.querySelector("[data-metric-revenue]").textContent = currency(revenue);
    document.querySelector("[data-order-count]").textContent = `${orders.length} ${orders.length === 1 ? "order" : "orders"}`;
  }

  function td(text, className) {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function renderOrders() {
    ordersBody.replaceChildren();
    emptyOrders.hidden = orders.length !== 0;
    updateMetrics();

    orders.forEach(function (order) {
      const row = document.createElement("tr");
      const referenceCell = document.createElement("td");
      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className = "order-link";
      detailButton.textContent = order.reference;
      detailButton.addEventListener("click", function () { openDetails(order); });
      referenceCell.appendChild(detailButton);
      row.appendChild(referenceCell);

      const customer = document.createElement("td");
      const customerName = document.createElement("strong");
      const customerPhone = document.createElement("small");
      customerName.textContent = order.customer_name;
      customerPhone.textContent = order.phone;
      customer.append(customerName, customerPhone);
      row.appendChild(customer);

      row.appendChild(td(`${order.meal_name} × ${order.quantity}`));
      row.appendChild(td(currency(order.amount_paisa), "money-cell"));
      row.appendChild(td(order.payment_method === "cod" ? "COD" : readable(order.payment_status)));

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `admin-status status-${order.order_status}`;
      badge.textContent = readable(order.order_status);
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      row.appendChild(td(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))));
      ordersBody.appendChild(row);
    });
  }

  function setDetail(name, value) { document.querySelector(`[data-detail-${name}]`).textContent = value; }

  function openDetails(order) {
    selectedReference = order.reference;
    setDetail("reference", order.reference);
    setDetail("customer", order.customer_name);
    setDetail("phone", order.phone);
    setDetail("address", order.address);
    setDetail("meal", `${order.meal_name} × ${order.quantity} · ${order.frequency_label}`);
    setDetail("delivery", order.delivery_window_label);
    setDetail("payment", `${order.payment_method === "cod" ? "Cash on delivery" : "Razorpay"} · ${readable(order.payment_status)} · ${currency(order.amount_paisa)}`);
    document.querySelector("[data-detail-status]").value = ["payment_pending", "payment_failed", "cancellation_requested"].includes(order.order_status) ? "confirmed" : order.order_status;
    document.querySelector("[data-detail-note]").textContent = order.order_status === "cancellation_requested" ? "Process any required Razorpay refund before marking this order cancelled." : "";
    detailsDialog.showModal();
  }

  document.querySelector("[data-close-details]").addEventListener("click", function () { detailsDialog.close(); });
  detailsDialog.addEventListener("click", function (event) { if (event.target === detailsDialog) detailsDialog.close(); });

  document.querySelector("[data-save-status]").addEventListener("click", async function () {
    const button = document.querySelector("[data-save-status]");
    const orderStatus = document.querySelector("[data-detail-status]").value;
    button.disabled = true;
    document.querySelector("[data-detail-note]").textContent = "Saving…";
    try {
      await api("/api/admin/update-order", { method: "PATCH", body: JSON.stringify({ reference: selectedReference, orderStatus }) });
      document.querySelector("[data-detail-note]").textContent = "Status updated.";
      await loadOrders();
    } catch (error) {
      document.querySelector("[data-detail-note]").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("[data-refresh]").addEventListener("click", loadOrders);
  document.querySelector("[data-logout]").addEventListener("click", function () { showLogin("You have signed out."); });
  statusFilter.addEventListener("change", loadOrders);

  async function initialize() {
    try {
      const health = await api("/api/health");
      if (!health.database) {
        showLogin("The database is not configured yet. Follow DEPLOYMENT.md before using the admin area.");
        return;
      }
      if (token()) {
        showDashboard();
        await loadOrders();
      }
    } catch (_error) {
      showLogin("Start the Vercel development server or deploy the project to use the admin area.");
    }
  }

  initialize();
})();
