/* 轻燃 · 交互与路由 */
(function () {
  "use strict";
  const A = window.Qingran;
  const Q = window.QINGRAN;
  const { icon, esc, formatNumber } = A;

  A.ui = {
    route: "home",
    foodDate: A.todayISO(),
    planDate: A.todayISO(),
    dataTab: "trend",
    library: { cat: "all", tag: "all", sort: "default", query: "" },
  };
  A.onboarding = { open: false, step: 1, draft: null };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let addFoodCtx = null;
  let confirmCallback = null;
  let swapCtx = null;
  let lastFocusDrawer = null;
  let lastFocusModal = null;
  let pendingImport = null;

  /* =====================================================
     基础渲染
     ===================================================== */
  const routes = {
    home: { title: "首页总览", render: () => A.renderHome() },
    food: { title: "今日饮食", render: () => A.renderFood() },
    plan: { title: "饮食计划", render: () => A.renderPlan() },
    library: { title: "食物分类", render: () => A.renderLibrary() },
    data: { title: "数据与设置", render: () => A.renderData() },
  };

  function routeFromHash() {
    const name = String(location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return routes[name] ? name : "home";
  }

  function renderApp(options = {}) {
    const scrollTop = options.scrollTop != null ? options.scrollTop : window.scrollY;
    const route = A.ui.route;
    const page = routes[route] || routes.home;
    document.title = `${page.title} · 轻燃`;
    $("#topbarDate").innerHTML = A.renderTopbarDate();
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
    renderShellProfile();
    const main = $("#appMain");
    main.innerHTML = page.render();
    if (route === "library") applyLibrarySearch();
    if (!options.keepScroll) window.scrollTo({ top: scrollTop, behavior: "auto" });
    renderSaveStatus();
  }

  function rerender(options = {}) {
    const top = options.top != null ? options.top : window.scrollY;
    renderApp({ scrollTop: top, keepScroll: true });
  }

  function renderShellProfile() {
    const profile = A.state.profile;
    const name = profile.name && profile.name.trim() ? profile.name.trim() : "我的轻燃";
    const initial = name === "我的轻燃" ? "轻" : name.slice(0, 1);
    $("#avatarInitial").textContent = initial;
    $("#profileName").textContent = name;
    const goal = A.goalProgress();
    $("#profileGoal").textContent = goal.remain != null
      ? goal.remain <= 0 ? "目标已达成" : `距目标 ${Math.abs(goal.remain).toFixed(1)} kg`
      : `目标 ${A.num(profile.targetWeight).toFixed(1)} kg`;
  }

  function renderSaveStatus() {
    const pill = $("#savePill");
    if (!pill) return;
    if (!A.storageAvailable) {
      pill.classList.add("saving");
      pill.querySelector("span:last-child").textContent = "本地保存不可用";
    }
  }

  /* =====================================================
     导航
     ===================================================== */
  function navigate(route, options = {}) {
    if (!routes[route]) return;
    const same = A.ui.route === route && location.hash === `#/${route}`;
    A.ui.route = route;
    if (options.dataTab) A.ui.dataTab = options.dataTab;
    if (same) {
      renderApp();
    } else {
      closeAllOverlays();
      location.hash = `#/${route}`;
    }
  }

  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    const changed = route !== A.ui.route;
    A.ui.route = route;
    closeAllOverlays();
    renderApp({ scrollTop: changed ? 0 : window.scrollY });
    if (changed) window.scrollTo({ top: 0, behavior: "auto" });
  });

  /* =====================================================
     通知
     ===================================================== */
  function toast(message, type = "success") {
    const root = $("#toastRoot");
    root.innerHTML = "";
    const el = document.createElement("div");
    el.className = `toast ${type === "danger" ? "danger" : ""}`;
    el.innerHTML = `${icon(type === "danger" ? "alert" : "check")}<span>${esc(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 220);
    }, 2600);
  }

  function setNoScroll() {
    const locked = !!$("#overlayRoot .drawer") || !!$("#modalRoot .modal") || A.onboarding.open;
    document.body.classList.toggle("no-scroll", locked);
  }

  /* =====================================================
     抽屉与弹窗
     ===================================================== */
  function openDrawer(inner) {
    closeDrawer(false);
    lastFocusDrawer = document.activeElement;
    $("#overlayRoot").innerHTML = `<div class="overlay" data-action="close-overlay" data-close="drawer"></div><aside class="drawer" role="dialog" aria-modal="true">${inner}</aside>`;
    document.body.classList.add("no-scroll");
    setTimeout(() => {
      const focusTarget = $("#drawerSearch") || $(".drawer .icon-btn") || $(".drawer");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }, 40);
  }

  function closeDrawer(restore = true) {
    $("#overlayRoot").innerHTML = "";
    if (restore && lastFocusDrawer && document.contains(lastFocusDrawer)) {
      lastFocusDrawer.focus({ preventScroll: true });
    }
    setNoScroll();
  }

  function openModal(inner) {
    lastFocusModal = document.activeElement;
    $("#modalRoot").innerHTML = `<div class="modal-wrap"><div class="overlay" data-action="close-overlay" data-close="modal"></div>${inner}</div>`;
    document.body.classList.add("no-scroll");
    setTimeout(() => {
      const focusTarget =
        $("#modalRoot .modal .modal-body input:not([type=hidden]), #modalRoot .modal .modal-body select, #modalRoot .modal .modal-body textarea") ||
        $("#modalRoot .modal .modal-foot .btn-primary, #modalRoot .modal .modal-foot .btn-danger") ||
        $("#modalRoot .modal button");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }, 40);
  }

  function closeModal(restore = true) {
    $("#modalRoot").innerHTML = "";
    if (restore && lastFocusModal && document.contains(lastFocusModal)) {
      lastFocusModal.focus({ preventScroll: true });
    }
    setNoScroll();
  }

  function closeAllOverlays() {
    $("#overlayRoot").innerHTML = "";
    $("#modalRoot").innerHTML = "";
    setNoScroll();
  }

  function confirmDialog({ title, message, confirmText = "确认", danger = true, onConfirm }) {
    confirmCallback = onConfirm;
    openModal(`
      <div class="modal narrow" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>${esc(title)}</h2></div>
          <button class="icon-btn" type="button" data-action="close-modal" aria-label="关闭">${icon("close")}</button>
        </div>
        <div class="confirm-body">
          <div class="confirm-icon">${icon(danger ? "alert" : "info")}</div>
          <p>${message}</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" data-action="close-modal">再想想</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-action="confirm-yes">${esc(confirmText)}</button>
        </div>
      </div>`);
  }

  /* =====================================================
     食物记录
     ===================================================== */
  function openAddFood(options = {}) {
    const date = options.date || A.todayISO();
    const meal = options.meal || defaultMealForNow();
    const edit = options.editId ? A.findEntry(date, options.editId) : null;
    let foodId = options.foodId || (edit ? edit.item.foodId : null);
    let grams = null;
    let unitMode = "unit";
    let query = "";
    let cat = "all";
    if (edit) {
      grams = edit.item.grams;
      if (!A.foodById(foodId)) {
        const snapshot = edit.item;
        const factor = 100 / Math.max(1, snapshot.grams);
        foodId = snapshot.foodId;
        A._snapshotFood = {
          id: snapshot.foodId,
          name: snapshot.name,
          cat: snapshot.cat,
          kcal: Math.round(snapshot.kcal * factor),
          p: A.round(snapshot.protein * factor, 1),
          c: A.round(snapshot.carbs * factor, 1),
          f: A.round(snapshot.fat * factor, 1),
          unit: { label: "份", grams: 100 },
          step: 10,
          tags: [],
          custom: false,
        };
      }
    }
    if (foodId) {
      const food = A.foodById(foodId) || A._snapshotFood;
      if (food && !grams) grams = food.unit && food.unit.grams ? food.unit.grams : 100;
      if (food && food.unit && food.unit.label === "份") unitMode = "gram";
      if (food && !food.unit) unitMode = "gram";
    }
    addFoodCtx = {
      date,
      meal,
      editId: options.editId || null,
      oldMeal: edit ? edit.meal : null,
      foodId,
      grams,
      unitMode,
      query,
      cat,
      mode: foodId ? "detail" : "browse",
    };
    renderAddDrawer();
  }

  function renderAddDrawer() {
    if (!addFoodCtx) return;
    const ctx = addFoodCtx;
    const meal = A.mealByKey(ctx.meal);
    const editing = !!ctx.editId;
    if (ctx.mode === "browse") {
      const all = A.allFoods();
      openDrawer(`
        <div class="drawer-head">
          <div><h2>记录食物</h2><p>${A.formatDateShort(ctx.date)} · <span id="drawerMealLabel">${meal.name}</span></p></div>
          <button class="icon-btn" type="button" data-action="close-drawer" aria-label="关闭">${icon("close")}</button>
        </div>
        <div class="drawer-body">
          <div class="meal-tabs" data-role="drawerMeals">
            ${Q.MEALS.map((m) => `<button class="meal-tab ${m.key === ctx.meal ? "active" : ""}" type="button" data-action="drawer-meal" data-meal="${m.key}">${m.name}</button>`).join("")}
          </div>
          <div class="drawer-search">
            <div class="search-field">
              ${icon("search")}
              <input type="search" id="drawerSearch" placeholder="搜索食物，按名称或标签" autocomplete="off">
            </div>
          </div>
          <div class="drawer-filters">
            <button class="mini-filter active" type="button" data-action="drawer-cat" data-cat="all">全部</button>
            ${Q.CATEGORIES.map((category) => `<button class="mini-filter" type="button" data-action="drawer-cat" data-cat="${category.id}">${category.short}</button>`).join("")}
          </div>
          <div class="result-list" id="drawerResults">
            ${all.map((food) => {
              const category = A.categoryById(food.cat);
              return `
                <button class="result-row" type="button" data-action="choose-drawer-food" data-food="${food.id}" data-cat="${food.cat}" data-search="${esc(`${food.name} ${category.name} ${(food.tags || []).join(" ")}`.toLowerCase())}">
                  <span class="result-glyph" style="color:${category.accent};background:${category.soft}">${category.glyph}</span>
                  <span class="result-copy"><strong>${esc(food.name)}</strong><span>${category.name} · 蛋白 ${food.p}g · 碳水 ${food.c}g</span></span>
                  <span class="result-kcal">${food.kcal}<small style="font-size:7px"> /100g</small></span>
                  <span class="result-add">${icon("plus")}</span>
                </button>`;
            }).join("")}
          </div>
          <div class="drawer-empty hidden" id="drawerNoMatch">${icon("search")}没有找到匹配的食物，换个关键词试试。</div>
          <button class="drawer-custom-link" type="button" data-action="drawer-custom">找不到？去“食物分类”新建一个食物</button>
        </div>`);
      setTimeout(() => $("#drawerSearch")?.focus({ preventScroll: true }), 50);
      return;
    }

    const food = A.foodById(ctx.foodId) || A._snapshotFood;
    if (!food) {
      addFoodCtx.mode = "browse";
      renderAddDrawer();
      return;
    }
    if (ctx.grams == null) {
      ctx.grams = food.unit && food.unit.grams ? food.unit.grams : 100;
    }
    if (!food.unit) ctx.unitMode = "gram";
    const category = A.categoryById(food.cat);
    const nutrition = A.nutritionFor(food, ctx.grams);
    const hasUnit = !!(food.unit && food.unit.grams);
    const unitValue = hasUnit ? ctx.grams / food.unit.grams : ctx.grams;
    const displayValue = ctx.unitMode === "unit" && hasUnit ? A.round(unitValue, 1) : Math.round(ctx.grams);
    openDrawer(`
      <div class="drawer-head">
        <div><h2>${editing ? "编辑记录" : "添加食物"}</h2><p>${A.formatDateShort(ctx.date)} · <span id="drawerMealLabel">${meal.name}</span></p></div>
        <button class="icon-btn" type="button" data-action="close-drawer" aria-label="关闭">${icon("close")}</button>
      </div>
      <div class="drawer-body">
        <div class="meal-tabs" data-role="drawerMeals" style="margin-bottom:18px">
          ${Q.MEALS.map((m) => `<button class="meal-tab ${m.key === ctx.meal ? "active" : ""}" type="button" data-action="drawer-meal" data-meal="${m.key}">${m.name}</button>`).join("")}
        </div>
        <div class="food-detail">
          ${!editing ? `<button class="detail-back" type="button" data-action="drawer-back">${icon("arrow-left")} 返回搜索</button>` : ""}
          <div class="detail-hero">
            <span class="detail-glyph" style="color:${category.accent};background:${category.soft}">${category.glyph}</span>
            <div><h3>${esc(food.name)}</h3><p>${category.name}${food.custom ? " · 我添加的食物" : ""} · 每 100 克</p></div>
          </div>
          <div class="detail-nutrients">
            <div class="detail-nutrient"><strong>${food.kcal}</strong><span>千卡</span></div>
            <div class="detail-nutrient"><strong>${food.p}g</strong><span>蛋白质</span></div>
            <div class="detail-nutrient"><strong>${food.c}g</strong><span>碳水</span></div>
            <div class="detail-nutrient"><strong>${food.f}g</strong><span>脂肪</span></div>
          </div>
          <div class="portion-panel">
            <div class="portion-panel-head">
              <span>吃多少</span>
              ${hasUnit ? `<div class="portion-mode">
                <button class="${ctx.unitMode === "unit" ? "active" : ""}" type="button" data-action="drawer-unit" data-mode="unit">按${food.unit.label}</button>
                <button class="${ctx.unitMode === "gram" ? "active" : ""}" type="button" data-action="drawer-unit" data-mode="gram">按克</button>
              </div>` : `<span class="pill">克</span>`}
            </div>
            <div class="stepper">
              <button class="stepper-btn" type="button" data-action="drawer-step" data-dir="-1" aria-label="减少份量">${icon("minus")}</button>
              <input id="portionValue" type="number" min="0.1" max="${ctx.unitMode === "unit" && hasUnit ? "100" : "2000"}" step="${ctx.unitMode === "unit" && hasUnit ? "0.5" : "1"}" value="${displayValue}" inputmode="decimal" aria-label="食物份量">
              <span style="font-size:10px;color:var(--muted);min-width:28px;text-align:center" id="portionUnit">${ctx.unitMode === "unit" && hasUnit ? food.unit.label : "克"}</span>
              <button class="stepper-btn" type="button" data-action="drawer-step" data-dir="1" aria-label="增加份量">${icon("plus")}</button>
            </div>
            <div class="portion-live">
              <span id="portionSummary">${A.portionLabel(food, ctx.grams)}</span>
              <strong><span id="portionKcal">${nutrition.kcal}</span><small> 千卡</small></strong>
            </div>
          </div>
          <div class="detail-nutrients" style="margin-top:14px;margin-bottom:0;padding-bottom:0;border-bottom:0">
            <div class="detail-nutrient"><strong id="portionProtein">${nutrition.protein}g</strong><span>蛋白质</span></div>
            <div class="detail-nutrient"><strong id="portionCarbs">${nutrition.carbs}g</strong><span>碳水</span></div>
            <div class="detail-nutrient"><strong id="portionFat">${nutrition.fat}g</strong><span>脂肪</span></div>
            <div class="detail-nutrient"><strong>${Math.round(ctx.grams)}g</strong><span>份量</span></div>
          </div>
          ${(food.tags || []).length ? `<div class="food-card-foot" style="margin-top:15px">${food.tags.map((tag) => `<span class="mini-tag">${esc(tag)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-primary" type="button" data-action="confirm-add-food">${editing ? "保存到" : "添加到"}${meal.name}</button>
        ${editing ? `<button class="btn btn-danger-ghost" type="button" data-action="drawer-delete" aria-label="删除这条记录">${icon("trash")}</button>` : ""}
      </div>`);
    setTimeout(() => $("#portionValue")?.focus({ preventScroll: true }), 50);
  }

  function readPortionInput() {
    if (!addFoodCtx) return addFoodCtx;
    const food = A.foodById(addFoodCtx.foodId) || A._snapshotFood;
    const input = $("#portionValue");
    if (!food || !input) return addFoodCtx;
    let value = A.num(input.value, 0);
    if (value <= 0) value = 1;
    const unitMode = addFoodCtx.unitMode === "unit" && food.unit && food.unit.grams;
    const grams = unitMode ? value * food.unit.grams : value;
    addFoodCtx.grams = A.clamp(Math.round(grams), 1, 5000);
    return addFoodCtx;
  }

  function updatePortionUI() {
    if (!addFoodCtx) return;
    const food = A.foodById(addFoodCtx.foodId) || A._snapshotFood;
    if (!food) return;
    const grams = addFoodCtx.grams;
    const nutrition = A.nutritionFor(food, grams);
    const kcalEl = $("#portionKcal");
    if (kcalEl) {
      kcalEl.textContent = nutrition.kcal;
      $("#portionProtein").textContent = `${nutrition.protein}g`;
      $("#portionCarbs").textContent = `${nutrition.carbs}g`;
      $("#portionFat").textContent = `${nutrition.fat}g`;
      $("#portionSummary").textContent = A.portionLabel(food, grams);
      const detailNutrients = $$(".food-detail .detail-nutrients:last-of-type .detail-nutrient strong");
      if (detailNutrients[3]) detailNutrients[3].textContent = `${Math.round(grams)}g`;
    }
  }

  function filterDrawer() {
    const query = ($("#drawerSearch")?.value || "").trim().toLowerCase();
    const cat = addFoodCtx ? addFoodCtx.cat : "all";
    let count = 0;
    $$("#drawerResults .result-row").forEach((row) => {
      const matchQuery = !query || row.dataset.search.includes(query);
      const matchCat = cat === "all" || row.dataset.cat === cat;
      row.classList.toggle("hidden", !(matchQuery && matchCat));
      if (matchQuery && matchCat) count += 1;
    });
    $("#drawerNoMatch")?.classList.toggle("hidden", count > 0);
  }

  function setDrawerMeal(mealKey) {
    if (!addFoodCtx) return;
    addFoodCtx.meal = mealKey;
    const meal = A.mealByKey(mealKey);
    $$("[data-role=drawerMeals] .meal-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.meal === mealKey));
    const label = $("#drawerMealLabel");
    if (label) label.textContent = meal.name;
    const addButton = $("[data-action=confirm-add-food]");
    if (addButton) addButton.textContent = `${addFoodCtx.editId ? "保存到" : "添加到"}${meal.name}`;
  }

  /* =====================================================
     食物详情 / 自定义食物
     ===================================================== */
  function openFoodDetail(foodId) {
    const food = A.foodById(foodId);
    if (!food) return;
    const category = A.categoryById(food.cat);
    openModal(`
      <div class="modal wide" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>${esc(food.name)}</h2><p>${category.name} · 每 100 克可食部分${food.note ? ` · ${esc(food.note)}` : ""}</p></div>
          <button class="icon-btn" type="button" data-action="close-modal" aria-label="关闭">${icon("close")}</button>
        </div>
        <div class="modal-body">
          <div class="detail-hero">
            <span class="detail-glyph" style="color:${category.accent};background:${category.soft};width:54px;height:54px">${category.glyph}</span>
            <div><div class="food-card-kcal"><strong>${food.kcal}</strong><span>千卡 / 100g</span></div><div class="food-card-foot" style="margin-top:4px">${(food.tags || []).map((tag) => `<span class="mini-tag">${esc(tag)}</span>`).join("") || "<span class='mini-tag'>基础食材</span>"}</div></div>
          </div>
          <div class="detail-nutrients" style="margin-top:16px">
            <div class="detail-nutrient"><strong>${food.kcal}</strong><span>千卡</span></div>
            <div class="detail-nutrient"><strong>${food.p}g</strong><span>蛋白质</span></div>
            <div class="detail-nutrient"><strong>${food.c}g</strong><span>碳水</span></div>
            <div class="detail-nutrient"><strong>${food.f}g</strong><span>脂肪</span></div>
          </div>
          <div class="form-note">${icon("info")} 常见参考值。实际热量会随品种、烹饪方式和用油量变化，记录时按自己的做法估算即可。</div>
          ${food.custom ? `<div class="form-note" style="margin-top:8px">${icon("edit")} 这是你添加的食物，可以修改名称和营养数据。</div>` : ""}
        </div>
        <div class="modal-foot">
          ${food.custom ? `<button class="btn btn-danger-ghost" type="button" data-action="delete-custom-food" data-food="${food.id}">${icon("trash")} 删除</button><button class="btn btn-ghost" type="button" data-action="edit-custom-food" data-food="${food.id}">${icon("edit")} 编辑</button>` : ""}
          <button class="btn btn-primary" type="button" data-action="detail-add" data-food="${food.id}">${icon("plus")} 记录到今日饮食</button>
        </div>
      </div>`);
  }

  function openCustomFood(foodId) {
    const editing = foodId ? A.state.customFoods.find((food) => food.id === foodId) : null;
    const food = editing || {
      name: "",
      cat: "staple",
      kcal: "",
      p: "",
      c: "",
      f: "",
      unit: { label: "份", grams: 100 },
      tags: [],
    };
    openModal(`
      <div class="modal wide" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>${editing ? "编辑食物" : "新增食物"}</h2><p>按你实际吃的食物填写，营养值按每 100 克计。</p></div>
          <button class="icon-btn" type="button" data-action="close-modal" aria-label="关闭">${icon("close")}</button>
        </div>
        <form id="customFoodForm" data-food-id="${editing ? food.id : ""}">
          <div class="modal-body">
            <div class="form-grid">
              <div class="field"><label for="customName">食物名称</label><input class="input" id="customName" type="text" maxlength="30" required value="${esc(food.name)}" placeholder="比如：妈妈做的番茄炒蛋"></div>
              <div class="field"><label for="customCat">分类</label><select class="select" id="customCat">${Q.CATEGORIES.map((cat) => `<option value="${cat.id}" ${food.cat === cat.id ? "selected" : ""}>${cat.name}</option>`).join("")}</select></div>
            </div>
            <div class="form-grid four" style="margin-top:14px">
              <div class="field"><label for="customKcal">热量 <span class="unit">kcal</span></label><input class="input" id="customKcal" type="number" min="0" max="900" step="1" required value="${food.kcal}"></div>
              <div class="field"><label for="customP">蛋白质 <span class="unit">g</span></label><input class="input" id="customP" type="number" min="0" max="100" step="0.1" required value="${food.p}"></div>
              <div class="field"><label for="customC">碳水 <span class="unit">g</span></label><input class="input" id="customC" type="number" min="0" max="100" step="0.1" required value="${food.c}"></div>
              <div class="field"><label for="customF">脂肪 <span class="unit">g</span></label><input class="input" id="customF" type="number" min="0" max="100" step="0.1" required value="${food.f}"></div>
            </div>
            <div class="form-grid" style="margin-top:14px">
              <div class="field"><label for="customUnitLabel">常用份量名称 <span class="unit">可选</span></label><input class="input" id="customUnitLabel" type="text" maxlength="6" value="${esc(food.unit?.label || "份")}" placeholder="碗 / 个 / 份"></div>
              <div class="field"><label for="customUnitGrams">一份大约多少克</label><input class="input" id="customUnitGrams" type="number" min="1" max="2000" step="1" value="${food.unit?.grams || 100}"></div>
              <div class="field full"><label for="customTags">标签 <span class="unit">用逗号分隔，可选</span></label><input class="input" id="customTags" type="text" maxlength="40" value="${esc((food.tags || []).join("，"))}" placeholder="高蛋白，方便"></div>
            </div>
            <div class="form-note" style="margin-top:12px">${icon("info")} 常见家常菜可以按“整盘”估算，填写整盘的总营养，再把常用份量设为整盘克数。</div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" type="button" data-action="close-modal">取消</button>
            <button class="btn btn-primary" type="submit">${icon("check")} ${editing ? "保存修改" : "加入食物库"}</button>
          </div>
        </form>
      </div>`);
  }

  /* =====================================================
     饮食计划交互
     ===================================================== */
  function generatePlan(date, options = {}) {
    A.generatePlan(date, options.preserveLocks !== false);
    A.saveState();
    rerender();
    toast(options.regenerated ? "已重新生成计划，锁定的餐次保持不变" : "三餐计划已生成，可以换菜或调份量");
  }

  function openSwapModal(date, mealKey, itemId) {
    const plan = A.getPlan(date);
    const item = plan?.meals?.[mealKey]?.items.find((it) => it.id === itemId);
    if (!item) return;
    const alternatives = A.planAlternatives(mealKey, item);
    swapCtx = { date, mealKey, itemId };
    const meal = A.mealByKey(mealKey);
    openModal(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>换一样</h2><p>替换 ${esc(item.name)} · 会尽量保持这一餐的热量不变</p></div>
          <button class="icon-btn" type="button" data-action="close-modal" aria-label="关闭">${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${alternatives.length ? `<div class="swap-list">${alternatives.map((food) => {
            const cat = A.categoryById(food.cat);
            const grams = A.suggestSwapGrams(item.kcal, food);
            return `<button class="swap-row" type="button" data-action="choose-swap" data-food="${food.id}">
              <span class="result-glyph" style="color:${cat.accent};background:${cat.soft}">${cat.glyph}</span>
              <span class="swap-copy"><strong>${esc(food.name)}</strong><span>${cat.name} · ${food.kcal} 千卡/100g · 蛋白 ${food.p}g</span></span>
              <span class="swap-grams">约 ${grams}g</span>
              <span class="swap-kcal">${item.kcal} kcal</span>
            </button>`;
          }).join("")}</div>` : `<div class="drawer-empty">${icon("search")}这一类暂时没有更多可替换的食物。</div>`}
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button></div>
      </div>`);
  }

  function applyPlan(date) {
    const plan = A.getPlan(date);
    if (!plan || plan.appliedAt) return;
    const commit = () => {
      const added = A.applyPlanToDay(date);
      A.saveState();
      closeModal(false);
      rerender();
      toast(`计划中的 ${added} 样食物已加入${date === A.todayISO() ? "今日" : "这天"}饮食`);
    };
    if (A.hasDayFood(date)) {
      confirmDialog({
        title: "当天已有饮食记录",
        message: `应用计划会把计划里的食物<strong>追加</strong>到对应餐次，不会删除你已有的记录。要继续吗？`,
        confirmText: "继续应用",
        danger: false,
        onConfirm: commit,
      });
    } else {
      commit();
    }
  }

  /* =====================================================
     体重
     ===================================================== */
  function openWeightModal(weightId) {
    const editing = weightId ? A.state.weights.find((item) => item.id === weightId) : null;
    const latest = A.latestWeightEntry();
    const entry = editing || {
      date: A.todayISO(),
      weight: latest ? latest.weight : A.state.profile.weight,
      waist: "",
      note: "",
    };
    openModal(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>${editing ? "修改体重记录" : "记录身体数据"}</h2><p>固定时间称重更好比较，比如起床后、早餐前。</p></div>
          <button class="icon-btn" type="button" data-action="close-modal" aria-label="关闭">${icon("close")}</button>
        </div>
        <form id="weightForm" data-weight-id="${editing ? editing.id : ""}">
          <div class="modal-body">
            <div class="form-grid">
              <div class="field"><label for="weightDate">日期</label><input class="input" id="weightDate" type="date" max="${A.todayISO()}" required value="${entry.date}"></div>
              <div class="field"><label for="weightValue">体重 <span class="unit">kg</span></label><input class="input" id="weightValue" type="number" min="30" max="250" step="0.1" required value="${Number(entry.weight).toFixed(1)}"></div>
              <div class="field"><label for="waistValue">腰围 <span class="unit">cm · 可选</span></label><input class="input" id="waistValue" type="number" min="30" max="250" step="0.1" value="${entry.waist || ""}" placeholder="比如 72.5"></div>
              <div class="field"><label for="weightNote">备注 <span class="unit">可选</span></label><input class="input" id="weightNote" type="text" maxlength="30" value="${esc(entry.note || "")}" placeholder="比如：经期、外食后"></div>
            </div>
            <div class="form-note" style="margin-top:14px">${icon("info")} 同一天重复记录会覆盖原记录。体重会受水分、盐分和生理周期影响，单日上涨不必紧张。</div>
          </div>
          <div class="modal-foot">
            ${editing ? `<button class="btn btn-danger-ghost" type="button" data-action="delete-weight" data-id="${editing.id}">${icon("trash")} 删除</button>` : ""}
            <button class="btn btn-ghost" type="button" data-action="close-modal">取消</button>
            <button class="btn btn-primary" type="submit">${icon("check")} 保存记录</button>
          </div>
        </form>
      </div>`);
  }

  /* =====================================================
     首次设置
     ===================================================== */
  function emptyDraft() {
    return {
      name: "",
      sex: "",
      age: "",
      height: "",
      weight: "",
      targetWeight: "",
      activity: 1.375,
      weeklyLoss: 0.5,
    };
  }

  function openOnboarding() {
    A.onboarding = { open: true, step: 1, draft: emptyDraft() };
    renderOnboarding();
    document.body.classList.add("no-scroll");
  }

  function closeOnboarding() {
    A.onboarding.open = false;
    $("#onboardingRoot").innerHTML = "";
    setNoScroll();
  }

  function syncOnboardingInputs() {
    if (A.onboarding.step !== 1) return;
    const draft = A.onboarding.draft;
    draft.name = $("#obName")?.value.trim() || "";
    draft.age = $("#obAge")?.value || "";
    draft.height = $("#obHeight")?.value || "";
    draft.weight = $("#obWeight")?.value || "";
    draft.targetWeight = $("#obTargetWeight")?.value || "";
  }

  function selectOnboardingSex(sex) {
    syncOnboardingInputs();
    A.onboarding.draft.sex = sex;
    renderOnboarding();
  }

  function validateOnboardingBasics() {
    syncOnboardingInputs();
    const d = A.onboarding.draft;
    if (!d.sex) return "先选择性别，用来估算基础代谢。";
    if (!(A.num(d.age, 0) >= 12 && A.num(d.age, 0) <= 100)) return "年龄请填写 12–100 岁之间。";
    if (!(A.num(d.height, 0) >= 120 && A.num(d.height, 0) <= 230)) return "身高请填写 120–230 cm 之间。";
    if (!(A.num(d.weight, 0) >= 30 && A.num(d.weight, 0) <= 250)) return "当前体重请填写 30–250 kg 之间。";
    if (!(A.num(d.targetWeight, 0) >= 30 && A.num(d.targetWeight, 0) <= 250)) return "目标体重请填写 30–250 kg 之间。";
    if (A.num(d.targetWeight, 0) >= A.num(d.weight, 0)) return "目标体重需要低于当前体重，轻燃是为减脂设计的。";
    return "";
  }

  function finishOnboarding() {
    const error = validateOnboardingBasics();
    if (error) {
      A.onboarding.step = 1;
      renderOnboarding();
      toast(error, "danger");
      return;
    }
    const d = A.onboarding.draft;
    const profile = {
      name: d.name,
      sex: d.sex,
      age: A.num(d.age, 28),
      height: A.num(d.height, 165),
      weight: A.num(d.weight, 62),
      targetWeight: A.num(d.targetWeight, 55),
      activity: A.num(d.activity, 1.375),
      weeklyLoss: A.num(d.weeklyLoss, 0.5),
    };
    A.state.profile = profile;
    A.state.targets = A.computeTargets(profile);
    A.state.onboarded = true;
    A.state.meta.startDate = A.todayISO();
    A.state.meta.startWeight = profile.weight;
    const existing = A.state.weights.find((item) => item.date === A.todayISO());
    if (!existing) {
      A.state.weights.push({
        id: A.uid(),
        date: A.todayISO(),
        weight: Number(profile.weight.toFixed(1)),
        waist: "",
        note: "起点",
      });
    }
    A.saveState();
    closeOnboarding();
    A.ui.foodDate = A.todayISO();
    A.ui.planDate = A.todayISO();
    renderApp({ scrollTop: 0 });
    toast("目标已建立。今天就从第一餐开始。");
  }

  function renderOnboarding() {
    if (!A.onboarding.open) {
      $("#onboardingRoot").innerHTML = "";
      return;
    }
    const step = A.onboarding.step;
    const d = A.onboarding.draft;
    const targets = A.computeTargets({
      sex: d.sex || "female",
      age: A.num(d.age, 28),
      height: A.num(d.height, 165),
      weight: A.num(d.weight, 62),
      activity: d.activity,
      weeklyLoss: d.weeklyLoss,
    });
    const totalWeeks = Math.max(1, Math.round((A.num(d.weight, 62) - A.num(d.targetWeight, 55)) / Math.max(0.1, d.weeklyLoss)));
    const ratio = targets.tdee ? Math.round((targets.kcal / targets.tdee) * 100) : 0;
    const ringC = 2 * Math.PI * 58;
    const ringOffset = ringC * (1 - A.clamp(ratio / 100, 0.45, 1));
    const stepTitles = {
      1: ["先认识一下你", "只需要几个数字，用来估算每天该吃多少。之后随时能改。"],
      2: ["你平时的节奏", "活动量和减重速度，会一起决定每天的热量缺口。"],
      3: ["这是你的起点", "不是一个必须完美的数字，而是一个能长期执行的范围。"],
    };
    const stepContent = step === 1 ? `
      <div class="step-pane">
        <div class="form-grid">
          <div class="field"><label for="obName">怎么称呼你 <span class="unit">可选</span></label><input class="input" id="obName" type="text" maxlength="20" value="${esc(d.name)}" placeholder="比如：家朋"></div>
          <div class="field"><label>性别</label>
            <div class="segmented">
              <button type="button" class="${d.sex === "female" ? "active" : ""}" data-action="ob-sex" data-value="female">女性</button>
              <button type="button" class="${d.sex === "male" ? "active" : ""}" data-action="ob-sex" data-value="male">男性</button>
            </div>
          </div>
        </div>
        <div class="form-grid three" style="margin-top:14px">
          <div class="field"><label for="obAge">年龄 <span class="unit">岁</span></label><input class="input" id="obAge" type="number" min="12" max="100" step="1" value="${esc(d.age)}" placeholder="28"></div>
          <div class="field"><label for="obHeight">身高 <span class="unit">cm</span></label><input class="input" id="obHeight" type="number" min="120" max="230" step="0.5" value="${esc(d.height)}" placeholder="165"></div>
          <div class="field"><label for="obWeight">当前体重 <span class="unit">kg</span></label><input class="input" id="obWeight" type="number" min="30" max="250" step="0.1" value="${esc(d.weight)}" placeholder="62"></div>
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div class="field"><label for="obTargetWeight">目标体重 <span class="unit">kg</span></label><input class="input" id="obTargetWeight" type="number" min="30" max="250" step="0.1" value="${esc(d.targetWeight)}" placeholder="55"></div>
          <div class="form-note">${icon("info")} 不追求极端速度。第一版会设置安全下限，避免把每日热量定得过低。</div>
        </div>
      </div>` : step === 2 ? `
      <div class="step-pane">
        <div class="card-label" style="margin-bottom:7px">日常活动量</div>
        <div class="activity-options">
          ${Q.ACTIVITY_LEVELS.map((level) => `<button type="button" class="activity-option ${Number(d.activity) === level.value ? "active" : ""}" data-action="ob-activity" data-value="${level.value}"><strong>${level.name}</strong><span>${level.desc}</span></button>`).join("")}
        </div>
        <div class="card-label" style="margin:18px 0 7px">希望的减重速度</div>
        <div class="rate-options">
          ${Q.LOSS_RATES.map((rate) => `<button type="button" class="rate-option ${Number(d.weeklyLoss) === rate.value ? "active" : ""}" data-action="ob-rate" data-value="${rate.value}"><strong>${rate.name}</strong><span>${rate.desc}</span></button>`).join("")}
        </div>
        <div class="form-note" style="margin-top:16px">${icon("info")} 以每周 0.25–0.75 kg 为宜。速度越快，越需要关注饥饿感、训练状态和睡眠。</div>
      </div>` : `
      <div class="step-pane">
        <div class="result-panel">
          <div class="result-ring-wrap">
            <svg class="result-ring" viewBox="0 0 146 146" aria-hidden="true">
              <circle class="track" cx="73" cy="73" r="58"/>
              <circle class="bar" cx="73" cy="73" r="58" stroke-dasharray="${ringC.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}"/>
            </svg>
            <div class="result-ring-center"><strong>${formatNumber(targets.kcal)}</strong><span>千卡 / 天</span></div>
          </div>
          <div class="result-copy">
            <h3>你的每日目标</h3>
            <p class="muted" style="font-size:9px;margin-top:2px">约为维持热量的 ${ratio}%，预计 ${totalWeeks} 周接近目标。</p>
            <div class="result-macros">
              <div class="result-macro"><strong>${targets.protein}g</strong><span>蛋白质</span></div>
              <div class="result-macro"><strong>${targets.carbs}g</strong><span>碳水</span></div>
              <div class="result-macro"><strong>${targets.fat}g</strong><span>脂肪</span></div>
            </div>
          </div>
        </div>
        <div class="result-note">${icon("sparkle")} 目标不是越低越好。轻燃会把 ${targets.floor} 千卡作为自动计算的安全下限；如果过程中持续疲劳或头晕，记得把节奏放慢。</div>
        <div class="form-grid three" style="margin-top:15px">
          <div><div class="card-label">当前</div><strong style="font-family:var(--font-display);font-size:20px">${A.num(d.weight, 0).toFixed(1)}<span style="font-family:var(--font-sans);font-size:8px;color:var(--muted-2)"> kg</span></strong></div>
          <div><div class="card-label">目标</div><strong style="font-family:var(--font-display);font-size:20px">${A.num(d.targetWeight, 0).toFixed(1)}<span style="font-family:var(--font-sans);font-size:8px;color:var(--muted-2)"> kg</span></strong></div>
          <div><div class="card-label">每周节奏</div><strong style="font-family:var(--font-display);font-size:20px">${d.weeklyLoss}<span style="font-family:var(--font-sans);font-size:8px;color:var(--muted-2)"> kg</span></strong></div>
        </div>
      </div>`;
    $("#onboardingRoot").innerHTML = `
      <div class="onboarding">
        <div class="onboarding-bg"></div>
        <div class="onboarding-panel">
          <aside class="onboarding-aside">
            <div class="onboarding-brand">
              <span class="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-opacity=".22"/><path d="M20 31c5.4 0 9-3.7 9-8.8 0-4.2-2.8-7.2-5.1-10C21.9 9.6 21 7.3 21.2 5c-3.5 1.7-7 5.5-7 9.7 0 2 .8 3.7 1.9 4.7-.6-2.4.3-4.4 1.9-5.8-.2 3.1 2.1 4.5 3.5 6.8.8 1.3 1.1 2.5 1.1 3.7 0 1.9-1.2 3.2-2.6 3.9" fill="currentColor" stroke="none"/></svg></span>
              <div><strong>轻燃</strong><small>QINGRAN · LOCAL</small></div>
            </div>
            <div class="onboarding-quote">
              <div class="quote-mark">“</div>
              <h2>减脂不是挨饿，<br>是把每一天吃明白。</h2>
              <p>记录、计划、回看趋势。所有数据只留在你的电脑里，不需要登录，也不上传。</p>
              <div class="onboarding-points">
                <div class="onboarding-point"><span class="dot"></span>按身体数据估算，不用自己算公式</div>
                <div class="onboarding-point"><span class="dot"></span>三餐计划可换菜、可调份量</div>
                <div class="onboarding-point"><span class="dot"></span>刷新、关闭、重启都不会丢</div>
              </div>
            </div>
          </aside>
          <main class="onboarding-main">
            <div class="onboarding-top">
              <div class="step-dots">${[1, 2, 3].map((n) => `<span class="step-dot ${n === step ? "active" : n < step ? "done" : ""}"></span>`).join("")}</div>
              <span class="step-label">第 ${step} 步 / 共 3 步</span>
            </div>
            <div class="onboarding-title"><h1>${stepTitles[step][0]}</h1><p>${stepTitles[step][1]}</p></div>
            <div class="onboarding-body">${stepContent}</div>
            <div class="onboarding-foot">
              <div class="left">
                ${step > 1 ? `<button class="btn btn-ghost btn-sm" type="button" data-action="ob-back">${icon("arrow-left")} 上一步</button>` : `<span class="privacy-note">${icon("lock")} 只保存在本机</span>`}
              </div>
              <button class="btn btn-primary" type="button" data-action="${step === 3 ? "ob-finish" : "ob-next"}">${step === 3 ? "开始使用" : "下一步"} ${icon(step === 3 ? "check" : "arrow-right")}</button>
            </div>
          </main>
        </div>
      </div>`;
    setTimeout(() => {
      const focus = step === 1 ? ($("#obName") || $(".onboarding input")) : $(".onboarding .onboarding-foot .btn-primary");
      if (focus) focus.focus({ preventScroll: true });
    }, 50);
  }

  /* =====================================================
     设置、导入与清空
     ===================================================== */
  function applyAutoTargetsToForm() {
    const profile = readSettingsProfile();
    const targets = A.computeTargets(profile);
    $("#targetKcal").value = targets.kcal;
    $("#targetProtein").value = targets.protein;
    $("#targetCarbs").value = targets.carbs;
    $("#targetFat").value = targets.fat;
    const calc = $("#settingsCalc");
    if (calc) {
      calc.innerHTML = `<div><small>估算维持热量</small><strong>${formatNumber(targets.tdee)} 千卡</strong></div><div><small>自动目标</small><strong>${formatNumber(targets.kcal)} 千卡</strong></div><div><small>安全下限</small><strong>${targets.floor} 千卡</strong></div><div><small>预计达标</small><strong>${estimateWeeks(profile)} 周</strong></div>`;
    }
  }

  function readSettingsProfile() {
    return {
      name: $("#setName")?.value.trim() || "",
      sex: $("#setSex")?.value || "female",
      age: A.num($("#setAge")?.value, 30),
      height: A.num($("#setHeight")?.value, 165),
      weight: A.num($("#setWeight")?.value, 62),
      targetWeight: A.num($("#setTargetWeight")?.value, 55),
      activity: A.num($("#setActivity")?.value, 1.375),
      weeklyLoss: A.num($("#setLoss")?.value, 0.5),
    };
  }

  function estimateWeeks(profile) {
    const diff = Number(profile.weight) - Number(profile.targetWeight);
    if (!(diff > 0) || !(profile.weeklyLoss > 0)) return "—";
    return Math.max(1, Math.round(diff / profile.weeklyLoss));
  }

  function saveSettings(event) {
    event.preventDefault();
    const profile = readSettingsProfile();
    if (!(profile.age >= 12 && profile.age <= 100)) return toast("年龄请填写 12–100 岁。", "danger");
    if (!(profile.height >= 120 && profile.height <= 230)) return toast("身高请填写 120–230 cm。", "danger");
    if (!(profile.weight >= 30 && profile.weight <= 250)) return toast("体重请填写 30–250 kg。", "danger");
    if (!(profile.targetWeight >= 30 && profile.targetWeight <= 250)) return toast("目标体重请填写 30–250 kg。", "danger");
    if (profile.targetWeight >= profile.weight) return toast("目标体重需要低于当前体重。", "danger");
    const manual = $("#manualSwitch")?.classList.contains("on");
    let manualTargets = null;
    if (manual) {
      const kcal = A.num($("#targetKcal")?.value, 0);
      const protein = A.num($("#targetProtein")?.value, 0);
      const carbs = A.num($("#targetCarbs")?.value, 0);
      const fat = A.num($("#targetFat")?.value, 0);
      if (kcal < 1000 || kcal > 5000) return toast("热量目标建议在 1000–5000 千卡之间。", "danger");
      if (protein < 30 || protein > 300 || carbs < 20 || carbs > 500 || fat < 20 || fat > 150) return toast("营养目标数值超出了可记录范围。", "danger");
      manualTargets = { manual: true, kcal, protein, carbs, fat, floor: profile.sex === "male" ? 1500 : 1200 };
    }
    const oldWeight = A.state.profile.weight;
    A.state.profile = Object.assign({}, A.state.profile, profile);
    A.state.targets = manual ? manualTargets : A.computeTargets(profile);
    if (Math.abs(profile.weight - oldWeight) >= 0.05) {
      A.state.weights = A.state.weights.filter((item) => item.date !== A.todayISO());
      A.state.weights.push({ id: A.uid(), date: A.todayISO(), weight: Number(profile.weight.toFixed(1)), waist: "", note: "设置中更新" });
      A.state.profile.weight = profile.weight;
      if (!A.state.targets.manual) A.state.targets = A.computeTargets(A.state.profile);
    }
    if (!A.state.meta.startWeight) A.state.meta.startWeight = profile.weight;
    A.saveState();
    rerender();
    toast("设置已保存，每日目标已更新");
  }

  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const data = parsed.data && parsed.data.profile ? parsed.data : parsed;
        if (!data || !data.profile || !data.targets) throw new Error("invalid");
        pendingImport = parsed;
        confirmDialog({
          title: "导入备份",
          message: `备份里有 <strong>${Object.keys(data.days || {}).length}</strong> 天的饮食记录和 <strong>${(data.weights || []).length}</strong> 条体重记录。导入会<strong>覆盖</strong>当前所有数据，建议先导出当前备份。`,
          confirmText: "覆盖并导入",
          danger: true,
          onConfirm: () => {
            if (A.importData(pendingImport)) {
              A.ui.foodDate = A.todayISO();
              A.ui.planDate = A.todayISO();
              renderApp({ scrollTop: 0 });
              if (!A.state.onboarded) openOnboarding();
              toast("备份已导入");
            } else {
              toast("这个文件不是有效的轻燃备份", "danger");
            }
            pendingImport = null;
          },
        });
      } catch (err) {
        toast("无法读取这个备份文件，请确认文件没有损坏", "danger");
      }
    };
    reader.readAsText(file);
  }

  function resetAllData() {
    confirmDialog({
      title: "清空全部数据",
      message: "这会删除个人资料、所有饮食记录、饮食计划、体重和备忘录，<strong>无法恢复</strong>。如果还没有导出备份，建议先取消并导出。",
      confirmText: "确认清空",
      danger: true,
      onConfirm: () => {
        A.resetState();
        A.ui.foodDate = A.todayISO();
        A.ui.planDate = A.todayISO();
        A.ui.dataTab = "trend";
        closeModal(false);
        navigate("home");
        renderApp({ scrollTop: 0 });
        openOnboarding();
        toast("所有数据已清空，可以重新建立目标");
      },
    });
  }

  /* =====================================================
     全局事件
     ===================================================== */
  document.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl || actionEl.disabled) return;
    const action = actionEl.dataset.action;
    const data = actionEl.dataset;
    switch (action) {
      case "close-overlay":
        if (data.close === "modal") closeModal();
        else closeDrawer();
        break;
      case "close-modal":
        closeModal();
        break;
      case "close-drawer":
        closeDrawer();
        break;
      case "file-warning-dismiss":
        $("#onboardingRoot").innerHTML = "";
        document.body.classList.remove("no-scroll");
        openOnboarding();
        break;
      case "open-add-food":
        openAddFood({ date: data.date || A.todayISO(), meal: data.meal || defaultMealForNow() });
        break;
      case "edit-log":
        openAddFood({ date: data.date, meal: data.meal, editId: data.id });
        break;
      case "delete-log": {
        const entry = A.findEntry(data.date, data.id);
        if (!entry) break;
        confirmDialog({
          title: "删除这条记录",
          message: `确定删除 <strong>${esc(entry.item.name)}</strong> 吗？删除后今日热量会立即重算。`,
          confirmText: "删除",
          danger: true,
          onConfirm: () => {
            A.removeDayEntry(data.date, data.meal, data.id);
            A.saveState();
            rerender();
            toast("饮食记录已删除");
          },
        });
        break;
      }
      case "shift-date": {
        const kind = data.kind || "food";
        const current = kind === "food" ? A.ui.foodDate : A.ui.planDate;
        const max = kind === "food" ? A.todayISO() : A.addDays(A.todayISO(), 7);
        const next = A.addDays(current, Number(data.delta) || 0);
        if (next > max) return;
        if (kind === "food") A.ui.foodDate = next;
        else A.ui.planDate = next;
        rerender();
        break;
      }
      case "go-today": {
        if (data.kind === "plan") A.ui.planDate = A.todayISO();
        else A.ui.foodDate = A.todayISO();
        rerender();
        break;
      }
      case "memo-chip": {
        const input = $("#memoInput");
        if (input) {
          input.value = data.text || "";
          input.focus();
        }
        break;
      }
      case "delete-memo":
        A.deleteMemo(data.id);
        A.saveState();
        rerender();
        toast("备忘录已删除");
        break;
      case "open-weight":
        openWeightModal();
        break;
      case "edit-weight":
        openWeightModal(data.id);
        break;
      case "set-data-tab":
        A.ui.dataTab = data.tab;
        rerender({ top: 0 });
        break;
      case "set-library-cat":
        A.ui.library.cat = data.cat;
        rerender();
        break;
      case "set-library-tag":
        A.ui.library.tag = data.tag;
        rerender();
        break;
      case "clear-library-search":
        A.ui.library.query = "";
        rerender();
        break;
      case "open-custom-food":
        openCustomFood();
        break;
      case "edit-custom-food":
        openCustomFood(data.food);
        break;
      case "delete-custom-food": {
        const food = A.foodById(data.food);
        if (!food) break;
        confirmDialog({
          title: "删除自定义食物",
          message: `删除 <strong>${esc(food.name)}</strong> 后，它不会出现在食物库里；已有的饮食记录仍会保留。`,
          confirmText: "删除",
          danger: true,
          onConfirm: () => {
            A.state.customFoods = A.state.customFoods.filter((item) => item.id !== data.food);
            A.saveState();
            closeModal(false);
            rerender();
            toast("自定义食物已删除");
          },
        });
        break;
      }
      case "open-food-detail":
        openFoodDetail(data.food);
        break;
      case "quick-add-food":
        openAddFood({ date: A.todayISO(), meal: defaultMealForNow(), foodId: data.food });
        break;
      case "detail-add":
        closeModal(false);
        openAddFood({ date: A.todayISO(), meal: defaultMealForNow(), foodId: data.food });
        break;
      case "generate-plan":
        generatePlan(data.date || A.todayISO());
        break;
      case "regen-plan": {
        const date = data.date || A.ui.planDate;
        const plan = A.getPlan(date);
        if (plan && plan.locks && plan.locks.breakfast && plan.locks.lunch && plan.locks.dinner) {
          toast("三餐都已锁定，先解锁再生成", "danger");
          break;
        }
        confirmDialog({
          title: "重新生成计划",
          message: "未锁定的餐次会被替换；已经应用到饮食的记录不会改变。要继续吗？",
          confirmText: "重新生成",
          danger: false,
          onConfirm: () => generatePlan(date, { regenerated: true, preserveLocks: true }),
        });
        break;
      }
      case "toggle-plan-lock": {
        const plan = A.getPlan(data.date);
        if (!plan) break;
        plan.locks = plan.locks || {};
        plan.locks[data.meal] = !plan.locks[data.meal];
        A.saveState();
        rerender();
        toast(plan.locks[data.meal] ? `${A.mealByKey(data.meal).name}已锁定，重新生成时会保留` : `${A.mealByKey(data.meal).name}已解锁`);
        break;
      }
      case "adjust-plan":
        A.adjustPlanItem(data.date, data.meal, data.item, Number(data.dir));
        A.saveState();
        rerender();
        break;
      case "swap-plan":
        openSwapModal(data.date, data.meal, data.item);
        break;
      case "choose-swap":
        if (swapCtx) {
          A.swapPlanItem(swapCtx.date, swapCtx.mealKey, swapCtx.itemId, data.food);
          const plan = A.getPlan(swapCtx.date);
          if (plan && plan.meals[swapCtx.mealKey]) plan.meals[swapCtx.mealKey].title = "自定义搭配";
          A.saveState();
          closeModal(false);
          rerender();
          toast("已换成新的食物，热量已尽量保持");
          swapCtx = null;
        }
        break;
      case "apply-plan":
        applyPlan(data.date || A.ui.planDate);
        break;
      case "copy-yesterday": {
        const from = A.addDays(data.date, -1);
        const count = A.dayTotals(A.getDay(from)).count;
        if (!count) {
          toast("前一天没有饮食记录");
          break;
        }
        const doCopy = () => {
          const added = A.copyDay(from, data.date);
          A.saveState();
          rerender();
          toast(`已从${A.formatDateShort(from)}复制 ${added} 样食物`);
        };
        if (A.hasDayFood(data.date)) {
          confirmDialog({
            title: "追加前一天的饮食",
            message: `会把 ${A.formatDateShort(from)} 的 <strong>${count}</strong> 样食物追加到当前记录，不会删除已有内容。`,
            confirmText: "追加",
            danger: false,
            onConfirm: doCopy,
          });
        } else doCopy();
        break;
      }
      case "clear-day":
        confirmDialog({
          title: "清空这一天的饮食",
          message: "会删除这一天的全部饮食记录，无法撤销。确定继续吗？",
          confirmText: "清空",
          danger: true,
          onConfirm: () => {
            A.clearDay(data.date);
            A.saveState();
            rerender();
            toast("这一天的饮食记录已清空");
          },
        });
        break;
      case "export-data":
        A.exportData();
        toast("备份已导出，请保存到安全的位置");
        break;
      case "import-data":
        $("#importFile")?.click();
        break;
      case "reset-data":
        resetAllData();
        break;
      case "open-settings":
        navigate("data", { dataTab: "settings" });
        break;
      case "set-form-sex": {
        const value = data.value === "male" ? "male" : "female";
        $("#setSex").value = value;
        $$("[data-segmented=sex] button").forEach((btn) => btn.classList.toggle("active", btn.dataset.value === value));
        if (!$("#manualSwitch")?.classList.contains("on")) applyAutoTargetsToForm();
        break;
      }
      case "toggle-manual": {
        const switchEl = $("#manualSwitch");
        if (!switchEl) break;
        const on = !switchEl.classList.contains("on");
        switchEl.classList.toggle("on", on);
        actionEl.setAttribute("aria-pressed", String(on));
        $$(".target-input").forEach((input) => { input.readOnly = !on; });
        if (!on) applyAutoTargetsToForm();
        break;
      }
      case "drawer-meal":
        setDrawerMeal(data.meal);
        break;
      case "drawer-cat":
        if (addFoodCtx) {
          addFoodCtx.cat = data.cat;
          $$(".drawer-filters .mini-filter").forEach((btn) => btn.classList.toggle("active", btn.dataset.cat === data.cat));
          filterDrawer();
        }
        break;
      case "choose-drawer-food":
        if (addFoodCtx) {
          const food = A.foodById(data.food);
          addFoodCtx.foodId = data.food;
          addFoodCtx.grams = food && food.unit && food.unit.grams ? food.unit.grams : 100;
          addFoodCtx.unitMode = food && food.unit && food.unit.label !== "份" ? "unit" : "gram";
          addFoodCtx.mode = "detail";
          renderAddDrawer();
        }
        break;
      case "drawer-back":
        if (addFoodCtx) {
          addFoodCtx.mode = "browse";
          addFoodCtx.foodId = null;
          addFoodCtx.grams = null;
          renderAddDrawer();
        }
        break;
      case "drawer-unit":
        if (addFoodCtx) {
          const food = A.foodById(addFoodCtx.foodId) || A._snapshotFood;
          if (!food || !food.unit || !food.unit.grams) break;
          readPortionInput();
          addFoodCtx.unitMode = data.mode === "unit" ? "unit" : "gram";
          const input = $("#portionValue");
          if (input) {
            input.value = addFoodCtx.unitMode === "unit" ? A.round(addFoodCtx.grams / food.unit.grams, 1) : Math.round(addFoodCtx.grams);
            input.step = addFoodCtx.unitMode === "unit" ? "0.5" : "1";
          }
          $("#portionUnit").textContent = addFoodCtx.unitMode === "unit" ? food.unit.label : "克";
          $$("[data-action=drawer-unit]").forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === addFoodCtx.unitMode));
          updatePortionUI();
        }
        break;
      case "drawer-step":
        if (addFoodCtx) {
          const food = A.foodById(addFoodCtx.foodId) || A._snapshotFood;
          const dir = Number(data.dir) || 1;
          readPortionInput();
          if (!food) break;
          if (addFoodCtx.unitMode === "unit" && food.unit && food.unit.grams) {
            addFoodCtx.grams = Math.max(1, Math.round(addFoodCtx.grams + dir * food.unit.grams * 0.5));
            const input = $("#portionValue");
            if (input) input.value = A.round(addFoodCtx.grams / food.unit.grams, 1);
          } else {
            addFoodCtx.grams = Math.max(1, Math.round(addFoodCtx.grams + dir * (food.step || 10)));
            const input = $("#portionValue");
            if (input) input.value = Math.round(addFoodCtx.grams);
          }
          updatePortionUI();
        }
        break;
      case "confirm-add-food": {
        readPortionInput();
        if (!addFoodCtx) break;
        const food = A.foodById(addFoodCtx.foodId) || A._snapshotFood;
        if (!food) break;
        if (addFoodCtx.grams > 1000) {
          toast("单次份量超过 1000 克，请检查是不是把克数填成了份数", "danger");
          $("#portionValue")?.focus();
          return;
        }
        const ctx = addFoodCtx;
        if (ctx.editId) {
          A.updateDayEntry(ctx.date, ctx.oldMeal, ctx.editId, ctx.meal, food, ctx.grams);
        } else {
          A.addFoodToDay(ctx.date, ctx.meal, food, ctx.grams, "manual");
        }
        A.saveState();
        closeDrawer(false);
        addFoodCtx = null;
        rerender();
        toast(ctx.editId ? "记录已更新" : `${A.mealByKey(ctx.meal).name}已记录`);
        break;
      }
      case "drawer-delete":
        if (!addFoodCtx || !addFoodCtx.editId) break;
        confirmDialog({
          title: "删除这条记录",
          message: "这条饮食记录会从当天删除，无法撤销。",
          confirmText: "删除",
          danger: true,
          onConfirm: () => {
            const ctx = addFoodCtx;
            A.removeDayEntry(ctx.date, ctx.oldMeal, ctx.editId);
            A.saveState();
            closeModal(false);
            closeDrawer(false);
            addFoodCtx = null;
            rerender();
            toast("饮食记录已删除");
          },
        });
        break;
      case "drawer-custom":
        closeDrawer(false);
        setTimeout(() => openCustomFood(), 80);
        break;
      case "confirm-yes": {
        const callback = confirmCallback;
        confirmCallback = null;
        closeModal(false);
        if (callback) callback();
        break;
      }
      case "delete-weight":
        confirmDialog({
          title: "删除体重记录",
          message: "删除后趋势会重新计算。确定删除这条记录吗？",
          confirmText: "删除",
          danger: true,
          onConfirm: () => {
            A.deleteWeight(data.id);
            A.saveState();
            closeModal(false);
            rerender();
            toast("体重记录已删除");
          },
        });
        break;
      case "ob-sex":
        selectOnboardingSex(data.value);
        break;
      case "ob-activity":
        A.onboarding.draft.activity = Number(data.value);
        renderOnboarding();
        break;
      case "ob-rate":
        A.onboarding.draft.weeklyLoss = Number(data.value);
        renderOnboarding();
        break;
      case "ob-next": {
        if (A.onboarding.step === 1) {
          const error = validateOnboardingBasics();
          if (error) {
            toast(error, "danger");
            return;
          }
        } else {
          syncOnboardingInputs();
        }
        A.onboarding.step = Math.min(3, A.onboarding.step + 1);
        renderOnboarding();
        break;
      }
      case "ob-back":
        A.onboarding.step = Math.max(1, A.onboarding.step - 1);
        renderOnboarding();
        break;
      case "ob-finish":
        finishOnboarding();
        break;
      default:
        break;
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "librarySearch") {
      A.ui.library.query = target.value;
      applyLibrarySearch();
    } else if (target.id === "drawerSearch") {
      filterDrawer();
    } else if (target.id === "portionValue") {
      readPortionInput();
      updatePortionUI();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "foodDateInput") {
      if (!target.value) return;
      const next = target.value > A.todayISO() ? A.todayISO() : target.value;
      A.ui.foodDate = next;
      rerender({ top: 0 });
    } else if (target.id === "planDateInput") {
      if (!target.value) return;
      const max = A.addDays(A.todayISO(), 7);
      A.ui.planDate = target.value > max ? max : target.value;
      rerender({ top: 0 });
    } else if (target.id === "librarySort") {
      A.ui.library.sort = target.value;
      rerender();
    } else if (target.id === "importFile") {
      importFile(target.files && target.files[0]);
      target.value = "";
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || !form.id) return;
    if (form.id === "memoForm") {
      event.preventDefault();
      const input = $("#memoInput");
      if (!input || !input.value.trim()) {
        input?.focus();
        return;
      }
      A.addMemo(input.value);
      A.saveState();
      rerender();
      setTimeout(() => $("#memoInput")?.focus({ preventScroll: true }), 60);
      toast("已记到备忘录");
    } else if (form.id === "settingsForm") {
      saveSettings(event);
    } else if (form.id === "weightForm") {
      event.preventDefault();
      const id = form.dataset.weightId;
      const date = $("#weightDate").value;
      const weight = A.num($("#weightValue").value, 0);
      if (!date) return toast("请选择日期", "danger");
      if (!(weight >= 30 && weight <= 250)) return toast("体重请填写 30–250 kg。", "danger");
      if (date > A.todayISO()) return toast("不能记录未来的体重", "danger");
      const entry = {
        date,
        weight: A.round(weight, 1),
        waist: $("#waistValue").value ? A.round(A.num($("#waistValue").value), 1) : "",
        note: $("#weightNote").value.trim(),
      };
      if (id) {
        const old = A.state.weights.find((item) => item.id === id);
        if (old) {
          const oldDate = old.date;
          Object.assign(old, entry, { id });
          if (oldDate !== date) {
            A.state.weights = A.state.weights.filter((item) => item.id === id || item.date !== date);
          }
        }
        const latest = A.latestWeightEntry();
        if (latest) A.state.profile.weight = Number(latest.weight);
        if (!A.state.targets.manual) A.state.targets = A.computeTargets(A.state.profile);
      } else {
        const existing = A.state.weights.find((item) => item.date === date);
        if (existing) Object.assign(existing, entry, { id: existing.id });
        else A.state.weights.push(Object.assign({ id: A.uid() }, entry));
        const latest = A.latestWeightEntry();
        if (latest) A.state.profile.weight = Number(latest.weight);
        if (!A.state.targets.manual) A.state.targets = A.computeTargets(A.state.profile);
      }
      if (!A.state.meta.startDate) A.state.meta.startDate = A.todayISO();
      if (!A.state.meta.startWeight) A.state.meta.startWeight = weight;
      A.saveState();
      closeModal(false);
      rerender();
      toast(id ? "体重记录已更新" : "体重已记录，趋势会慢慢出现");
    } else if (form.id === "customFoodForm") {
      event.preventDefault();
      const name = $("#customName").value.trim();
      const kcal = A.num($("#customKcal").value, -1);
      const p = A.num($("#customP").value, -1);
      const c = A.num($("#customC").value, -1);
      const f = A.num($("#customF").value, -1);
      if (!name) return toast("给食物起个名字", "danger");
      if (kcal < 0 || kcal > 900) return toast("热量请填写 0–900 千卡。", "danger");
      if ([p, c, f].some((n) => n < 0 || n > 100)) return toast("蛋白质、碳水、脂肪请填写 0–100 克。", "danger");
      const unitLabel = $("#customUnitLabel").value.trim() || "份";
      const unitGrams = A.num($("#customUnitGrams").value, 100);
      if (!(unitGrams > 0 && unitGrams <= 2000)) return toast("份量克数请填写 1–2000。", "danger");
      const tags = $("#customTags").value.split(/[，,]/).map((t) => t.trim()).filter(Boolean).slice(0, 4);
      const id = form.dataset.foodId;
      const existing = id ? A.state.customFoods.find((food) => food.id === id) : null;
      const payload = {
        id: existing ? existing.id : `custom_${A.uid()}`,
        name,
        cat: $("#customCat").value,
        kcal: Math.round(kcal),
        p: A.round(p, 1),
        c: A.round(c, 1),
        f: A.round(f, 1),
        unit: { label: unitLabel, grams: Math.round(unitGrams) },
        step: Math.max(5, Math.round(unitGrams / 2 / 5) * 5),
        tags,
        role: $("#customCat").value,
        meals: [],
        custom: true,
      };
      if (existing) Object.assign(existing, payload);
      else A.state.customFoods.push(payload);
      A.saveState();
      closeModal(false);
      rerender();
      toast(existing ? "食物信息已更新" : "已加入食物库");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if ($("#modalRoot .modal")) {
        closeModal();
        return;
      }
      if ($("#overlayRoot .drawer")) {
        closeDrawer();
        return;
      }
    }
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = ["input", "textarea", "select"].includes(tag) || event.target.isContentEditable;
    if ((event.key === "n" || event.key === "N") && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!A.onboarding.open) {
        event.preventDefault();
        openAddFood({ date: A.todayISO(), meal: defaultMealForNow() });
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && event.target.id === "memoInput") {
      event.preventDefault();
      $("#memoForm")?.requestSubmit();
    }
    if (event.key === "Enter" && (event.target.classList.contains("food-card")) && !typing) {
      event.preventDefault();
      event.target.click();
    }
  });

  /* =====================================================
     搜索过滤与页面内小工具
     ===================================================== */
  function applyLibrarySearch() {
    const query = String(A.ui.library.query || "").trim().toLowerCase();
    let count = 0;
    $$("#foodGrid .food-card").forEach((card) => {
      const match = !query || card.dataset.search.includes(query);
      card.classList.toggle("hidden", !match);
      if (match) count += 1;
    });
    const countEl = $("#libraryCount");
    if (countEl) countEl.textContent = count;
    $("#libraryNoMatch")?.classList.toggle("hidden", count > 0);
    $("#libraryClear")?.classList.toggle("hidden", !query);
  }

  function defaultMealForNow() {
    const h = new Date().getHours();
    if (h < 10) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 21) return "dinner";
    return "snack";
  }

  /* =====================================================
     顶栏与初始化
     ===================================================== */
  function showFileWarning() {
    document.body.classList.add("no-scroll");
    $("#onboardingRoot").innerHTML = `
      <div class="onboarding file-warning-screen">
        <div class="onboarding-bg"></div>
        <div class="file-warning-card">
          <div class="onboarding-brand" style="color:var(--green)">
            <span class="brand-mark" style="background:var(--sage-soft);color:var(--sage-deep);border-color:#dbe7d3">
              <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-opacity=".2"/><path d="M20 31c5.4 0 9-3.7 9-8.8 0-4.2-2.8-7.2-5.1-10C21.9 9.6 21 7.3 21.2 5c-3.5 1.7-7 5.5-7 9.7 0 2 .8 3.7 1.9 4.7-.6-2.4.3-4.4 1.9-5.8-.2 3.1 2.1 4.5 3.5 6.8.8 1.3 1.1 2.5 1.1 3.7 0 1.9-1.2 3.2-2.6 3.9" fill="currentColor" stroke="none"/></svg>
            </span>
            <div><strong style="font-size:19px;letter-spacing:.15em">轻燃</strong><small style="display:block;color:var(--muted-2);font-size:7px;letter-spacing:.3em;margin-top:3px">QINGRAN · LOCAL</small></div>
          </div>
          <div class="file-warning-icon">${icon("lock")}</div>
          <h1>请通过启动器打开</h1>
          <p>你是直接双击了 <code>index.html</code>。Chrome 会禁止网页在这种方式下保存数据，刷新后记录就会丢。</p>
          <div class="file-warning-step">
            <span>1</span>
            <div><strong>关闭这个页面</strong><small>回到“轻燃”文件夹</small></div>
          </div>
          <div class="file-warning-step">
            <span>2</span>
            <div><strong>双击“启动轻燃.bat”</strong><small>浏览器会自动打开正确地址，数据写入本机文件</small></div>
          </div>
          <div class="file-warning-foot">
            <button class="btn btn-ghost btn-sm" type="button" data-action="file-warning-dismiss">仍然预览（不会保存）</button>
            <span class="privacy-note">${icon("info")} 不需要联网</span>
          </div>
        </div>
      </div>`;
  }

  async function init() {
    A.ui.route = routeFromHash();
    $("#topbarDate").innerHTML = A.renderTopbarDate();
    $("#globalAddFood").addEventListener("click", () => openAddFood({ date: A.todayISO(), meal: defaultMealForNow() }));
    $("#topSettings").addEventListener("click", () => navigate("data", { dataTab: "settings" }));
    $("#sidebarProfile").addEventListener("click", () => navigate("data", { dataTab: "settings" }));
    $("#topbarMemo").addEventListener("click", () => {
      if (A.ui.route !== "home") navigate("home");
      setTimeout(() => {
        $("#memoInput")?.scrollIntoView({ behavior: "smooth", block: "center" });
        $("#memoInput")?.focus({ preventScroll: true });
      }, A.ui.route === "home" ? 80 : 240);
    });
    if (location.protocol === "file:") {
      renderApp({ scrollTop: 0 });
      showFileWarning();
      return;
    }
    const sync = await A.syncFromServer();
    if (sync.restored) {
      A.onboarding.open = false;
      $("#onboardingRoot").innerHTML = "";
      setNoScroll();
    }
    renderApp({ scrollTop: 0 });
    if (!A.state.onboarded) openOnboarding();
    if (sync.restored) toast("已从本机数据文件恢复最新记录");
  }

  init();
})();
