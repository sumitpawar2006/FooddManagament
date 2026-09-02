(function () {
  "use strict";

  const DEMO_STORAGE_KEY = "foodog-demo-orders-v2";
  const planPrices = {
    "ghar-ka-veg": 9900,
    "homestyle-non-veg": 14900,
    "south-indian-box": 11900,
    "light-and-fit": 12900
  };
  const planNames = {
    "ghar-ka-veg": "Ghar Ka Veg",
    "homestyle-non-veg": "Homestyle Non-Veg",
    "south-indian-box": "South Indian Box",
    "light-and-fit": "Light & Fit",
    "custom-tiffin": "My 3D Tiffin"
  };
  const customIngredients = {
    base: {
      "jeera-rice": { name: "Jeera rice", pricePaisa: 3500 },
      "three-rotis": { name: "Three rotis", pricePaisa: 3000 },
      "brown-rice": { name: "Brown rice", pricePaisa: 4500 }
    },
    dal: {
      "dal-tadka": { name: "Dal tadka", pricePaisa: 3500 },
      rajma: { name: "Rajma", pricePaisa: 4500 },
      chole: { name: "Chole", pricePaisa: 4500 }
    },
    sabzi: {
      "seasonal-sabzi": { name: "Seasonal sabzi", pricePaisa: 4000 },
      "paneer-masala": { name: "Paneer masala", pricePaisa: 6500 },
      "soy-keema": { name: "Soy keema", pricePaisa: 5500 }
    },
    side: {
      salad: { name: "Fresh salad", pricePaisa: 2000 },
      curd: { name: "Homemade curd", pricePaisa: 2500 },
      pickle: { name: "House pickle", pricePaisa: 1000 }
    }
  };
  const customSpiceNames = { mild: "Mild", classic: "Classic", fiery: "Fiery" };
  const defaultCustomTiffin = { customBase: "three-rotis", customDal: "dal-tadka", customSabzi: "paneer-masala", customSide: "curd", customSpice: "classic" };
  const frequencyMeals = { "one-time": 1, weekly: 6, monthly: 26 };
  const frequencyNames = { "one-time": "One-time", weekly: "Weekly", monthly: "Monthly" };
  const deliveryNames = { lunch: "Lunch · 12:00–2:00 PM", dinner: "Dinner · 7:00–9:00 PM" };

  const state = { database: false, onlinePayments: false, paymentMode: "test", currentOrder: null, currentPhone: "", customTiffin: { ...defaultCustomTiffin } };
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const environmentBanner = document.querySelector("[data-environment-banner]");
  const orderDialog = document.querySelector("#order-dialog");
  const manageDialog = document.querySelector("#manage-dialog");
  const orderForm = document.querySelector("#order-form");
  const manageForm = document.querySelector("#manage-form");
  const orderSuccess = document.querySelector("#order-success");
  const mealPlan = document.querySelector("#meal-plan");
  const frequency = document.querySelector("#frequency");
  const quantity = document.querySelector("#quantity");
  const estimatedTotal = document.querySelector("#estimated-total");
  const newOrderId = document.querySelector("#new-order-id");
  const toast = document.querySelector("[data-toast]");
  const manageResult = document.querySelector("#manage-result");
  const lookupError = document.querySelector("#lookup-error");
  const cancelOrderButton = document.querySelector("#cancel-order");
  const submitButton = document.querySelector("[data-submit-order]");
  let toastTimer;
  let razorpayLoader;

  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  function currency(paisa) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paisa / 100);
  }

  function customTiffinDetails(payload) {
    const picked = [
      customIngredients.base[payload.customBase],
      customIngredients.dal[payload.customDal],
      customIngredients.sabzi[payload.customSabzi],
      customIngredients.side[payload.customSide]
    ];
    if (picked.some(function (item) { return !item; })) return null;
    const spice = customSpiceNames[payload.customSpice] || customSpiceNames.classic;
    return {
      pricePaisa: picked.reduce(function (total, item) { return total + item.pricePaisa; }, 0),
      name: `My 3D Tiffin · ${picked.map(function (item) { return item.name; }).join(" + ")} · ${spice}`
    };
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(function () { toast.hidden = true; }, 3800);
  }

  function setLoading(loading, label) {
    submitButton.disabled = loading;
    submitButton.querySelector("[data-submit-label]").textContent = label || (loading ? "Please wait…" : paymentLabel());
    submitButton.querySelector(".button-spinner").hidden = !loading;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || "Request failed. Please try again.");
    return payload;
  }

  function paymentLabel() {
    const method = new FormData(orderForm).get("paymentMethod");
    if (method === "cod") return "Place COD order";
    return "Online payment coming soon";
  }

  function showEnvironment(title, message) {
    environmentBanner.querySelector("[data-environment-title]").textContent = title;
    environmentBanner.querySelector("[data-environment-message]").textContent = message;
    environmentBanner.hidden = false;
  }

  async function checkEnvironment() {
    try {
      const health = await api("/api/health");
      state.database = Boolean(health.database);
      state.onlinePayments = Boolean(health.onlinePayments);
      state.paymentMode = health.paymentMode || "test";
    } catch (_error) {
      state.database = false;
      state.onlinePayments = false;
    }

    const onlineRadio = orderForm.querySelector('input[value="razorpay"]');
    const codRadio = orderForm.querySelector('input[value="cod"]');
    const onlineOption = document.querySelector("[data-online-option]");
    const onlineDescription = document.querySelector("[data-online-description]");
    const onlineStatus = document.querySelector("[data-online-status]");
    onlineRadio.disabled = true;
    onlineOption.classList.add("is-unavailable");
    onlineStatus.hidden = false;
    onlineStatus.textContent = "Coming soon";
    onlineDescription.textContent = "UPI, cards, netbanking, and wallets";
    codRadio.checked = true;
    if (!state.database) {
      showEnvironment("Local demo mode", "COD orders work in this browser. Connect Supabase to enable shared orders and the admin dashboard.");
    } else {
      environmentBanner.hidden = true;
    }
    updatePaymentCopy();
  }

  document.querySelector("[data-dismiss-banner]").addEventListener("click", function () { environmentBanner.hidden = true; });

  function openDialog(dialog) {
    closeNavigation();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("dialog-open");
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
    document.body.classList.remove("dialog-open");
  }

  function closeNavigation() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  }

  function resetOrderDialog() {
    orderForm.reset();
    Object.entries({ base: "customBase", dal: "customDal", sabzi: "customSabzi", side: "customSide", spice: "customSpice" }).forEach(function (entry) {
      const input = orderForm.querySelector(`[data-order-custom="${entry[0]}"]`);
      if (input) input.value = state.customTiffin[entry[1]];
    });
    orderForm.querySelector('input[value="cod"]').checked = true;
    orderForm.hidden = false;
    orderSuccess.hidden = true;
    document.querySelector("#order-errors").hidden = true;
    orderForm.querySelectorAll("[aria-invalid]").forEach(function (field) { field.removeAttribute("aria-invalid"); });
    orderForm.querySelectorAll(".field-error").forEach(function (error) { error.textContent = ""; });
    setLoading(false);
    updateEstimate();
    updatePaymentCopy();
  }

  navToggle.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeNavigation); });
  document.addEventListener("click", function (event) {
    if (!nav.contains(event.target) && !navToggle.contains(event.target)) closeNavigation();
  });
  window.addEventListener("scroll", function () { header.classList.toggle("is-scrolled", window.scrollY > 12); }, { passive: true });

  document.querySelectorAll("[data-open-order]").forEach(function (button) {
    button.addEventListener("click", function () {
      resetOrderDialog();
      openDialog(orderDialog);
      window.setTimeout(function () { mealPlan.focus(); }, 20);
    });
  });
  document.querySelectorAll("[data-order-plan]").forEach(function (button) {
    button.addEventListener("click", function () {
      resetOrderDialog();
      mealPlan.value = button.dataset.orderPlan;
      updateEstimate();
      openDialog(orderDialog);
      window.setTimeout(function () { frequency.focus(); }, 20);
    });
  });
  window.addEventListener("foodog:builder-order", function (event) {
    resetOrderDialog();
    const detail = event.detail || {};
    state.customTiffin = {
      customBase: detail.customBase || defaultCustomTiffin.customBase,
      customDal: detail.customDal || defaultCustomTiffin.customDal,
      customSabzi: detail.customSabzi || defaultCustomTiffin.customSabzi,
      customSide: detail.customSide || defaultCustomTiffin.customSide,
      customSpice: detail.customSpice || defaultCustomTiffin.customSpice
    };
    Object.entries({ base: "customBase", dal: "customDal", sabzi: "customSabzi", side: "customSide", spice: "customSpice" }).forEach(function (entry) {
      const input = orderForm.querySelector(`[data-order-custom="${entry[0]}"]`);
      if (input) input.value = state.customTiffin[entry[1]];
    });
    mealPlan.value = "custom-tiffin";
    updateEstimate();
    openDialog(orderDialog);
    window.setTimeout(function () { frequency.focus(); }, 20);
  });
  document.querySelectorAll("[data-open-manage]").forEach(function (button) {
    button.addEventListener("click", function () {
      manageForm.reset();
      manageResult.hidden = true;
      lookupError.textContent = "";
      openDialog(manageDialog);
      window.setTimeout(function () { document.querySelector("#lookup-id").focus(); }, 20);
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", function () { closeDialog(button.closest("dialog")); });
  });
  [orderDialog, manageDialog].forEach(function (dialog) {
    dialog.addEventListener("click", function (event) { if (event.target === dialog) closeDialog(dialog); });
    dialog.addEventListener("close", function () { document.body.classList.remove("dialog-open"); });
  });

  function updateEstimate() {
    const price = mealPlan.value === "custom-tiffin" ? customTiffinDetails(state.customTiffin)?.pricePaisa : planPrices[mealPlan.value];
    const meals = frequencyMeals[frequency.value] || 1;
    const count = Math.max(1, Number(quantity.value) || 1);
    estimatedTotal.textContent = price ? `${currency(price * meals * count)} · ${meals * count} ${meals * count === 1 ? "tiffin" : "tiffins"}` : "Select a meal";
  }

  function updatePaymentCopy() {
    document.querySelector("[data-submit-label]").textContent = paymentLabel();
    document.querySelector("[data-payment-note]").textContent = "No online payment is taken. Pay when the tiffin arrives.";
  }

  [mealPlan, frequency, quantity].forEach(function (field) {
    field.addEventListener("change", updateEstimate);
    field.addEventListener("input", updateEstimate);
  });
  orderForm.querySelectorAll('input[name="paymentMethod"]').forEach(function (radio) {
    radio.addEventListener("change", updatePaymentCopy);
  });

  const validationFields = [
    { id: "meal-plan", message: "Choose a tiffin from the menu." },
    { id: "quantity", message: "Enter a quantity between 1 and 10." },
    { id: "customer-name", message: "Enter the name for this delivery." },
    { id: "mobile", message: "Enter a valid 10-digit mobile number.", custom: function (field) { return field.value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").length === 10; } },
    { id: "address", message: "Enter the complete delivery address." }
  ];

  function validateOrderForm() {
    let invalidCount = 0;
    validationFields.forEach(function (item) {
      const field = document.getElementById(item.id);
      const valid = field.checkValidity() && (!item.custom || item.custom(field));
      field.setAttribute("aria-invalid", String(!valid));
      document.getElementById(item.id + "-error").textContent = valid ? "" : item.message;
      if (!valid) invalidCount += 1;
    });
    const summary = document.querySelector("#order-errors");
    if (invalidCount) {
      summary.textContent = `Please fix ${invalidCount} ${invalidCount === 1 ? "field" : "fields"} before placing the order.`;
      summary.hidden = false;
      summary.focus();
      return false;
    }
    summary.hidden = true;
    return true;
  }

  function formPayload() {
    const payload = Object.fromEntries(new FormData(orderForm).entries());
    if (payload.mealId === "custom-tiffin") Object.assign(payload, state.customTiffin);
    return payload;
  }

  function demoOrders() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function makeReference() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return "FOG-" + Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  }

  function createDemoOrder(payload) {
    const custom = payload.mealId === "custom-tiffin" ? customTiffinDetails(payload) : null;
    const unitPricePaisa = custom ? custom.pricePaisa : planPrices[payload.mealId];
    const order = {
      reference: makeReference(),
      customerName: payload.customerName.trim(),
      phone: payload.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
      mealId: payload.mealId,
      mealName: custom ? custom.name : planNames[payload.mealId],
      quantity: Number(payload.quantity),
      frequency: payload.frequency,
      frequencyLabel: frequencyNames[payload.frequency],
      mealCount: frequencyMeals[payload.frequency],
      deliveryWindow: payload.deliveryWindow,
      deliveryWindowLabel: deliveryNames[payload.deliveryWindow],
      amountPaisa: unitPricePaisa * frequencyMeals[payload.frequency] * Number(payload.quantity),
      currency: "INR",
      paymentMethod: "cod",
      paymentStatus: "cod_pending",
      orderStatus: "confirmed",
      createdAt: new Date().toISOString()
    };
    const orders = demoOrders();
    orders.push(order);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(orders.slice(-20)));
    return order;
  }

  function showSuccess(order, message) {
    state.currentOrder = order;
    newOrderId.textContent = order.reference;
    document.querySelector("[data-success-message]").textContent = message || "Save this order ID and mobile number to manage the order later.";
    orderForm.hidden = true;
    orderSuccess.hidden = false;
    orderSuccess.focus();
  }

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayLoader) return razorpayLoader;
    razorpayLoader = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Secure checkout could not load. Check your connection or choose COD.")); };
      document.head.appendChild(script);
    });
    return razorpayLoader;
  }

  async function openPaymentCheckout(created, payload) {
    await loadRazorpay();
    return new Promise(function (resolve, reject) {
      const checkout = new window.Razorpay({
        key: created.checkout.key,
        amount: created.checkout.amount,
        currency: created.checkout.currency,
        name: created.checkout.name,
        description: created.checkout.description,
        order_id: created.checkout.orderId,
        prefill: { name: payload.customerName, contact: payload.phone },
        notes: { foodog_reference: created.order.reference },
        theme: { color: "#146c43" },
        retry: { enabled: true },
        handler: async function (payment) {
          try {
            const verified = await api("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                reference: created.order.reference,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpayOrderId: payment.razorpay_order_id,
                razorpaySignature: payment.razorpay_signature
              })
            });
            resolve(verified.order);
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: function () { reject(new Error(`Payment was not completed. Order ${created.order.reference} remains pending.`)); }
        }
      });
      checkout.on("payment.failed", function (response) {
        reject(new Error(response.error?.description || "Payment failed. Please retry or choose COD."));
      });
      checkout.open();
    });
  }

  orderForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!validateOrderForm()) return;
    const payload = formPayload();
    if (payload.paymentMethod === "razorpay" && !state.onlinePayments) {
      const message = "Online payment is not connected yet. Choose Cash on Delivery, or add the Supabase and Razorpay deployment credentials.";
      showToast(message);
      document.querySelector("#order-errors").textContent = message;
      document.querySelector("#order-errors").hidden = false;
      document.querySelector("#order-errors").focus();
      return;
    }
    setLoading(true, payload.paymentMethod === "cod" ? "Placing order…" : "Opening checkout…");
    try {
      if (!state.database) {
        const order = createDemoOrder(payload);
        showSuccess(order, "This local COD order is stored in your browser. Connect the database before accepting real customers.");
        return;
      }

      const created = await api("/api/orders/create", { method: "POST", body: JSON.stringify(payload) });
      if (payload.paymentMethod === "cod") {
        showSuccess(created.order, "Your COD order is confirmed. Save the ID and mobile number to manage it later.");
        return;
      }

      const verifiedOrder = await openPaymentCheckout(created, payload);
      showSuccess(verifiedOrder, "Payment verified and order confirmed. Save the ID and mobile number to manage it later.");
    } catch (error) {
      showToast(error.message);
      document.querySelector("#order-errors").textContent = error.message;
      document.querySelector("#order-errors").hidden = false;
      document.querySelector("#order-errors").focus();
    } finally {
      setLoading(false);
    }
  });

  document.querySelector("[data-copy-order]").addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(newOrderId.textContent);
      showToast("Order ID copied to clipboard.");
    } catch (_error) {
      showToast("Copy failed. Select and copy the order ID manually.");
    }
  });

  function statusLabel(status) {
    return String(status || "").replaceAll("_", " ");
  }

  function renderManagedOrder(order) {
    state.currentOrder = order;
    const status = document.querySelector("#result-status");
    status.textContent = statusLabel(order.orderStatus);
    status.className = "status-" + order.orderStatus;
    document.querySelector("#result-meal").textContent = `${order.mealName} × ${order.quantity}`;
    document.querySelector("#result-plan").textContent = order.frequencyLabel;
    document.querySelector("#result-delivery").textContent = order.deliveryWindowLabel;
    document.querySelector("#result-payment").textContent = order.paymentMethod === "cod" ? "Cash on delivery" : statusLabel(order.paymentStatus);
    document.querySelector("#result-total").textContent = currency(order.amountPaisa);
    cancelOrderButton.hidden = ["cancelled", "delivered", "cancellation_requested"].includes(order.orderStatus);
    cancelOrderButton.dataset.confirm = "false";
    cancelOrderButton.textContent = "Cancel this order";
    manageResult.hidden = false;
  }

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  }

  manageForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(manageForm).entries());
    payload.reference = String(payload.reference || "").trim().toUpperCase();
    payload.phone = normalizePhone(payload.phone);
    lookupError.textContent = "";
    manageResult.hidden = true;
    if (!/^FOG-[A-F0-9]{8}$/.test(payload.reference) || payload.phone.length !== 10) {
      lookupError.textContent = "Enter a valid order ID and 10-digit mobile number.";
      return;
    }
    try {
      let order;
      if (state.database) {
        order = (await api("/api/orders/lookup", { method: "POST", body: JSON.stringify(payload) })).order;
      } else {
        order = demoOrders().find(function (item) { return item.reference === payload.reference && item.phone === payload.phone; });
        if (!order) throw new Error("No local order matched that ID and mobile number.");
      }
      state.currentPhone = payload.phone;
      renderManagedOrder(order);
    } catch (error) {
      lookupError.textContent = error.message;
    }
  });

  cancelOrderButton.addEventListener("click", async function () {
    if (cancelOrderButton.dataset.confirm !== "true") {
      cancelOrderButton.dataset.confirm = "true";
      cancelOrderButton.textContent = "Confirm cancellation";
      showToast("Press the button again to confirm cancellation.");
      return;
    }
    cancelOrderButton.disabled = true;
    try {
      let order;
      let message;
      if (state.database) {
        const result = await api("/api/orders/cancel", {
          method: "POST",
          body: JSON.stringify({ reference: state.currentOrder.reference, phone: state.currentPhone })
        });
        order = result.order;
        message = result.message;
      } else {
        const orders = demoOrders();
        order = orders.find(function (item) { return item.reference === state.currentOrder.reference; });
        order.orderStatus = "cancelled";
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(orders));
        message = "Local demo order cancelled.";
      }
      renderManagedOrder(order);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      cancelOrderButton.disabled = false;
    }
  });

  function setupVisualMotion() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));

    if (!reduceMotion.matches && "IntersectionObserver" in window) {
      document.documentElement.classList.add("motion-ready");
      const revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
      revealItems.forEach(function (item) { revealObserver.observe(item); });
    } else {
      revealItems.forEach(function (item) { item.classList.add("is-visible"); });
    }

    if (reduceMotion.matches || !precisePointer.matches) return;
    document.querySelectorAll("[data-tilt]").forEach(function (item) {
      let bounds;
      let frame;
      const strength = Number(item.dataset.tiltStrength) || 4;

      item.addEventListener("pointerenter", function () { bounds = item.getBoundingClientRect(); });
      item.addEventListener("pointermove", function (event) {
        if (!bounds) bounds = item.getBoundingClientRect();
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(function () {
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          item.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
          item.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
        });
      });
      item.addEventListener("pointerleave", function () {
        window.cancelAnimationFrame(frame);
        bounds = null;
        item.style.setProperty("--rx", "0deg");
        item.style.setProperty("--ry", "0deg");
      });
    });
  }

  function setupScrollUI() {
    const progress = document.querySelector("[data-scroll-progress]");
    const sectionLinks = Array.from(nav.querySelectorAll('a[href^="#"]')).map(function (link) {
      return { link, section: document.querySelector(link.getAttribute("href")) };
    }).filter(function (item) { return item.section; });
    let frame;

    function update() {
      frame = null;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      progress.style.transform = `scaleX(${ratio.toFixed(4)})`;

      const probe = window.scrollY + window.innerHeight * 0.38;
      let activeLink = null;
      let activeOffset = -1;
      sectionLinks.forEach(function (item) {
        if (item.section.offsetTop <= probe && item.section.offsetTop > activeOffset) {
          activeOffset = item.section.offsetTop;
          activeLink = item.link;
        }
      });
      sectionLinks.forEach(function (item) {
        const isActive = item.link === activeLink;
        item.link.classList.toggle("is-active", isActive);
        if (isActive) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      });
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
  }

  setupScrollUI();
  setupVisualMotion();
  checkEnvironment();
})();
