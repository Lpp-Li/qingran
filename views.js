/* 轻燃 · 页面视图 */
(function () {
  "use strict";
  const A = window.Qingran;
  const Q = window.QINGRAN;
  const { icon, esc, formatNumber } = A;

  const dateSwitcher = (kind, date, max) => {
    const today = A.todayISO();
    const tag = A.dateTag(date);
    const maxDate = max || today;
    return `
      <div class="date-switcher" aria-label="切换日期">
        <button class="icon-btn" type="button" data-action="shift-date" data-kind="${kind}" data-delta="-1" aria-label="前一天">${icon("chevron-left")}</button>
        <label class="date-display">
          <span>${A.formatDateShort(date)}</span>${date === today ? "<small>今天</small>" : `<small>${tag}</small>`}
          <input type="date" id="${kind}DateInput" value="${date}" max="${maxDate}" aria-label="选择日期">
        </label>
        <button class="icon-btn" type="button" data-action="shift-date" data-kind="${kind}" data-delta="1" ${date >= maxDate ? "disabled" : ""} aria-label="后一天">${icon("chevron-right")}</button>
        ${date !== today ? `<button class="today-chip" type="button" data-action="go-today" data-kind="${kind}">回到今天</button>` : ""}
      </div>`;
  };

  const macroProgress = (label, consumed, target, cls) => {
    const pct = target > 0 ? A.clamp((consumed / target) * 100, 0, 100) : 0;
    return `
      <div class="macro-row">
        <span class="macro-name">${label}</span>
        <span class="macro-track"><span class="macro-fill ${cls}" style="width:${pct}%"></span></span>
        <span class="macro-value"><strong>${Math.round(consumed)}</strong> / ${Math.round(target)}g</span>
      </div>`;
  };

  const dailyInsight = (totals, target) => {
    const t = A.ensureTargets();
    const left = target - totals.kcal;
    const gaps = [
      { key: "protein", gap: Math.max(0, t.protein - totals.protein), unit: "蛋白质", action: "下一餐加一份鸡蛋、鱼虾或豆腐" },
      { key: "carbs", gap: Math.max(0, t.carbs - totals.carbs), unit: "碳水", action: "可以补一点糙米、燕麦或薯类" },
      { key: "fat", gap: Math.max(0, t.fat - totals.fat), unit: "脂肪", action: "加几颗坚果或半勺橄榄油就够了" },
    ].sort((a, b) => b.gap - a.gap);
    if (!totals.count) return "先记下第一餐，今天的热量账本就开始转动了。";
    if (left < -50) return `今天已超出目标 <strong>${Math.abs(left)} 千卡</strong>，不用补救，下一餐清淡一点就好。`;
    if (gaps[0].gap > 8) return `${gaps[0].unit}还差 <strong>${Math.round(gaps[0].gap)} 克</strong>，${gaps[0].action}。`;
    if (left > 280) return `今天还剩 <strong>${left} 千卡</strong>，别用零食凑数，留给一顿正经饭。`;
    return `今天的结构已经很完整，剩下 <strong>${Math.max(0, left)} 千卡</strong> 交给身体慢慢消化。`;
  };

  const statusTitle = (pct, remaining) => {
    if (pct <= 0) return "从第一餐开始";
    if (remaining < 0) return "今天稍微超了一点";
    if (pct < 25) return "慢慢进入状态";
    if (pct < 65) return "今天还留有余地";
    if (pct < 95) return "离目标刚刚好";
    return "今天刚刚好";
  };

  /* =====================================================
     首页总览
     ===================================================== */
  A.renderHome = () => {
    const today = A.todayISO();
    const day = A.getDay(today);
    const totals = A.dayTotals(day);
    const target = A.ensureTargets().kcal;
    const remaining = target - totals.kcal;
    const name = stateName();
    const start = A.state.meta.startDate;
    const dayNo = start ? Math.max(1, A.daysBetween(start, today) + 1) : 1;
    const greeting = A.greeting();
    const pct = target > 0 ? A.clamp((totals.kcal / target) * 100, 0, 100) : 0;
    const plan = A.getPlan(today);
    const latest = A.latestWeightEntry();
    const goal = A.goalProgress();
    return `
      <section class="page page-home">
        <div class="page-head">
          <div class="page-head-copy">
            <div class="eyebrow"><span class="line"></span>第 ${dayNo} 天 · ${A.weekday(today)}</div>
            <h1>${greeting}，${esc(name)}</h1>
            <p class="page-sub">今天的目标不是完美，是比昨天更清楚一点。</p>
          </div>
          <div class="page-actions">
            <a class="btn btn-ghost btn-sm" href="#/food">${icon("calendar")} 今日饮食 · ${A.formatDateShort(today)}</a>
          </div>
        </div>

        <div class="dash-grid">
          ${renderHero(totals, target, remaining, pct, today)}
          ${renderMemoCard()}
          ${renderMealsCard(day, today)}
          ${renderPlanPreview(plan, target)}
          ${renderWeightCard(latest, goal)}
          ${renderWeekCard()}
        </div>
      </section>`;
  };

  function stateName() {
    return A.state.profile.name && A.state.profile.name.trim() ? A.state.profile.name.trim() : "今天也要好好吃饭";
  }

  function renderHero(totals, target, remaining, consumedPct, date) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const remainingPct = target > 0 ? A.clamp((Math.max(0, remaining) / target) * 100, 0, 100) : 0;
    const dashOffset = circumference * (1 - remainingPct / 100);
    const t = A.ensureTargets();
    const title = statusTitle(consumedPct, remaining);
    return `
      <article class="hero-card">
        <div class="hero-top">
          <div class="hero-kicker">${icon("flame")} TODAY'S ENERGY</div>
          <div class="hero-date">${A.formatDateShort(date)} · ${A.weekday(date)}</div>
        </div>
        <div class="hero-body">
          <div class="hero-ring-wrap">
            <svg class="hero-ring" viewBox="0 0 188 188" aria-hidden="true">
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#eaa17f"/>
                  <stop offset="100%" stop-color="#d96849"/>
                </linearGradient>
              </defs>
              <circle class="track" cx="94" cy="94" r="${radius}"/>
              <circle class="bar" cx="94" cy="94" r="${radius}" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
            </svg>
            <div class="hero-ring-center">
              <span class="ring-label">${remaining >= 0 ? "今天还能吃" : "今天已超出"}</span>
              <strong class="ring-number">${formatNumber(Math.abs(remaining))}</strong>
              <span class="ring-unit">千卡 kcal</span>
            </div>
          </div>
          <div class="hero-copy">
            <h2>${title}</h2>
            <p class="hero-desc">已摄入 ${formatNumber(totals.kcal)} 千卡，完成今日目标的 ${Math.round(consumedPct)}%。吃慢一点，饱腹感会来得更早。</p>
            <div class="macro-list">
              ${macroProgress("蛋白质", totals.protein, t.protein, "p")}
              ${macroProgress("碳水", totals.carbs, t.carbs, "c")}
              ${macroProgress("脂肪", totals.fat, t.fat, "f")}
            </div>
          </div>
        </div>
        <div class="hero-insight">${icon("sparkle")}<span>${dailyInsight(totals, target)}</span></div>
      </article>`;
  }

  function renderMemoCard() {
    const memos = A.state.memos.slice(0, 3);
    return `
      <article class="memo-card">
        <div class="memo-head">
          <div class="memo-title">${icon("pin")}快速备忘录</div>
          <span class="memo-count">${A.state.memos.length} 条</span>
        </div>
        <form id="memoForm" class="memo-compose">
          <textarea class="memo-input" id="memoInput" maxlength="180" placeholder="想到什么，先放这里…"></textarea>
          <div class="memo-compose-foot">
            <div class="memo-quick">
              <button type="button" class="memo-chip" data-action="memo-chip" data-text="下午有点馋，先喝杯水">有点馋</button>
              <button type="button" class="memo-chip" data-action="memo-chip" data-text="今天外食，尽量选清淡的">今天外食</button>
            </div>
            <button class="memo-save" type="submit">记下</button>
          </div>
        </form>
        ${memos.length ? `
          <div class="memo-list">
            ${memos.map((memo) => `
              <div class="memo-item">
                <span class="memo-bullet"></span>
                <div class="memo-text">${esc(memo.text)}<span class="memo-time">${A.memoTime(memo.createdAt)}</span></div>
                <button type="button" class="memo-del" data-action="delete-memo" data-id="${memo.id}" aria-label="删除备忘录">${icon("close")}</button>
              </div>`).join("")}
          </div>` : `
          <div class="memo-empty">${icon("info")}<span>这里可以记下临时想法：为什么想吃、今天在哪吃、晚饭怎么安排。</span></div>`}
      </article>`;
  }

  function renderMealsCard(day, today) {
    return `
      <article class="card meals-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">今天吃了什么</h2>
            <p class="card-sub">一顿一顿记录，比算一整天更容易坚持</p>
          </div>
          <a class="text-link" href="#/food">查看全部 ${icon("arrow-right")}</a>
        </div>
        <div class="meal-rows">
          ${Q.MEALS.map((meal) => {
            const items = day && day.meals ? day.meals[meal.key] || [] : [];
            const kcal = A.mealTotals(day, meal.key).kcal;
            const summary = items.length
              ? items.slice(0, 2).map((item) => item.name).join("、") + (items.length > 2 ? ` 等 ${items.length} 样` : "")
              : "还没记录";
            return `
              <div class="meal-row">
                <div class="meal-icon" style="color:${meal.accent};background:${meal.soft}">${meal.glyph}</div>
                <div class="meal-info">
                  <div class="meal-info-top"><span class="meal-name">${meal.name}</span><span class="meal-time">${meal.time}</span></div>
                  <div class="meal-summary ${items.length ? "" : "empty"}">${esc(summary)}</div>
                </div>
                <div class="meal-right">
                  <div class="meal-kcal"><strong>${items.length ? formatNumber(kcal) : "—"}</strong><small>千卡</small></div>
                  <button type="button" class="meal-add" data-action="open-add-food" data-date="${today}" data-meal="${meal.key}" aria-label="添加${meal.name}">${icon("plus")}</button>
                </div>
              </div>`;
          }).join("")}
        </div>
      </article>`;
  }

  function renderPlanPreview(plan, target) {
    if (!plan) {
      return `
        <article class="card plan-preview-card">
          <div class="card-head">
            <div><h2 class="card-title">今日计划</h2><p class="card-sub">让下一餐不用临时做决定</p></div>
            <span class="pill outline">未生成</span>
          </div>
          <div class="plan-empty">
            <div class="plate-illustration"><span class="plate-rim"></span><span class="plate-leaf"></span><span class="plate-leaf two"></span><span class="plate-dot"></span></div>
            <h3>先看看今天怎么吃</h3>
            <p>按你的热量目标，自动排好三餐和份量，随时可以换。</p>
            <button class="btn btn-soft btn-sm" type="button" data-action="generate-plan" data-date="${A.todayISO()}">生成今日计划 ${icon("sparkle")}</button>
          </div>
        </article>`;
    }
    const totals = A.planTotals(plan);
    const coverage = target ? A.clamp((totals.kcal / target) * 100, 0, 100) : 0;
    return `
      <article class="card plan-preview-card filled">
        <div class="card-head">
          <div><h2 class="card-title">今日计划</h2><p class="card-sub">按 ${formatNumber(target)} 千卡目标生成</p></div>
          <a class="text-link" href="#/plan">查看 ${icon("arrow-right")}</a>
        </div>
        <div class="plan-preview-body">
          <div class="plan-preview-title">
            <div class="left-side"><span class="dot-mark"></span><strong>今天这样安排</strong></div>
            <small>${plan.appliedAt ? "已应用到饮食" : "待应用"}</small>
          </div>
          <div class="plan-preview-meals">
            ${Q.MEALS.filter((meal) => meal.key !== "snack").map((meal) => {
              const mealPlan = plan.meals[meal.key];
              const mealKcal = A.sum(mealPlan ? mealPlan.items : [], (item) => item.kcal);
              return `<div class="plan-mini-row"><span class="plan-mini-name">${meal.name}</span><span class="plan-mini-desc">${esc(mealPlan ? mealPlan.title : "未安排")}</span><span class="plan-mini-kcal">${formatNumber(mealKcal)} kcal</span></div>`;
            }).join("")}
          </div>
          <div class="plan-preview-foot">
            <div class="plan-cover"><span>覆盖 ${Math.round(coverage)}%</span><span class="plan-cover-bar"><span class="plan-cover-fill" style="width:${coverage}%"></span></span></div>
            <a class="text-link accent" href="#/plan">调整计划 ${icon("arrow-right")}</a>
          </div>
        </div>
      </article>`;
  }

  function renderWeightCard(latest, goal) {
    const entries = A.weightEntriesSince(30);
    if (!latest) {
      return `
        <article class="card weight-card">
          <div class="card-head">
            <div><h2 class="card-title">体重趋势</h2><p class="card-sub">不用每天称，但要长期看</p></div>
            <button class="icon-btn small" type="button" data-action="open-weight" aria-label="记录体重">${icon("plus")}</button>
          </div>
          <div class="weight-empty">
            <span class="empty-icon">${icon("scale")}</span>
            <p>还没有体重记录。第一次记录，是趋势的起点。</p>
            <button class="btn btn-soft btn-sm" type="button" data-action="open-weight">记录第一次体重</button>
          </div>
        </article>`;
    }
    const sorted = A.sortedWeights();
    const first = entries.length ? Number(entries[0].weight) : Number(latest.weight);
    const delta = A.round(Number(latest.weight) - first, 1);
    const chart = A.weightChart(entries, { id: "homeWeight", showTarget: false, height: 140 });
    return `
      <article class="card weight-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">体重趋势</h2>
            <p class="card-sub">最近 30 天 · ${sorted.length} 次记录</p>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" data-action="open-weight">${icon("plus")} 记录</button>
        </div>
        <div class="weight-headline">
          <span class="weight-number">${Number(latest.weight).toFixed(1)}</span>
          <span class="weight-unit">kg</span>
          <span class="weight-delta ${delta <= 0 ? "down" : "up"}">${delta === 0 ? "→ 0" : delta < 0 ? `↓ ${Math.abs(delta).toFixed(1)}` : `↑ ${delta.toFixed(1)}`} kg</span>
        </div>
        <div class="weight-chart">${chart}</div>
        <div class="weight-foot">
          <div class="goal-mini"><span>目标 <strong>${A.num(A.state.profile.targetWeight).toFixed(1)} kg</strong></span><span class="goal-mini-bar"><span class="goal-mini-fill" style="width:${goal.percent}%"></span></span><span>${Math.round(goal.percent)}%</span></div>
          <button class="text-link" type="button" data-action="open-weight">看全部记录 ${icon("arrow-right")}</button>
        </div>
      </article>`;
  }

  function renderWeekCard() {
    const data = A.lastNDayTotals(7);
    const target = A.ensureTargets().kcal;
    const maxVal = Math.max(target * 1.22, ...data.map((day) => day.totals.kcal), 1);
    const trackH = 101;
    const trackTop = 9;
    const targetTop = trackTop + trackH * (1 - target / maxVal);
    const logged = data.filter((day) => day.logged);
    const avg = logged.length ? Math.round(A.average(logged.map((d) => d.totals.kcal))) : 0;
    const today = A.todayISO();
    return `
      <article class="card week-card">
        <div class="card-head">
          <div><h2 class="card-title">本周饮食节奏</h2><p class="card-sub">比单日数字更值得看</p></div>
          <a class="text-link" href="#/data">详细数据 ${icon("arrow-right")}</a>
        </div>
        <div class="week-bars">
          <div class="week-target-line" style="top:${targetTop}px"><span>目标 ${formatNumber(target)}</span></div>
          ${data.map((day) => {
            const h = day.totals.kcal > 0 ? Math.max(3, Math.round((day.totals.kcal / maxVal) * trackH)) : 2;
            const over = day.totals.kcal > target * 1.05;
            return `
              <div class="week-col" title="${A.formatDateShort(day.date)} · ${day.totals.kcal} 千卡">
                <span class="week-kcal">${day.totals.kcal ? formatNumber(day.totals.kcal) : ""}</span>
                <span class="week-bar-track"><span class="week-bar-fill ${day.date === today ? "today" : over ? "over" : ""}" style="height:${h}px"${!day.logged ? ' data-empty="true"' : ""}></span></span>
                <span class="week-day ${day.date === today ? "today" : ""}">${A.dateTag(day.date) === "今天" ? "今天" : A.weekday(day.date).replace("周", "")}</span>
              </div>`;
          }).join("")}
        </div>
        <div class="week-foot">
          <div class="week-insight">${icon("sparkle")}<span>${logged.length ? `已记录 <strong>${logged.length}</strong> 天，平均 <strong>${formatNumber(avg)}</strong> 千卡` : "今天开始记录，就能看到自己的节奏"}</span></div>
        </div>
      </article>`;
  }

  /* =====================================================
     今日饮食
     ===================================================== */
  A.renderFood = () => {
    const date = A.ui.foodDate;
    const today = A.todayISO();
    const day = A.getDay(date);
    const totals = A.dayTotals(day);
    const targets = A.ensureTargets();
    const remaining = targets.kcal - totals.kcal;
    const isToday = date === today;
    const proteinPct = targets.protein > 0 ? A.clamp((totals.protein / targets.protein) * 100, 0, 100) : 0;
    const title = isToday ? "今天吃了什么" : `${A.formatDateShort(date)}的饮食`;
    return `
      <section class="page page-food">
        <div class="page-head">
          <div class="page-head-copy">
            <div class="eyebrow"><span class="line"></span>今日饮食 · ${A.weekday(date)}</div>
            <h1>${title}</h1>
            <p class="page-sub">${isToday ? "如实记录就好，不必为了数字少吃一口。" : "补充或回看这一天的饮食记录。"}</p>
          </div>
          <div class="page-actions">
            ${dateSwitcher("food", date, today)}
            <button class="btn btn-primary" type="button" data-action="open-add-food" data-date="${date}" data-meal="${defaultMealForNow()}">${icon("plus")} 记录食物</button>
          </div>
        </div>

        <div class="food-summary">
          <div class="summary-tile dark">
            <div class="summary-label">${icon("target")} 每日热量目标</div>
            <div class="summary-value"><strong>${formatNumber(targets.kcal)}</strong><span>千卡</span></div>
            <div class="summary-meta">${targets.manual ? "手动目标" : `按 ${A.state.profile.weeklyLoss} kg/周 的节奏估算`}</div>
          </div>
          <div class="summary-tile">
            <div class="summary-label">${icon("flame")} 已摄入</div>
            <div class="summary-value"><strong>${formatNumber(totals.kcal)}</strong><span>千卡</span></div>
            <div class="summary-bar"><span class="summary-bar-fill coral" style="width:${targets.kcal ? A.clamp((totals.kcal / targets.kcal) * 100, 0, 100) : 0}%"></span></div>
            <div class="summary-meta">${totals.count} 样食物 · ${isToday ? "今天" : A.formatDateShort(date)}</div>
          </div>
          <div class="summary-tile">
            <div class="summary-label">${remaining >= 0 ? "还可以吃" : "已经超出"}</div>
            <div class="summary-value"><strong style="${remaining < 0 ? "color:var(--coral-deep)" : ""}">${formatNumber(Math.abs(remaining))}</strong><span>千卡</span></div>
            <div class="summary-bar"><span class="summary-bar-fill ${remaining < 0 ? "coral" : "gold"}" style="width:${targets.kcal ? A.clamp((Math.abs(remaining) / targets.kcal) * 100, 0, 100) : 0}%"></span></div>
            <div class="summary-meta">${remaining < 0 ? "下一餐清淡一点，不用补救" : "留一点余量，比精确到个位更轻松"}</div>
          </div>
          <div class="summary-tile">
            <div class="summary-label">蛋白质</div>
            <div class="summary-value"><strong>${Math.round(totals.protein)}</strong><span>/ ${targets.protein} 克</span></div>
            <div class="summary-bar"><span class="summary-bar-fill" style="width:${proteinPct}%"></span></div>
            <div class="summary-meta">${totals.protein >= targets.protein ? "今天达标了" : `还差 ${Math.max(0, Math.round(targets.protein - totals.protein))} 克`} · 优先从正餐补</div>
          </div>
        </div>

        <div class="food-layout">
          <div class="meal-cards">
            ${Q.MEALS.map((meal) => renderMealCard(meal, day, date)).join("")}
          </div>
          ${renderFoodSide(totals, targets, date, isToday)}
        </div>
      </section>`;
  };

  function defaultMealForNow() {
    const h = new Date().getHours();
    if (h < 10) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 21) return "dinner";
    return "snack";
  }

  function renderMealCard(meal, day, date) {
    const items = day && day.meals ? day.meals[meal.key] || [] : [];
    const totals = A.mealTotals(day, meal.key);
    return `
      <article class="card meal-card">
        <div class="meal-card-head">
          <div class="meal-icon" style="color:${meal.accent};background:${meal.soft}">${meal.glyph}</div>
          <div class="meal-card-title"><h3>${meal.name}</h3><span>${meal.time}</span></div>
          <div class="meal-card-total">
            <div><strong>${items.length ? formatNumber(totals.kcal) : "—"}</strong> <small>千卡</small></div>
            <button class="meal-add-text" type="button" data-action="open-add-food" data-date="${date}" data-meal="${meal.key}">${icon("plus")} 添加</button>
          </div>
        </div>
        ${items.length ? `
          <div class="food-items">
            ${items.map((item) => {
              const food = A.foodById(item.foodId);
              const cat = A.categoryById(item.cat);
              return `
                <div class="food-item">
                  <span class="food-cat-dot" style="background:${cat.accent}"></span>
                  <div class="food-item-name"><strong>${esc(item.name)}</strong><small>${esc(A.portionLabel(food, item.grams))}</small></div>
                  <div class="food-item-macros">蛋白 <b>${item.protein}g</b> · 碳水 <b>${item.carbs}g</b> · 脂肪 <b>${item.fat}g</b></div>
                  <div class="food-item-kcal">${formatNumber(item.kcal)}</div>
                  <div class="food-item-actions">
                    <button class="icon-btn" type="button" data-action="edit-log" data-date="${date}" data-meal="${meal.key}" data-id="${item.id}" aria-label="编辑${esc(item.name)}">${icon("edit")}</button>
                    <button class="icon-btn delete" type="button" data-action="delete-log" data-date="${date}" data-meal="${meal.key}" data-id="${item.id}" aria-label="删除${esc(item.name)}">${icon("trash")}</button>
                  </div>
                </div>`;
            }).join("")}
          </div>` : `
          <div class="meal-empty">
            ${icon("bowl")}<span>${meal.key === "snack" ? "还没加餐，不饿就不用勉强。" : `${meal.name}还没有记录。`}</span>
            <button type="button" data-action="open-add-food" data-date="${date}" data-meal="${meal.key}">去添加</button>
          </div>`}
      </article>`;
  }

  function renderFoodSide(totals, targets, date, isToday) {
    const pct = targets.kcal ? A.clamp((totals.kcal / targets.kcal) * 100, 0, 100) : 0;
    const circumference = 2 * Math.PI * 44;
    const macros = [
      { name: "蛋白质", key: "protein", cls: "p", color: "#df7454" },
      { name: "碳水", key: "carbs", cls: "c", color: "#d2a044" },
      { name: "脂肪", key: "fat", cls: "f", color: "#9b83ad" },
    ];
    return `
      <aside class="food-side">
        <article class="card nutrition-card">
          <div class="card-head"><div><h2 class="card-title">今日营养</h2><p class="card-sub">${isToday ? "边吃边看，不用等到晚上" : "这一天的营养构成"}</p></div><span class="pill ${pct > 105 ? "coral" : "green"}">${Math.round(pct)}%</span></div>
          <div class="nutrition-donut-row">
            <div class="mini-ring-wrap">
              <svg class="mini-ring" viewBox="0 0 104 104" aria-hidden="true">
                <circle class="track" cx="52" cy="52" r="44"/>
                <circle class="bar" cx="52" cy="52" r="44" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${(circumference * (1 - pct / 100)).toFixed(1)}"/>
              </svg>
              <div class="mini-ring-center"><strong>${formatNumber(Math.abs(targets.kcal - totals.kcal))}</strong><span>${totals.kcal > targets.kcal ? "已超出" : "剩余千卡"}</span></div>
            </div>
            <div class="nutrition-numbers">
              <div class="nutrition-big">${formatNumber(totals.kcal)}<small>/ ${formatNumber(targets.kcal)} 千卡</small></div>
              <div class="nutrition-sub">${totals.count} 样食物 · 目标完成 <b>${Math.round(pct)}%</b></div>
            </div>
          </div>
          <div class="nutrient-list">
            ${macros.map((macro) => {
              const consumed = totals[macro.key];
              const target = targets[macro.key];
              const width = target ? A.clamp((consumed / target) * 100, 0, 100) : 0;
              return `
                <div class="nutrient-row">
                  <span class="nutrient-label"><i class="nutrient-dot" style="background:${macro.color}"></i>${macro.name}</span>
                  <span class="nutrient-track"><span class="nutrient-fill ${macro.cls}" style="width:${width}%"></span></span>
                  <span class="nutrient-value"><b>${Math.round(consumed)}</b> / ${target}g</span>
                </div>`;
            }).join("")}
          </div>
          <div class="insight-box">${icon("sparkle")}<p>${dailyInsight(totals, targets.kcal)}</p></div>
        </article>

        <article class="card quick-actions-card">
          <div class="card-head"><div><h2 class="card-title">快捷操作</h2><p class="card-sub">少一点重复劳动</p></div></div>
          <button class="quick-action" type="button" data-action="copy-yesterday" data-date="${date}">${icon("copy")} 复制前一天的饮食 <span class="arrow">${icon("arrow-right")}</span></button>
          <button class="quick-action" type="button" data-action="clear-day" data-date="${date}">${icon("trash")} 清空这一天的记录 <span class="arrow">${icon("arrow-right")}</span></button>
          ${A.getPlan(date) ? `<a class="quick-action" href="#/plan">${icon("plan")} 查看这天的饮食计划 <span class="arrow">${icon("arrow-right")}</span></a>` : `<button class="quick-action" type="button" data-action="generate-plan" data-date="${date}">${icon("sparkle")} 生成这一天的饮食计划 <span class="arrow">${icon("arrow-right")}</span></button>`}
        </article>
      </aside>`;
  }

  /* =====================================================
     饮食计划
     ===================================================== */
  A.renderPlan = () => {
    const date = A.ui.planDate;
    const today = A.todayISO();
    const maxDate = A.addDays(today, 7);
    const plan = A.getPlan(date);
    const target = A.ensureTargets().kcal;
    const isToday = date === today;
    const title = isToday ? "今天怎么安排" : `${A.formatDateShort(date)}怎么安排`;
    return `
      <section class="page page-plan">
        <div class="page-head">
          <div class="page-head-copy">
            <div class="eyebrow"><span class="line"></span>饮食计划 · ${A.weekday(date)}</div>
            <h1>${title}</h1>
            <p class="page-sub">先排好，再执行。计划是给忙的时候用的，不是拿来束缚你的。</p>
          </div>
          <div class="page-actions">
            ${dateSwitcher("plan", date, maxDate)}
            ${plan ? `<button class="btn btn-ghost" type="button" data-action="regen-plan" data-date="${date}">${icon("sparkle")} 重新生成</button>` : `<button class="btn btn-primary" type="button" data-action="generate-plan" data-date="${date}">${icon("sparkle")} 生成计划</button>`}
          </div>
        </div>
        ${plan ? renderPlanContent(plan, target, date, isToday) : renderPlanEmpty(date)}
      </section>`;
  };

  function renderPlanEmpty(date) {
    return `
      <article class="card plan-empty-page">
        <div class="plate-illustration"><span class="plate-rim"></span><span class="plate-leaf"></span><span class="plate-leaf two"></span><span class="plate-dot"></span></div>
        <h2>这一天还没有计划</h2>
        <p>根据你的每日热量目标，轻燃会安排早、午、晚三餐，搭配主食、蛋白质和蔬菜。生成后可以换菜、调份量，也可以锁住喜欢的一餐。</p>
        <button class="btn btn-primary btn-lg" type="button" data-action="generate-plan" data-date="${date}">${icon("sparkle")} 生成这一天的三餐</button>
        <div class="plan-note">${icon("info")} 计划是建议，不会自动改变你的饮食记录</div>
      </article>`;
  }

  function renderPlanContent(plan, target, date, isToday) {
    const totals = A.planTotals(plan);
    const coverage = target ? Math.round((totals.kcal / target) * 100) : 0;
    return `
      <article class="plan-hero">
        <div class="plan-hero-main">
          <div class="plan-hero-label">${icon("target")} 今日摄入计划</div>
          <h2>把 ${formatNumber(target)} 千卡，安排得刚刚好</h2>
          <p>按早餐 28% · 午餐 40% · 晚餐 32% 分配，可随时换菜和调份量。</p>
          <div class="plan-hero-stats">
            <div class="plan-hero-stat"><strong>${formatNumber(totals.kcal)}</strong><span>计划热量 · 覆盖 ${coverage}%</span></div>
            <div class="plan-hero-stat"><strong>${Math.round(totals.protein)}g</strong><span>蛋白质</span></div>
            <div class="plan-hero-stat"><strong>${Math.round(totals.carbs)}g</strong><span>碳水</span></div>
            <div class="plan-hero-stat"><strong>${Math.round(totals.fat)}g</strong><span>脂肪</span></div>
          </div>
        </div>
        <div class="plan-hero-right">
          ${plan.appliedAt
            ? `<a class="btn btn-ghost btn-sm" href="#/food">${icon("check")} 已加入饮食</a>`
            : `<button class="btn btn-accent btn-sm" type="button" data-action="apply-plan" data-date="${date}">${icon("check")} 应用到${isToday ? "今日" : "这天"}饮食</button>`}
        </div>
      </article>

      <div class="plan-grid">
        ${Q.MEALS.filter((meal) => meal.key !== "snack").map((meal) => renderPlanMeal(meal, plan, date)).join("")}
      </div>

      <div class="plan-applied-bar ${plan.appliedAt ? "" : "hidden"}">
        ${icon("check")}<p>计划已于 ${plan.appliedAt ? A.memoTime(plan.appliedAt) : ""} 加入${isToday ? "今日" : "这天"}饮食，之后仍可继续调整。</p>
        <a class="text-link" href="#/food">去今日饮食 ${icon("arrow-right")}</a>
      </div>
      <div class="plan-note">${icon("info")} 计划中的份量为估算值。换菜会自动保持这餐的热量，调份量会同步更新营养。</div>`;
  }

  function renderPlanMeal(meal, plan, date) {
    const mealPlan = plan.meals[meal.key];
    if (!mealPlan) return "";
    const totals = A.sum(mealPlan.items, (item) => item.kcal);
    const protein = A.round(A.sum(mealPlan.items, (item) => item.protein), 1);
    const locked = !!(plan.locks && plan.locks[meal.key]);
    return `
      <article class="card plan-meal-card">
        <div class="plan-meal-head">
          <div class="meal-icon" style="color:${meal.accent};background:${meal.soft}">${meal.glyph}</div>
          <div class="plan-meal-name"><strong>${meal.name}</strong><small>${mealPlan.title}</small></div>
          <div class="plan-meal-head-actions">
            <button class="icon-btn small plan-lock ${locked ? "locked" : ""}" type="button" data-action="toggle-plan-lock" data-date="${date}" data-meal="${meal.key}" title="${locked ? "解锁这一餐" : "锁定这一餐，重新生成时保留"}" aria-label="${locked ? "解锁这一餐" : "锁定这一餐"}">${icon(locked ? "lock" : "unlock")}</button>
          </div>
        </div>
        <div class="plan-meal-list">
          ${mealPlan.items.map((item) => {
            const food = A.foodById(item.foodId);
            return `
              <div class="plan-food">
                <div>
                  <div class="plan-food-top"><span class="plan-food-name">${esc(item.name)}</span></div>
                  <div class="plan-food-note">${A.portionShort(food, item.grams)} · 蛋白 ${item.protein}g</div>
                  <div class="plan-food-bottom">
                    <button class="portion-btn" type="button" data-action="adjust-plan" data-date="${date}" data-meal="${meal.key}" data-item="${item.id}" data-dir="-1" aria-label="减少${esc(item.name)}">${icon("minus")}</button>
                    <span class="portion-value">${Math.round(item.grams)} 克</span>
                    <button class="portion-btn" type="button" data-action="adjust-plan" data-date="${date}" data-meal="${meal.key}" data-item="${item.id}" data-dir="1" aria-label="增加${esc(item.name)}">${icon("plus")}</button>
                    <button class="swap-btn" type="button" data-action="swap-plan" data-date="${date}" data-meal="${meal.key}" data-item="${item.id}">${icon("swap")} 换</button>
                  </div>
                </div>
                <div class="plan-food-kcal">${formatNumber(item.kcal)}<small> kcal</small></div>
              </div>`;
          }).join("")}
        </div>
        <div class="plan-meal-foot">
          <span>蛋白 ${protein}g · 共 ${mealPlan.items.length} 样</span>
          <strong>${formatNumber(totals)}<small> 千卡</small></strong>
        </div>
      </article>`;
  }

  /* =====================================================
     食物分类
     ===================================================== */
  A.renderLibrary = () => {
    const ui = A.ui.library;
    const all = A.allFoods();
    const cat = ui.cat || "all";
    const filterTag = ui.tag || "all";
    const sort = ui.sort || "default";
    let foods = all.filter((food) => (cat === "all" || food.cat === cat));
    if (filterTag !== "all") foods = foods.filter((food) => (food.tags || []).includes(filterTag));
    if (sort === "kcal-asc") foods = foods.sort((a, b) => a.kcal - b.kcal);
    else if (sort === "protein-desc") foods = foods.sort((a, b) => b.p - a.p);
    else if (sort === "name") foods = foods.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    const categoryName = cat === "all" ? "全部分类" : A.categoryById(cat).name;
    const filters = [
      { id: "all", label: "全部" },
      { id: "高蛋白", label: "高蛋白" },
      { id: "低卡", label: "低卡" },
      { id: "高纤维", label: "高纤维" },
      { id: "控糖", label: "控糖" },
      { id: "优质碳水", label: "优质碳水" },
    ];
    return `
      <section class="page page-library">
        <div class="page-head">
          <div class="page-head-copy">
            <div class="eyebrow"><span class="line"></span>食物分类 · 本地食物库</div>
            <h1>认识你吃的每一口</h1>
            <p class="page-sub">常见食材和家常菜都在这。找不到的，就自己建一个。</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" type="button" data-action="open-custom-food">${icon("plus")} 新增食物</button>
          </div>
        </div>

        <div class="category-grid">
          ${Q.CATEGORIES.map((category) => `
            <button class="category-tile ${cat === category.id ? "active" : ""}" type="button" data-action="set-library-cat" data-cat="${category.id}">
              <span class="category-glyph" style="color:${category.accent};background:${category.soft}">${category.glyph}</span>
              <span class="category-copy"><strong>${category.name}</strong><span>${category.desc}</span></span>
              <span class="category-count">${A.categoryCount(category.id)}</span>
            </button>`).join("")}
        </div>

        <div class="food-toolbar">
          <div class="search-field">
            ${icon("search")}
            <input type="search" id="librarySearch" placeholder="搜食物，比如：鸡胸、燕麦、豆腐" value="${esc(ui.query || "")}" autocomplete="off">
            <button class="icon-btn small search-clear ${ui.query ? "" : "hidden"}" id="libraryClear" type="button" data-action="clear-library-search" aria-label="清空搜索">${icon("close")}</button>
          </div>
          <div class="filter-row">
            ${filters.map((filter) => `<button class="filter-chip ${filterTag === filter.id ? "active" : ""}" type="button" data-action="set-library-tag" data-tag="${filter.id}">${filter.label}</button>`).join("")}
          </div>
          <select class="toolbar-select" id="librarySort" aria-label="排序方式">
            <option value="default" ${sort === "default" ? "selected" : ""}>默认排序</option>
            <option value="kcal-asc" ${sort === "kcal-asc" ? "selected" : ""}>热量从低到高</option>
            <option value="protein-desc" ${sort === "protein-desc" ? "selected" : ""}>蛋白质从高到低</option>
            <option value="name" ${sort === "name" ? "selected" : ""}>按名称</option>
          </select>
        </div>

        <div class="library-meta">
          <p><strong>${categoryName}</strong> · <span id="libraryCount">${foods.length}</span> 种食物${cat !== "all" ? ` · <button class="text-link" type="button" data-action="set-library-cat" data-cat="all">查看全部分类</button>` : ""}</p>
          <p>${filterTag !== "all" ? `筛选：${esc(filterTag)}` : "营养值按每 100 克估算"}</p>
        </div>

        <div class="food-grid" id="foodGrid">
          ${foods.length ? foods.map((food) => renderFoodCard(food)).join("") : `<div class="empty-library"><span class="empty-icon">${icon("search")}</span><h3>没有找到合适的食物</h3><p>换个分类，或者自己新增一个。</p></div>`}
          <div class="empty-library hidden" id="libraryNoMatch"><span class="empty-icon">${icon("search")}</span><h3>没有匹配的食物</h3><p>试试更短的关键词，或换一个分类。</p></div>
        </div>
      </section>`;
  };

  function renderFoodCard(food) {
    const cat = A.categoryById(food.cat);
    const search = `${food.name} ${cat.name} ${(food.tags || []).join(" ")}`;
    return `
      <article class="food-card" tabindex="0" role="button" data-action="open-food-detail" data-food="${food.id}" data-search="${esc(search.toLowerCase())}">
        <div class="food-card-top">
          <span class="food-card-tag"><i style="background:${cat.accent}"></i>${cat.name}</span>
          ${food.custom ? `<span class="food-card-mine">我的</span>` : ""}
        </div>
        <h3>${esc(food.name)}</h3>
        <div class="food-card-kcal"><strong>${food.kcal}</strong><span>千卡 / 100g</span></div>
        <div class="food-card-macros"><span>蛋白 <b>${food.p}g</b></span><span>碳水 <b>${food.c}g</b></span><span>脂肪 <b>${food.f}g</b></span></div>
        <div class="food-card-foot">${(food.tags || []).slice(0, 2).map((tag) => `<span class="mini-tag">${esc(tag)}</span>`).join("") || `<span class="mini-tag">基础食材</span>`}</div>
        <button class="food-card-add" type="button" data-action="quick-add-food" data-food="${food.id}" aria-label="记录${esc(food.name)}">${icon("plus")}</button>
      </article>`;
  }

  /* =====================================================
     数据与设置
     ===================================================== */
  A.renderData = () => {
    const tab = A.ui.dataTab || "trend";
    return `
      <section class="page page-data">
        <div class="page-head">
          <div class="page-head-copy">
            <div class="eyebrow"><span class="line"></span>数据与设置 · ${A.isPwa ? "只在当前设备" : "只在本机"}</div>
            <h1>身体会记得你的坚持</h1>
            <p class="page-sub">不追单日数字，看一段时间的趋势。</p>
          </div>
          <div class="page-actions">
            ${tab === "trend" ? `<button class="btn btn-primary" type="button" data-action="open-weight">${icon("plus")} 记录体重</button>` : tab === "settings" ? `<button class="btn btn-primary" type="submit" form="settingsForm">${icon("check")} 保存设置</button>` : ""}
          </div>
        </div>
        <div class="subnav">
          <button type="button" data-action="set-data-tab" data-tab="trend" class="${tab === "trend" ? "active" : ""}">身体与趋势</button>
          <button type="button" data-action="set-data-tab" data-tab="settings" class="${tab === "settings" ? "active" : ""}">目标设置</button>
          <button type="button" data-action="set-data-tab" data-tab="manage" class="${tab === "manage" ? "active" : ""}">数据管理</button>
        </div>
        ${tab === "trend" ? renderDataTrend() : tab === "settings" ? renderSettings() : renderManage()}
      </section>`;
  };

  function renderDataTrend() {
    const entries = A.weightEntriesSince(90);
    const latest = A.latestWeightEntry();
    const goal = A.goalProgress();
    const last30 = A.lastNDayTotals(30);
    const logged = last30.filter((day) => day.logged);
    const avg = logged.length ? Math.round(A.average(logged.map((day) => day.totals.kcal))) : 0;
    const first30 = entries.length > 1 ? Number(entries[0].weight) : null;
    const change = first30 && latest ? A.round(Number(latest.weight) - first30, 1) : null;
    const today = A.todayISO();
    const recentWeights = A.sortedWeights().slice().reverse().slice(0, 7);
    const weekly = A.lastNDayTotals(7);
    const weeklyLogged = weekly.filter((day) => day.logged);
    const weeklyAvg = weeklyLogged.length ? Math.round(A.average(weeklyLogged.map((day) => day.totals.kcal))) : 0;
    const targetKcal = A.ensureTargets().kcal;
    const todayWeight = A.state.weights.find((item) => item.date === today);
    return `
      <div class="data-summary">
        <article class="card data-stat">
          <div class="data-stat-label">${icon("scale")} 当前体重</div>
          <div class="data-stat-value"><strong>${latest ? Number(latest.weight).toFixed(1) : "—"}</strong><span>kg</span></div>
          <div class="data-stat-note ${change != null && change < 0 ? "good" : ""}">${change == null ? "记录两次后可见变化" : change === 0 ? "与 90 天前持平" : change < 0 ? `较 90 天前下降 ${Math.abs(change).toFixed(1)} kg` : `较 90 天前增加 ${change.toFixed(1)} kg`}</div>
        </article>
        <article class="card data-stat">
          <div class="data-stat-label">${icon("target")} 距目标</div>
          <div class="data-stat-value"><strong>${goal.remain != null ? Math.abs(goal.remain).toFixed(1) : "—"}</strong><span>kg</span></div>
          <div class="data-stat-note ${goal.remain != null && goal.remain <= 0 ? "good" : ""}">${goal.remain != null ? goal.remain <= 0 ? "已经到达目标" : `目标 ${A.num(A.state.profile.targetWeight).toFixed(1)} kg` : "先设置目标体重"}</div>
        </article>
        <article class="card data-stat">
          <div class="data-stat-label">${icon("plan")} 近 30 天记录</div>
          <div class="data-stat-value"><strong>${logged.length}</strong><span>/ 30 天</span></div>
          <div class="data-stat-note">${logged.length ? `平均每天 ${formatNumber(avg)} 千卡` : "还没有饮食记录"}</div>
        </article>
        <article class="card data-stat">
          <div class="data-stat-label">${icon("flame")} 今日体重记录</div>
          <div class="data-stat-value"><strong>${todayWeight ? "已记录" : "未记录"}</strong></div>
          <div class="data-stat-note ${todayWeight ? "good" : ""}">${todayWeight ? `${Number(todayWeight.weight).toFixed(1)} kg · 今天` : "不用每天称，保持节奏就好"}</div>
        </article>
      </div>

      <div class="data-layout">
        <div class="data-left-stack">
          <article class="card data-card">
            <div class="card-head">
              <div><h2 class="card-title">体重趋势</h2><p class="card-sub">最近 90 天 · ${entries.length} 次记录</p></div>
              <button class="text-link" type="button" data-action="open-weight">记录 ${icon("plus")}</button>
            </div>
            ${entries.length ? `
              <div class="data-chart" id="weightChartLarge">${A.weightChart(entries, { id: "largeWeight", showTarget: false, height: 238, large: true })}</div>
              <div class="chart-xlabels"><span>${A.formatDateShort(entries[0].date)}</span><span>${entries.length > 1 ? A.formatDateShort(entries[Math.floor(entries.length / 2)].date) : ""}</span><span>${A.formatDateShort(entries[entries.length - 1].date)}</span></div>
              <div class="chart-legend"><span><i style="background:var(--coral)"></i>体重</span><span class="chart-range">区间 ${Math.min(...entries.map((e) => Number(e.weight))).toFixed(1)}–${Math.max(...entries.map((e) => Number(e.weight))).toFixed(1)} kg</span></div>
            ` : `<div class="weight-empty" style="height:238px"><span class="empty-icon">${icon("scale")}</span><p>记录体重后，这里会出现你的趋势。</p><button class="btn btn-soft btn-sm" type="button" data-action="open-weight">记录第一次体重</button></div>`}
          </article>

          <article class="card data-card">
            <div class="card-head">
              <div><h2 class="card-title">最近 7 天热量</h2><p class="card-sub">柱形是摄入，虚线是目标</p></div>
              <span class="pill ${avg > targetKcal ? "coral" : "green"}">${logged.length ? `平均 ${formatNumber(avg)} 千卡` : "等待记录"}</span>
            </div>
            ${renderIntakeBars(weekly, targetKcal)}
          </article>

          <article class="card data-card">
            <div class="card-head">
              <div><h2 class="card-title">体重记录</h2><p class="card-sub">最近 7 次 · 可以补记或修改</p></div>
              <button class="text-link" type="button" data-action="open-weight">新增 ${icon("plus")}</button>
            </div>
            ${recentWeights.length ? `
              <div class="weight-log-list">
                ${recentWeights.map((item) => `
                  <div class="weight-log-row">
                    <span class="weight-log-date">${A.dateTag(item.date) === "今天" ? "今天" : A.formatDateShort(item.date)}</span>
                    <span class="weight-log-value">${Number(item.weight).toFixed(1)}<small> kg</small></span>
                    <span class="weight-log-note">${item.waist ? `腰围 ${item.waist} cm` : esc(item.note || "")}</span>
                    <span class="weight-log-actions"><button class="icon-btn" type="button" data-action="edit-weight" data-id="${item.id}" aria-label="编辑体重记录">${icon("edit")}</button></span>
                  </div>`).join("")}
              </div>` : `<p class="muted" style="font-size:10px;padding:16px 0">还没有记录。</p>`}
          </article>
        </div>

        <div class="data-side-stack">
          <article class="card goal-card">
            <div class="card-head"><div><h2 class="card-title">目标进度</h2><p class="card-sub">从起点看，而不是从昨天看</p></div></div>
            <div class="goal-ring-wrap">
              <svg class="goal-ring" viewBox="0 0 124 124" aria-hidden="true">
                <circle class="track" cx="62" cy="62" r="52"/>
                <circle class="bar" cx="62" cy="62" r="52" stroke-dasharray="${(2 * Math.PI * 52).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 52 * (1 - goal.percent / 100)).toFixed(1)}"/>
              </svg>
              <div class="goal-ring-center"><strong>${Math.round(goal.percent)}%</strong><span>已完成</span></div>
            </div>
            <div class="goal-numbers">
              <div><small>起点</small><strong>${goal.start ? Number(goal.start).toFixed(1) : "—"}<span> kg</span></strong></div>
              <div class="goal-remaining"><small>${goal.remain != null && goal.remain <= 0 ? "已达成" : "还差"}</small><strong>${goal.remain != null ? Math.abs(goal.remain).toFixed(1) : "—"}<span> kg</span></strong></div>
            </div>
          </article>

          <article class="card adherence-card">
            <div class="card-head"><div><h2 class="card-title">饮食表现</h2><p class="card-sub">最近 7 天</p></div></div>
            <div class="adherence-grid">
              <div class="adherence-item"><strong>${weeklyLogged.length}</strong><span>天有记录</span></div>
              <div class="adherence-item"><strong>${weeklyLogged.length ? formatNumber(weeklyAvg) : "—"}</strong><span>平均千卡</span></div>
            </div>
            <div class="intake-list">
              ${weekly.map((day) => {
                const pct = targetKcal ? A.clamp((day.totals.kcal / targetKcal) * 100, 0, 100) : 0;
                return `<div class="intake-row"><span>${A.dateTag(day.date) === "今天" ? "今天" : A.weekday(day.date)}</span><span class="intake-bar"><i style="width:${pct}%"></i></span><b>${day.totals.kcal ? formatNumber(day.totals.kcal) : "—"}</b></div>`;
              }).join("")}
            </div>
          </article>

          <article class="card data-card note-card">
            <div class="insight-box" style="margin:0">${icon("info")}<p>体重每天会有 0.5–1.5 kg 的波动，水分、盐分和生理周期都会影响它。请只看一周以上的趋势，不要被单日数字影响心情。</p></div>
          </article>
        </div>
      </div>`;
  }

  function renderIntakeBars(days, target) {
    const max = Math.max(target * 1.25, ...days.map((day) => day.totals.kcal), 1);
    return `
      <div class="intake-chart">
        <div class="intake-target-line" style="bottom:${(target / max) * 100}%"><span>目标 ${formatNumber(target)}</span></div>
        ${days.map((day) => {
          const height = day.totals.kcal ? Math.max(3, Math.round((day.totals.kcal / max) * 100)) : 0;
          return `<div class="intake-col" title="${A.formatDateShort(day.date)} · ${day.totals.kcal} 千卡">
            <span class="intake-value">${day.totals.kcal ? formatNumber(day.totals.kcal) : ""}</span>
            <span class="intake-bar-track"><span class="intake-bar-fill ${day.totals.kcal > target * 1.1 ? "over" : ""}" style="height:${height}%"></span></span>
            <span class="intake-day ${day.date === A.todayISO() ? "today" : ""}">${A.dateTag(day.date) === "今天" ? "今天" : A.weekday(day.date).replace("周", "")}</span>
          </div>`;
        }).join("")}
      </div>`;
  }

  function renderSettings() {
    const p = A.state.profile;
    const t = A.ensureTargets();
    const manual = !!A.state.targets.manual;
    return `
      <form id="settingsForm" class="settings-form" novalidate>
        <section class="card form-section">
          <div class="form-section-head">
            <div><h2>基本信息</h2><p>用于估算你的基础代谢和每日目标。${A.isPwa ? "只保存在当前设备。" : "只保存在本机。"}</p></div>
            <span class="pill green">${p.sex === "male" ? "男性" : "女性"} · ${p.age} 岁</span>
          </div>
          <div class="form-grid">
            <div class="field"><label for="setName">怎么称呼你</label><input class="input" id="setName" type="text" maxlength="20" value="${esc(p.name || "")}" placeholder="可以不填"></div>
            <div class="field"><label>性别</label>
              <div class="segmented" data-segmented="sex">
                <button type="button" class="${p.sex !== "male" ? "active" : ""}" data-action="set-form-sex" data-value="female">女性</button>
                <button type="button" class="${p.sex === "male" ? "active" : ""}" data-action="set-form-sex" data-value="male">男性</button>
              </div>
              <input type="hidden" id="setSex" value="${p.sex === "male" ? "male" : "female"}">
            </div>
            <div class="field"><label for="setAge">年龄 <span class="unit">岁</span></label><input class="input" id="setAge" type="number" min="12" max="100" step="1" value="${p.age}"></div>
            <div class="field"><label for="setHeight">身高 <span class="unit">cm</span></label><input class="input" id="setHeight" type="number" min="120" max="230" step="0.5" value="${p.height}"></div>
            <div class="field"><label for="setWeight">当前体重 <span class="unit">kg</span></label><input class="input" id="setWeight" type="number" min="30" max="250" step="0.1" value="${Number(p.weight).toFixed(1)}"></div>
            <div class="field"><label for="setTargetWeight">目标体重 <span class="unit">kg</span></label><input class="input" id="setTargetWeight" type="number" min="30" max="250" step="0.1" value="${Number(p.targetWeight).toFixed(1)}"></div>
          </div>
        </section>

        <section class="card form-section">
          <div class="form-section-head">
            <div><h2>减脂节奏</h2><p>建议每周减 0.25–0.75 kg。慢一点，更容易守住。</p></div>
          </div>
          <div class="form-grid">
            <div class="field"><label for="setActivity">日常活动量</label>
              <select class="select" id="setActivity">
                ${Q.ACTIVITY_LEVELS.map((level) => `<option value="${level.value}" ${Number(p.activity) === level.value ? "selected" : ""}>${level.name} · ${level.desc}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label for="setLoss">希望的减重速度</label>
              <select class="select" id="setLoss">
                ${Q.LOSS_RATES.map((rate) => `<option value="${rate.value}" ${Number(p.weeklyLoss) === rate.value ? "selected" : ""}>${rate.name} · ${rate.desc}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="calc-preview" id="settingsCalc">
            <div><small>估算维持热量</small><strong>${formatNumber(t.tdee)} 千卡</strong></div>
            <div><small>自动目标</small><strong>${formatNumber(t.kcal)} 千卡</strong></div>
            <div><small>安全下限</small><strong>${t.floor} 千卡</strong></div>
            <div><small>预计达标</small><strong>${estimateGoalWeeks()} 周</strong></div>
          </div>
        </section>

        <section class="card form-section">
          <div class="form-section-head">
            <div><h2>每日营养目标</h2><p>默认按身体数据自动计算，也可以完全自己定。</p></div>
            <button class="manual-toggle" type="button" data-action="toggle-manual" aria-pressed="${manual}"><span class="switch ${manual ? "on" : ""}" id="manualSwitch"></span>手动调整</button>
          </div>
          <div class="form-grid four">
            <div class="field"><label for="targetKcal">热量 <span class="unit">kcal</span></label><input class="input target-input" id="targetKcal" type="number" min="1000" max="5000" step="10" value="${t.kcal}" ${manual ? "" : "readonly"}></div>
            <div class="field"><label for="targetProtein">蛋白质 <span class="unit">g</span></label><input class="input target-input" id="targetProtein" type="number" min="30" max="300" step="5" value="${t.protein}" ${manual ? "" : "readonly"}></div>
            <div class="field"><label for="targetCarbs">碳水 <span class="unit">g</span></label><input class="input target-input" id="targetCarbs" type="number" min="20" max="500" step="5" value="${t.carbs}" ${manual ? "" : "readonly"}></div>
            <div class="field"><label for="targetFat">脂肪 <span class="unit">g</span></label><input class="input target-input" id="targetFat" type="number" min="20" max="150" step="5" value="${t.fat}" ${manual ? "" : "readonly"}></div>
          </div>
          <div class="form-note" style="margin-top:12px">${icon("info")} 热量目标不建议长期低于 ${t.floor} 千卡。如果出现持续疲劳、头晕或月经紊乱，请及时调整并咨询专业人士。</div>
        </section>

        <div class="form-actions">
          <span class="privacy-note">${icon("lock")} ${A.isPwa ? "修改只保存在这台手机" : "修改只保存在这台电脑"}</span>
          <button class="btn btn-primary" type="submit">${icon("check")} 保存设置</button>
        </div>
      </form>`;
  }

  function estimateGoalWeeks() {
    const p = A.state.profile;
    const diff = Number(p.weight) - Number(p.targetWeight);
    const rate = Number(p.weeklyLoss);
    if (!(diff > 0) || !(rate > 0)) return "—";
    return Math.max(1, Math.round(diff / rate));
  }

  function renderManage() {
    const raw = (() => {
      try {
        return localStorage.getItem(Q.APP.storageKey) || "";
      } catch (e) {
        return "";
      }
    })();
    const kb = (new Blob([raw]).size / 1024).toFixed(1);
    const count = A.state.weights.length + A.state.memos.length + Object.keys(A.state.days).length + A.state.customFoods.length;
    const pwa = !!A.isPwa;
    return `
      <div class="data-manage">
        <section class="card manage-card">
          <h2>本地数据与备份</h2>
          <p>${pwa
            ? "你的记录只保存在当前设备的本地存储里，不会上传。系统清理浏览器数据或卸载应用时可能删除记录，请定期导出备份。"
            : "你的记录同时保存在这个浏览器和本机 <code style=\"font-size:9px\">data\\state.json</code> 数据文件里，不会上传。每天第一次保存时还会留一份自动备份。"}</p>
          <div class="storage-meter">
            <div class="storage-meter-head"><span>当前数据占用</span><strong>${kb} KB · ${count} 条内容</strong></div>
            <div class="storage-track"><span class="storage-fill" style="width:${A.clamp((Number(kb) / 5120) * 100, 2, 100)}%"></span></div>
          </div>
          <div class="manage-actions">
            <button class="btn btn-primary btn-sm" type="button" data-action="export-data">${icon("download")} 导出备份</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="import-data">${icon("upload")} 导入备份</button>
            <input type="file" id="importFile" accept="application/json,.json" class="hidden">
          </div>
          <div class="form-note" style="margin-top:14px">${icon("info")} 备份是一个 JSON 文件，里面包含个人资料、饮食记录、计划和体重记录。建议每周导出一次。</div>
        </section>

        <section class="card manage-card danger-zone">
          <h2>重新开始</h2>
          <p>清空后会删除所有资料、饮食记录、饮食计划、体重和备忘录，无法恢复。建议先导出备份。</p>
          <div class="manage-actions">
            <button class="btn btn-danger-ghost btn-sm" type="button" data-action="reset-data">${icon("trash")} 清空全部数据</button>
          </div>
        </section>

        <section class="card manage-card">
          <h2>关于轻燃</h2>
          <div class="about-list">
            <div class="about-row"><span>版本</span><strong>1.0 · ${pwa ? "手机 PWA" : "本地版"}</strong></div>
            <div class="about-row"><span>数据位置</span><strong>${pwa ? "当前设备本地存储" : "本机 data\\state.json + 浏览器缓存"}</strong></div>
            <div class="about-row"><span>联网</span><strong>不需要</strong></div>
            <div class="about-row"><span>营养数据</span><strong>常见参考值，非医疗建议</strong></div>
          </div>
        </section>

        <section class="card manage-card">
          <h2>使用说明</h2>
          <div class="about-list">
            <div class="about-row"><span>切换页面</span><strong>${pwa ? "底部导航" : "左侧导航"}</strong></div>
            <div class="about-row"><span>关闭弹窗</span><strong>${pwa ? "点右上角 ×" : "Esc"}</strong></div>
            <div class="about-row"><span>紧急找回</span><strong>先导出备份，再导入新设备</strong></div>
            <div class="about-row"><span>安装到手机</span><strong>${pwa ? "浏览器菜单 → 添加到主屏幕" : "双击启动器打开"}</strong></div>
          </div>
        </section>
      </div>`;
  }

  /* =====================================================
     图表
     ===================================================== */
  A.weightChart = (entries, options = {}) => {
    const width = 700;
    const height = options.height || 160;
    const large = !!options.large;
    const padLeft = 10;
    const padRight = 10;
    const padTop = large ? 20 : 12;
    const padBottom = large ? 24 : 14;
    const list = (entries || []).slice(-90);
    if (!list.length) return "";
    const values = list.map((entry) => Number(entry.weight));
    if (options.showTarget) values.push(A.num(A.state.profile.targetWeight, values[0]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = Math.max(0.4, (max - min) * 0.28);
    min -= pad;
    max += pad;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const xFor = (index) => (list.length === 1 ? width / 2 : padLeft + (index / (list.length - 1)) * innerW);
    const yFor = (value) => padTop + (1 - (value - min) / (max - min)) * innerH;
    const points = list.map((entry, index) => ({ x: xFor(index), y: yFor(Number(entry.weight)), entry }));
    const gridCount = large ? 4 : 3;
    let grid = "";
    for (let i = 0; i <= gridCount; i += 1) {
      const y = padTop + (i / gridCount) * innerH;
      grid += `<line class="chart-grid-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"/>`;
    }
    let linePath = "";
    if (points.length === 1) {
      linePath = `M ${padLeft} ${points[0].y} L ${width - padRight} ${points[0].y}`;
    } else {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const midX = (current.x + next.x) / 2;
        linePath += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
      }
    }
    const areaPath = points.length === 1
      ? ""
      : `${linePath} L ${points[points.length - 1].x} ${height - padBottom + 4} L ${points[0].x} ${height - padBottom + 4} Z`;
    const targetY = options.showTarget ? yFor(A.num(A.state.profile.targetWeight, values[0])) : null;
    const gradientId = `${options.id || "weight"}Area`;
    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="体重趋势图">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#df7454" stop-opacity=".19"/>
            <stop offset="100%" stop-color="#df7454" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${grid}
        ${targetY != null ? `<line x1="${padLeft}" y1="${targetY}" x2="${width - padRight}" y2="${targetY}" stroke="#9fae92" stroke-width="1" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/>` : ""}
        ${areaPath ? `<path d="${areaPath}" fill="url(#${gradientId})"/>` : ""}
        <path d="${linePath}" class="chart-line" vector-effect="non-scaling-stroke"/>
        ${points.map((point, index) => `
          <g>
            <circle cx="${point.x}" cy="${point.y}" r="${index === points.length - 1 ? 5 : 3.2}" class="${index === points.length - 1 ? "chart-dot-last" : "chart-dot"}" vector-effect="non-scaling-stroke">
              <title>${A.formatDateShort(point.entry.date)} · ${Number(point.entry.weight).toFixed(1)} kg</title>
            </circle>
          </g>`).join("")}
      </svg>`;
  };

  /* =====================================================
     公共小部件
     ===================================================== */
  A.renderTopbarDate = () => {
    const date = A.todayISO();
    return `<strong>${A.formatDateShort(date)}</strong> · ${A.weekday(date)}`;
  };
})();
