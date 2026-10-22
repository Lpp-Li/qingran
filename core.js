/* 轻燃 · 状态、计算与持久化 */
(function () {
  "use strict";
  const Q = window.QINGRAN;
  const A = (window.Qingran = window.Qingran || {});
  const APP = Q.APP;
  const MS_DAY = 24 * 60 * 60 * 1000;

  /* ---------------- 基础工具 ---------------- */
  A.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  A.sum = (arr, fn) => arr.reduce((total, item) => total + (fn ? fn(item) : item), 0);
  A.round = (n, digits = 0) => {
    const factor = Math.pow(10, digits);
    return Math.round((Number(n) || 0) * factor) / factor;
  };
  A.uid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  };
  A.esc = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  A.num = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  A.formatNumber = (n) => new Intl.NumberFormat("zh-CN").format(Math.round(Number(n) || 0));
  A.formatDecimal = (n, digits = 1) => (Number(n) || 0).toFixed(digits);
  A.icon = (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  /* ---------------- 日期 ---------------- */
  A.todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  A.parseISO = (iso) => {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d, 12, 0, 0);
  };
  A.addDays = (iso, delta) => {
    const d = A.parseISO(iso);
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  A.weekday = (iso) => "周" + ["日", "一", "二", "三", "四", "五", "六"][A.parseISO(iso).getDay()];
  A.formatDateLong = (iso) => {
    const d = A.parseISO(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };
  A.formatDateFull = (iso) => {
    const d = A.parseISO(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${A.weekday(iso)}`;
  };
  A.formatDateShort = (iso) => `${A.parseISO(iso).getMonth() + 1}月${A.parseISO(iso).getDate()}日`;
  A.dateTag = (iso) => {
    const today = A.todayISO();
    if (iso === today) return "今天";
    if (iso === A.addDays(today, -1)) return "昨天";
    if (iso === A.addDays(today, 1)) return "明天";
    return A.weekday(iso);
  };
  A.daysBetween = (from, to) => Math.round((A.parseISO(to) - A.parseISO(from)) / MS_DAY);
  A.todayFull = () => A.formatDateFull(A.todayISO());
  A.nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  A.greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return "夜深了";
    if (h < 11) return "早上好";
    if (h < 13) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  };
  A.memoTime = (isoString) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (iso === A.todayISO()) return `今天 ${time}`;
    if (iso === A.addDays(A.todayISO(), -1)) return `昨天 ${time}`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
  };

  /* ---------------- 状态 ---------------- */
  const emptyMeals = () => ({ breakfast: [], lunch: [], dinner: [], snack: [] });

  A.emptyMeals = emptyMeals;
  A.initialState = () => ({
    version: APP.version,
    onboarded: false,
    profile: {
      name: "",
      sex: "female",
      age: 28,
      height: 165,
      weight: 62,
      targetWeight: 55,
      activity: 1.375,
      weeklyLoss: 0.5,
    },
    targets: { manual: false, kcal: 1500, protein: 95, carbs: 160, fat: 50 },
    days: {},
    plans: {},
    weights: [],
    memos: [],
    customFoods: [],
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), startDate: null, startWeight: null },
  });

  A.loadState = () => {
    try {
      const raw = localStorage.getItem(APP.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (err) {
      console.warn("读取本地数据失败", err);
      return null;
    }
  };

  function normalizeState(loaded) {
    const base = A.initialState();
    const merged = Object.assign({}, base, loaded || {});
    merged.profile = Object.assign({}, base.profile, loaded && loaded.profile);
    merged.targets = Object.assign({}, base.targets, loaded && loaded.targets);
    merged.meta = Object.assign({}, base.meta, loaded && loaded.meta);
    merged.days = merged.days && typeof merged.days === "object" ? merged.days : {};
    merged.plans = merged.plans && typeof merged.plans === "object" ? merged.plans : {};
    merged.weights = Array.isArray(merged.weights) ? merged.weights : [];
    merged.memos = Array.isArray(merged.memos) ? merged.memos : [];
    merged.customFoods = Array.isArray(merged.customFoods) ? merged.customFoods : [];
    Object.keys(merged.days).forEach((date) => {
      const day = merged.days[date] || {};
      day.meals = Object.assign(emptyMeals(), day.meals || {});
      Object.keys(day.meals).forEach((meal) => {
        if (!Array.isArray(day.meals[meal])) day.meals[meal] = [];
      });
      merged.days[date] = day;
    });
    return merged;
  }

  A.state = normalizeState(A.loadState());
  A.storageAvailable = true;

  A.saveState = () => {
    A.state.meta.updatedAt = new Date().toISOString();
    const pill = document.getElementById("savePill");
    if (pill) {
      pill.classList.add("saving");
      pill.querySelector("span:last-child").textContent = "正在保存";
      window.clearTimeout(A._saveTimer);
      A._saveTimer = window.setTimeout(() => {
        pill.classList.remove("saving");
        pill.querySelector("span:last-child").textContent = "本地已保存";
      }, 460);
    }
    let localOk = true;
    try {
      localStorage.setItem(APP.storageKey, JSON.stringify(A.state));
      A.storageAvailable = true;
    } catch (err) {
      localOk = false;
      A.storageAvailable = false;
      console.error("写入浏览器本地数据失败", err);
    }
    A.queueServerSave();
    return localOk;
  };

  /* 数据同时写入本机 data/state.json。服务没有启动时静默退回浏览器存储。 */
  A.serverReachable = false;
  A.queueServerSave = () => {
    if (location.protocol === "file:") return;
    window.clearTimeout(A._serverSaveTimer);
    A._serverSaveTimer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(A.state),
        });
        A.serverReachable = res.ok;
      } catch (err) {
        A.serverReachable = false;
      }
    }, 420);
  };

  A.syncFromServer = async () => {
    if (location.protocol === "file:") return { restored: false, reason: "file" };
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      A.serverReachable = res.ok;
      if (res.status === 404) {
        if (A.state.onboarded) A.queueServerSave();
        return { restored: false, reason: "empty" };
      }
      if (!res.ok) return { restored: false, reason: "error" };
      const serverState = await res.json();
      if (!serverState || !serverState.profile || !serverState.targets) return { restored: false, reason: "invalid" };
      const localTime = Date.parse(A.state.meta.updatedAt || 0) || 0;
      const serverTime = Date.parse(serverState.meta && serverState.meta.updatedAt) || 0;
      if (!A.state.onboarded || serverTime > localTime + 800) {
        A.state = normalizeState(serverState);
        try {
          localStorage.setItem(APP.storageKey, JSON.stringify(A.state));
        } catch (err) {
          console.warn("恢复数据后写入浏览器缓存失败", err);
        }
        return { restored: true, reason: "server-newer" };
      }
      if (localTime > serverTime + 800) A.queueServerSave();
      return { restored: false, reason: "local-current" };
    } catch (err) {
      A.serverReachable = false;
      return { restored: false, reason: "offline" };
    }
  };

  A.resetState = () => {
    A.state = A.initialState();
    A.saveState();
  };

  /* ---------------- 目标计算 ---------------- */
  A.computeTargets = (profile) => {
    const sex = profile.sex === "male" ? "male" : "female";
    const weight = A.clamp(A.num(profile.weight, 60), 30, 250);
    const height = A.clamp(A.num(profile.height, 165), 120, 230);
    const age = A.clamp(A.num(profile.age, 30), 12, 100);
    const activity = A.num(profile.activity, 1.375) || 1.375;
    const weeklyLoss = A.clamp(A.num(profile.weeklyLoss, 0.5), 0.1, 1);
    const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    const tdee = bmr * activity;
    const deficit = (weeklyLoss * 7700) / 7;
    const floor = sex === "male" ? 1500 : 1200;
    const raw = tdee - deficit;
    const kcal = Math.max(floor, Math.round(raw / 10) * 10);
    let protein = Math.min(Math.round((weight * 1.6) / 5) * 5, Math.floor((kcal * 0.4) / 4));
    protein = Math.max(protein, 60);
    let fat = Math.max(35, Math.round((weight * 0.8) / 5) * 5);
    let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5;
    if (carbs < 50) {
      fat = Math.max(30, Math.floor((kcal - protein * 4 - 50 * 4) / 9 / 5) * 5);
      carbs = Math.max(30, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
    }
    return {
      manual: false,
      kcal,
      protein,
      carbs: Math.max(30, carbs),
      fat,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      floor,
    };
  };

  A.ensureTargets = () => {
    if (!A.state.targets || !A.state.targets.kcal) {
      A.state.targets = A.computeTargets(A.state.profile);
    }
    const calc = A.computeTargets(A.state.profile);
    if (!A.state.targets.tdee) A.state.targets.tdee = calc.tdee;
    if (!A.state.targets.bmr) A.state.targets.bmr = calc.bmr;
    if (!A.state.targets.floor) A.state.targets.floor = calc.floor;
    return A.state.targets;
  };

  /* ---------------- 食物库 ---------------- */
  A.allFoods = () => Q.FOODS.concat(A.state.customFoods || []);
  A.foodById = (id) => A.allFoods().find((food) => food.id === id) || null;
  A.categoryById = (id) => Q.CATEGORIES.find((cat) => cat.id === id) || Q.CATEGORIES[0];
  A.mealByKey = (key) => Q.MEALS.find((meal) => meal.key === key) || Q.MEALS[0];
  A.categoryCount = (catId) => A.allFoods().filter((food) => catId === "all" || food.cat === catId).length;
  A.searchFoods = (query, options = {}) => {
    const q = String(query || "").trim().toLowerCase();
    return A.allFoods().filter((food) => {
      if (options.cat && options.cat !== "all" && food.cat !== options.cat) return false;
      if (options.meal && Array.isArray(food.meals) && food.meals.length && !food.meals.includes(options.meal)) return false;
      if (!q) return true;
      const cat = A.categoryById(food.cat);
      return `${food.name} ${cat.name} ${(food.tags || []).join(" ")}`.toLowerCase().includes(q);
    });
  };

  A.portionLabel = (food, grams) => {
    if (!food) return `${Math.round(grams)} 克`;
    const g = Math.round(grams);
    const unit = food.unit;
    if (!unit || !unit.grams) return `${g} 克`;
    const count = g / unit.grams;
    if (Math.abs(count - Math.round(count)) < 0.02) {
      const whole = Math.round(count);
      return `${whole} ${unit.label} · ${g} 克`;
    }
    return `${g} 克`;
  };

  A.portionShort = (food, grams) => {
    if (!food) return `${Math.round(grams)} 克`;
    const g = Math.round(grams);
    const unit = food.unit;
    if (!unit || !unit.grams) return `${g} 克`;
    const count = g / unit.grams;
    if (Math.abs(count - Math.round(count)) < 0.02) return `${Math.round(count)} ${unit.label}`;
    return `${g} 克`;
  };

  A.nutritionFor = (food, grams) => {
    const factor = (Number(grams) || 0) / 100;
    return {
      kcal: Math.round(food.kcal * factor),
      protein: A.round(food.p * factor, 1),
      carbs: A.round(food.c * factor, 1),
      fat: A.round(food.f * factor, 1),
    };
  };

  /* ---------------- 每日饮食 ---------------- */
  A.getDay = (date, create = false) => {
    if (!A.state.days[date] && create) {
      A.state.days[date] = { meals: emptyMeals(), createdAt: new Date().toISOString() };
    }
    return A.state.days[date] || null;
  };

  A.dayTotals = (day) => {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    if (!day || !day.meals) return result;
    Q.MEALS.forEach((meal) => {
      (day.meals[meal.key] || []).forEach((item) => {
        result.kcal += Number(item.kcal) || 0;
        result.protein += Number(item.protein) || 0;
        result.carbs += Number(item.carbs) || 0;
        result.fat += Number(item.fat) || 0;
        result.count += 1;
      });
    });
    result.kcal = Math.round(result.kcal);
    result.protein = A.round(result.protein, 1);
    result.carbs = A.round(result.carbs, 1);
    result.fat = A.round(result.fat, 1);
    return result;
  };

  A.mealTotals = (day, mealKey) => {
    const items = day && day.meals ? day.meals[mealKey] || [] : [];
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    items.forEach((item) => {
      result.kcal += Number(item.kcal) || 0;
      result.protein += Number(item.protein) || 0;
      result.carbs += Number(item.carbs) || 0;
      result.fat += Number(item.fat) || 0;
    });
    result.kcal = Math.round(result.kcal);
    result.protein = A.round(result.protein, 1);
    result.carbs = A.round(result.carbs, 1);
    result.fat = A.round(result.fat, 1);
    return result;
  };

  A.addFoodToDay = (date, meal, food, grams, source = "manual") => {
    if (!food || !Q.MEALS.some((m) => m.key === meal)) return null;
    const day = A.getDay(date, true);
    const nutrition = A.nutritionFor(food, grams);
    const entry = {
      id: A.uid(),
      foodId: food.id,
      name: food.name,
      cat: food.cat,
      grams: Math.round(grams),
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      source,
      addedAt: new Date().toISOString(),
    };
    day.meals[meal].push(entry);
    return entry;
  };

  A.removeDayEntry = (date, meal, entryId) => {
    const day = A.getDay(date);
    if (!day || !day.meals[meal]) return false;
    const before = day.meals[meal].length;
    day.meals[meal] = day.meals[meal].filter((item) => item.id !== entryId);
    return day.meals[meal].length !== before;
  };

  A.updateDayEntry = (date, oldMeal, entryId, meal, food, grams) => {
    const day = A.getDay(date);
    if (!day) return false;
    const all = Object.values(day.meals).flat();
    const existing = all.find((item) => item.id === entryId);
    if (!existing) return false;
    Object.keys(day.meals).forEach((key) => {
      day.meals[key] = day.meals[key].filter((item) => item.id !== entryId);
    });
    const nutrition = A.nutritionFor(food, grams);
    day.meals[meal].push(
      Object.assign({}, existing, {
        foodId: food.id,
        name: food.name,
        cat: food.cat,
        grams: Math.round(grams),
        kcal: nutrition.kcal,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        addedAt: new Date().toISOString(),
      })
    );
    return true;
  };

  A.findEntry = (date, entryId) => {
    const day = A.getDay(date);
    if (!day) return null;
    for (const meal of Q.MEALS) {
      const item = (day.meals[meal.key] || []).find((entry) => entry.id === entryId);
      if (item) return { item, meal: meal.key };
    }
    return null;
  };

  A.copyDay = (fromDate, toDate) => {
    const from = A.getDay(fromDate);
    if (!from) return 0;
    const to = A.getDay(toDate, true);
    let count = 0;
    Q.MEALS.forEach((meal) => {
      (from.meals[meal.key] || []).forEach((item) => {
        to.meals[meal.key].push(
          Object.assign({}, item, {
            id: A.uid(),
            addedAt: new Date().toISOString(),
            source: "copy",
          })
        );
        count += 1;
      });
    });
    return count;
  };

  A.clearDay = (date) => {
    A.state.days[date] = { meals: emptyMeals(), createdAt: new Date().toISOString() };
  };

  /* ---------------- 体重 ---------------- */
  A.sortedWeights = () =>
    [...(A.state.weights || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  A.latestWeightEntry = () => {
    const sorted = A.sortedWeights();
    return sorted.length ? sorted[sorted.length - 1] : null;
  };
  A.weightEntriesSince = (days) => {
    const from = A.addDays(A.todayISO(), -(days - 1));
    return A.sortedWeights().filter((item) => item.date >= from);
  };
  A.upsertWeight = (entry) => {
    const existing = A.state.weights.find((item) => item.date === entry.date);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      A.state.weights.push(Object.assign({ id: A.uid() }, entry));
    }
    const latest = A.latestWeightEntry();
    if (latest && latest.date <= A.todayISO()) {
      A.state.profile.weight = Number(latest.weight) || A.state.profile.weight;
      if (!A.state.targets.manual) A.state.targets = A.computeTargets(A.state.profile);
    }
  };
  A.deleteWeight = (id) => {
    A.state.weights = A.state.weights.filter((item) => item.id !== id);
    const latest = A.latestWeightEntry();
    if (latest) A.state.profile.weight = Number(latest.weight) || A.state.profile.weight;
    if (!A.state.targets.manual) A.state.targets = A.computeTargets(A.state.profile);
  };
  A.goalProgress = () => {
    const latest = A.latestWeightEntry();
    const target = A.num(A.state.profile.targetWeight, 0);
    let start = A.num(A.state.meta.startWeight, 0);
    if (!start) {
      const sorted = A.sortedWeights();
      start = sorted.length ? A.num(sorted[0].weight, A.state.profile.weight) : A.state.profile.weight;
    }
    if (!latest || !target) return { percent: 0, start, latest: latest ? latest.weight : null, target, remain: null };
    const remain = A.round(Number(latest.weight) - target, 1);
    const total = start - target;
    const percent = total > 0 ? A.clamp(((start - Number(latest.weight)) / total) * 100, 0, 100) : 0;
    return { percent, start, latest: Number(latest.weight), target, remain };
  };

  /* ---------------- 备忘 ---------------- */
  A.addMemo = (text) => {
    const value = String(text || "").trim();
    if (!value) return false;
    A.state.memos.unshift({ id: A.uid(), text: value, createdAt: new Date().toISOString() });
    A.state.memos = A.state.memos.slice(0, 30);
    return true;
  };
  A.deleteMemo = (id) => {
    A.state.memos = A.state.memos.filter((memo) => memo.id !== id);
  };

  /* ---------------- 饮食计划 ---------------- */
  A.getPlan = (date) => A.state.plans[date] || null;

  A.planTotals = (plan) => {
    const result = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    if (!plan || !plan.meals) return result;
    Object.keys(plan.meals).forEach((key) => {
      (plan.meals[key].items || []).forEach((item) => {
        result.kcal += Number(item.kcal) || 0;
        result.protein += Number(item.protein) || 0;
        result.carbs += Number(item.carbs) || 0;
        result.fat += Number(item.fat) || 0;
      });
    });
    result.kcal = Math.round(result.kcal);
    result.protein = A.round(result.protein, 1);
    result.carbs = A.round(result.carbs, 1);
    result.fat = A.round(result.fat, 1);
    return result;
  };

  function pickTemplate(mealKey, previousTitle) {
    const pool = Q.PLAN_TEMPLATES[mealKey] || [];
    const candidates = pool.length > 1 ? pool.filter((tpl) => tpl.title !== previousTitle) : pool;
    return candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
  }

  function buildPlanMeal(mealKey, targetKcal, previousTitle) {
    const template = pickTemplate(mealKey, previousTitle);
    const target = Math.max(220, targetKcal);
    const baseKcal = A.sum(template.items, (it) => {
      const food = A.foodById(it.id);
      return food ? (food.kcal * it.grams) / 100 : 0;
    });
    const factor = A.clamp(target / (baseKcal || target), 0.66, 1.55);
    const items = template.items
      .map((it) => {
        const food = A.foodById(it.id);
        if (!food) return null;
        const step = Math.max(1, Number(food.step) || 10);
        let grams = Math.round((it.grams * factor) / step) * step;
        grams = Math.max(step, grams);
        const nutrition = A.nutritionFor(food, grams);
        return {
          id: A.uid(),
          foodId: food.id,
          name: food.name,
          cat: food.cat,
          grams,
          kcal: nutrition.kcal,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
        };
      })
      .filter(Boolean);
    return { title: template.title, items };
  }

  A.generatePlan = (date, preserveLocks = true) => {
    const target = A.ensureTargets().kcal || 1500;
    const shares = { breakfast: 0.28, lunch: 0.4, dinner: 0.32 };
    const oldPlan = A.getPlan(date);
    const locks = preserveLocks && oldPlan ? oldPlan.locks || {} : {};
    const meals = {};
    Q.MEALS.filter((m) => m.key !== "snack").forEach((meal) => {
      if (locks[meal.key] && oldPlan && oldPlan.meals[meal.key]) {
        meals[meal.key] = oldPlan.meals[meal.key];
      } else {
        const previousTitle = oldPlan && oldPlan.meals[meal.key] ? oldPlan.meals[meal.key].title : "";
        meals[meal.key] = buildPlanMeal(meal.key, target * shares[meal.key], previousTitle);
      }
    });
    A.state.plans[date] = {
      date,
      meals,
      locks,
      generatedAt: new Date().toISOString(),
      appliedAt: null,
    };
    return A.state.plans[date];
  };

  A.recalculatePlanItem = (item) => {
    const food = A.foodById(item.foodId);
    if (!food) return item;
    const nutrition = A.nutritionFor(food, item.grams);
    Object.assign(item, {
      name: food.name,
      cat: food.cat,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    });
    return item;
  };

  A.adjustPlanItem = (date, mealKey, itemId, direction) => {
    const plan = A.getPlan(date);
    if (!plan) return false;
    const item = (plan.meals[mealKey].items || []).find((it) => it.id === itemId);
    if (!item) return false;
    const food = A.foodById(item.foodId);
    const step = Math.max(1, Number(food && food.step) || 10);
    const min = Math.max(step, Number(food && food.unit && food.unit.grams) || step);
    item.grams = Math.max(min, Math.round((item.grams + direction * step) / step) * step);
    A.recalculatePlanItem(item);
    plan.appliedAt = plan.appliedAt || null;
    return true;
  };

  A.suggestSwapGrams = (targetKcal, food) => {
    if (!food) return 0;
    const step = Math.max(1, Number(food.step) || 10);
    let grams = Math.round((targetKcal / Math.max(1, food.kcal)) * 100 / step) * step;
    grams = Math.min(400, Math.max(step, grams));
    return grams;
  };

  A.swapPlanItem = (date, mealKey, itemId, newFoodId) => {
    const plan = A.getPlan(date);
    if (!plan) return false;
    const item = (plan.meals[mealKey].items || []).find((it) => it.id === itemId);
    const food = A.foodById(newFoodId);
    if (!item || !food) return false;
    const grams = A.suggestSwapGrams(item.kcal, food);
    const nutrition = A.nutritionFor(food, grams);
    Object.assign(item, {
      foodId: food.id,
      name: food.name,
      cat: food.cat,
      grams,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    });
    return true;
  };

  A.planAlternatives = (mealKey, item) => {
    const current = A.foodById(item.foodId);
    if (!current) return [];
    const currentRole = current.role || current.cat;
    return A.allFoods().filter((food) => {
      if (food.id === current.id) return false;
      if (currentRole === "vegetable" && food.role !== "vegetable") return false;
      if (food.role !== currentRole && food.cat !== current.cat) return false;
      if (["snack"].includes(food.cat)) return false;
      if (Array.isArray(food.meals) && food.meals.length && !food.meals.includes(mealKey)) return false;
      return true;
    });
  };

  A.applyPlanToDay = (date) => {
    const plan = A.getPlan(date);
    if (!plan) return 0;
    const day = A.getDay(date, true);
    let added = 0;
    Q.MEALS.forEach((meal) => {
      const mealPlan = plan.meals[meal.key];
      if (!mealPlan) return;
      (mealPlan.items || []).forEach((item) => {
        const food = A.foodById(item.foodId) || {
          id: item.foodId,
          name: item.name,
          cat: item.cat,
          kcal: item.kcal,
          p: (item.protein / Math.max(1, item.grams)) * 100,
          c: (item.carbs / Math.max(1, item.grams)) * 100,
          f: (item.fat / Math.max(1, item.grams)) * 100,
        };
        day.meals[meal.key].push(
          Object.assign({}, item, {
            id: A.uid(),
            source: "plan",
            addedAt: new Date().toISOString(),
          })
        );
        added += 1;
      });
    });
    plan.appliedAt = new Date().toISOString();
    return added;
  };

  A.hasDayFood = (date) => {
    const day = A.getDay(date);
    return !!(day && A.dayTotals(day).count);
  };

  /* ---------------- 周数据 ---------------- */
  A.lastNDays = (n, endDate = A.todayISO()) => {
    const list = [];
    for (let i = n - 1; i >= 0; i -= 1) list.push(A.addDays(endDate, -i));
    return list;
  };

  A.lastNDayTotals = (n, endDate = A.todayISO()) =>
    A.lastNDays(n, endDate).map((date) => {
      const day = A.getDay(date);
      return { date, totals: A.dayTotals(day), logged: !!(day && A.dayTotals(day).count) };
    });

  A.average = (arr) => (arr.length ? A.sum(arr) / arr.length : 0);

  /* ---------------- 导出 / 导入 ---------------- */
  A.exportData = () => {
    const payload = {
      app: "轻燃",
      exportedAt: new Date().toISOString(),
      version: APP.version,
      data: A.state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `轻燃备份-${A.todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  A.importData = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    const data = obj.data && obj.data.profile ? obj.data : obj;
    if (!data || !data.profile || !data.targets) return false;
    A.state = normalizeState(data);
    A.saveState();
    return true;
  };
})();
