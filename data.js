/* 轻燃 · 内置食物数据与计划模板
 * 营养值均为每 100 克可食部分的常见参考值，用于日常估算。
 */
(function () {
  const Q = (window.QINGRAN = window.QINGRAN || {});

  Q.APP = {
    name: "轻燃",
    en: "QINGRAN",
    tagline: "吃对，比少吃更重要",
    storageKey: "qingran.v1",
    version: 1,
  };

  Q.CATEGORIES = [
    { id: "staple", name: "主食谷物", short: "主食", accent: "#D9A441", soft: "#FBF1DA", glyph: "谷", desc: "米饭、燕麦、薯类" },
    { id: "protein", name: "肉蛋水产", short: "肉蛋", accent: "#D97757", soft: "#FBEAE3", glyph: "肉", desc: "鸡胸、鱼虾、鸡蛋" },
    { id: "dairy", name: "豆奶乳品", short: "豆奶", accent: "#7D9FBA", soft: "#EAF1F6", glyph: "豆", desc: "牛奶、豆腐、酸奶" },
    { id: "vegetable", name: "蔬菜菌菇", short: "蔬菜", accent: "#7E9E68", soft: "#EDF3E7", glyph: "蔬", desc: "绿叶菜、瓜果、菌菇" },
    { id: "fruit", name: "水果", short: "水果", accent: "#D98B99", soft: "#FAEDF0", glyph: "果", desc: "莓果、苹果、柑橘" },
    { id: "fat", name: "坚果油脂", short: "坚果", accent: "#B08A5A", soft: "#F6EFE4", glyph: "脂", desc: "坚果、牛油果、油" },
    { id: "snack", name: "零食饮料", short: "零食", accent: "#9D86AE", soft: "#F2EDF6", glyph: "零", desc: "咖啡、奶茶、小零食" },
    { id: "dish", name: "家常菜", short: "家常", accent: "#BF6D4A", soft: "#F8EAE3", glyph: "菜", desc: "炒菜、汤面、饺子" },
  ];

  Q.MEALS = [
    { key: "breakfast", name: "早餐", time: "07:00 – 09:00", accent: "#D9A441", soft: "#FBF1DA", glyph: "早" },
    { key: "lunch", name: "午餐", time: "11:30 – 13:30", accent: "#D97757", soft: "#FBEAE3", glyph: "午" },
    { key: "dinner", name: "晚餐", time: "17:30 – 19:30", accent: "#7E9E68", soft: "#EDF3E7", glyph: "晚" },
    { key: "snack", name: "加餐", time: "嘴馋的时候", accent: "#9D86AE", soft: "#F2EDF6", glyph: "加" },
  ];

  Q.ACTIVITY_LEVELS = [
    { value: 1.2, name: "久坐为主", desc: "办公室工作，很少运动" },
    { value: 1.375, name: "轻度活动", desc: "每周运动 1–3 次" },
    { value: 1.55, name: "中度活动", desc: "每周运动 3–5 次" },
    { value: 1.725, name: "高度活动", desc: "体力工作或高频训练" },
  ];

  Q.LOSS_RATES = [
    { value: 0.25, name: "慢慢来", desc: "每周约 0.25 kg" },
    { value: 0.5, name: "稳稳减", desc: "每周约 0.5 kg" },
    { value: 0.75, name: "快一点", desc: "每周约 0.75 kg" },
  ];

  const F = (id, name, cat, kcal, p, c, f, opts = {}) => ({
    id, name, cat, kcal, p, c, f,
    unit: opts.unit || { label: "份", grams: 100 },
    step: opts.step || 10,
    tags: opts.tags || [],
    role: opts.role || null,
    meals: opts.meals || [],
    note: opts.note || "",
    custom: false,
  });

  Q.FOODS = [
    /* 主食谷物 */
    F("rice", "米饭（熟）", "staple", 116, 2.6, 25.9, 0.3, { unit: { label: "碗", grams: 150 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["易消化"], note: "常见小碗约 150 克" }),
    F("brown_rice", "糙米饭（熟）", "staple", 112, 2.6, 23.0, 0.9, { unit: { label: "碗", grams: 150 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["优质碳水", "高纤维"] }),
    F("oats", "燕麦片（干）", "staple", 377, 13.5, 66.3, 6.7, { unit: { label: "份", grams: 40 }, step: 5, role: "staple", meals: ["breakfast"], tags: ["高纤维", "饱腹"] }),
    F("whole_wheat_bread", "全麦面包", "staple", 246, 9.0, 41.0, 4.2, { unit: { label: "片", grams: 35 }, step: 35, role: "staple", meals: ["breakfast"], tags: ["方便", "高纤维"] }),
    F("sweet_potato", "红薯（蒸）", "staple", 86, 1.6, 20.1, 0.1, { unit: { label: "个", grams: 150 }, step: 25, role: "staple", meals: ["breakfast", "lunch", "dinner"], tags: ["高纤维", "饱腹", "低脂"] }),
    F("corn", "玉米（煮）", "staple", 112, 4.0, 22.8, 1.2, { unit: { label: "根", grams: 150 }, step: 25, role: "staple", meals: ["breakfast", "lunch", "dinner"], tags: ["高纤维", "饱腹"] }),
    F("millet_porridge", "小米粥", "staple", 46, 1.4, 9.7, 0.3, { unit: { label: "碗", grams: 300 }, step: 50, role: "staple", meals: ["breakfast"], tags: ["暖胃", "低脂"] }),
    F("noodles", "面条（熟）", "staple", 137, 4.5, 27.5, 0.8, { unit: { label: "碗", grams: 200 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["方便"] }),
    F("potato", "土豆（蒸）", "staple", 77, 2.0, 17.5, 0.1, { unit: { label: "个", grams: 150 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["饱腹", "低脂"] }),
    F("quinoa", "藜麦（熟）", "staple", 120, 4.4, 21.3, 1.9, { unit: { label: "碗", grams: 150 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["高蛋白", "优质碳水"] }),
    F("buckwheat_noodles", "荞麦面（熟）", "staple", 130, 5.0, 25.0, 0.7, { unit: { label: "碗", grams: 200 }, step: 25, role: "staple", meals: ["lunch", "dinner"], tags: ["优质碳水"] }),

    /* 肉蛋水产 */
    F("chicken_breast", "鸡胸肉（熟）", "protein", 165, 31.0, 0.0, 3.6, { unit: { label: "块", grams: 120 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂"] }),
    F("egg", "鸡蛋（水煮）", "protein", 143, 12.6, 0.7, 9.5, { unit: { label: "个", grams: 50 }, step: 50, role: "protein", meals: ["breakfast", "lunch", "dinner"], tags: ["高蛋白", "方便"] }),
    F("beef", "瘦牛肉（熟）", "protein", 187, 26.0, 0.0, 9.0, { unit: { label: "份", grams: 100 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白"] }),
    F("shrimp", "虾仁（熟）", "protein", 99, 24.0, 0.2, 0.3, { unit: { label: "份", grams: 100 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂", "低卡"] }),
    F("salmon", "三文鱼", "protein", 208, 20.0, 0.0, 13.0, { unit: { label: "份", grams: 100 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "优质脂肪"] }),
    F("cod", "鳕鱼", "protein", 82, 17.8, 0.0, 0.7, { unit: { label: "块", grams: 120 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂", "低卡"] }),
    F("pork_tenderloin", "猪里脊（熟）", "protein", 143, 26.0, 0.0, 3.5, { unit: { label: "份", grams: 100 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂"] }),
    F("tuna", "水浸金枪鱼", "protein", 116, 25.5, 0.0, 0.8, { unit: { label: "罐", grams: 100 }, step: 25, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂", "方便"] }),
    F("chicken_thigh", "去皮鸡腿肉（熟）", "protein", 209, 26.0, 0.0, 10.9, { unit: { label: "份", grams: 120 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白"] }),
    F("tilapia", "鲈鱼/罗非鱼", "protein", 98, 20.0, 0.0, 1.7, { unit: { label: "条", grams: 150 }, step: 25, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂"] }),
    F("lamb", "瘦羊肉（熟）", "protein", 203, 28.0, 0.0, 9.0, { unit: { label: "份", grams: 100 }, step: 20, role: "protein", meals: ["lunch", "dinner"], tags: ["高蛋白"] }),

    /* 豆奶乳品 */
    F("milk", "纯牛奶", "dairy", 54, 3.0, 3.4, 3.2, { unit: { label: "杯", grams: 250 }, step: 50, role: "dairy", meals: ["breakfast", "snack"], tags: ["补钙"] }),
    F("soy_milk", "无糖豆浆", "dairy", 31, 3.0, 1.2, 1.6, { unit: { label: "杯", grams: 250 }, step: 50, role: "dairy", meals: ["breakfast", "snack"], tags: ["植物蛋白", "低卡"] }),
    F("greek_yogurt", "无糖希腊酸奶", "dairy", 59, 10.0, 3.6, 0.4, { unit: { label: "杯", grams: 150 }, step: 25, role: "dairy", meals: ["breakfast", "snack"], tags: ["高蛋白", "低脂"] }),
    F("tofu_firm", "北豆腐", "dairy", 82, 8.1, 1.9, 4.8, { unit: { label: "块", grams: 100 }, step: 25, role: "protein", meals: ["lunch", "dinner"], tags: ["植物蛋白", "低卡"] }),
    F("tofu_silken", "嫩豆腐", "dairy", 55, 5.7, 2.4, 2.7, { unit: { label: "盒", grams: 150 }, step: 25, role: "protein", meals: ["lunch", "dinner"], tags: ["植物蛋白", "低卡"] }),
    F("edamame", "毛豆", "dairy", 121, 11.9, 8.9, 5.2, { unit: { label: "小碗", grams: 100 }, step: 25, role: "protein", meals: ["lunch", "dinner", "snack"], tags: ["植物蛋白", "高纤维"] }),
    F("cheese", "切达奶酪", "dairy", 328, 25.0, 3.5, 23.0, { unit: { label: "片", grams: 20 }, step: 20, role: "fat", meals: ["breakfast", "snack"], tags: ["高蛋白", "高脂"] }),
    F("yogurt_plain", "原味酸奶", "dairy", 72, 2.5, 9.3, 2.7, { unit: { label: "杯", grams: 150 }, step: 25, role: "dairy", meals: ["breakfast", "snack"], tags: ["补钙"] }),

    /* 蔬菜菌菇 */
    F("broccoli", "西兰花", "vegetable", 34, 2.8, 6.6, 0.4, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["高纤维", "低卡"] }),
    F("spinach", "菠菜", "vegetable", 23, 2.9, 3.6, 0.4, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["高纤维", "低卡"] }),
    F("lettuce", "生菜", "vegetable", 15, 1.4, 2.9, 0.2, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),
    F("tomato", "番茄", "vegetable", 18, 0.9, 3.9, 0.2, { unit: { label: "个", grams: 150 }, step: 25, role: "vegetable", meals: ["breakfast", "lunch", "dinner"], tags: ["低卡"] }),
    F("cucumber", "黄瓜", "vegetable", 15, 0.7, 3.6, 0.1, { unit: { label: "根", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner", "snack"], tags: ["低卡"] }),
    F("carrot", "胡萝卜", "vegetable", 41, 0.9, 9.6, 0.2, { unit: { label: "根", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["高纤维", "低卡"] }),
    F("shiitake", "香菇", "vegetable", 26, 2.2, 5.2, 0.3, { unit: { label: "份", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),
    F("cabbage", "圆白菜", "vegetable", 24, 1.5, 4.6, 0.2, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),
    F("bell_pepper", "彩椒", "vegetable", 26, 1.0, 6.0, 0.3, { unit: { label: "个", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡"] }),
    F("zucchini", "西葫芦", "vegetable", 17, 1.2, 3.1, 0.3, { unit: { label: "根", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡"] }),
    F("cauliflower", "花菜", "vegetable", 25, 1.9, 5.0, 0.3, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),
    F("asparagus", "芦笋", "vegetable", 20, 2.2, 3.9, 0.1, { unit: { label: "份", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡"] }),
    F("bok_choy", "小白菜", "vegetable", 13, 1.5, 2.2, 0.2, { unit: { label: "份", grams: 150 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),
    F("winter_melon", "冬瓜", "vegetable", 12, 0.4, 3.0, 0.2, { unit: { label: "份", grams: 200 }, step: 50, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡"] }),
    F("okra", "秋葵", "vegetable", 33, 1.9, 7.5, 0.2, { unit: { label: "份", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["高纤维", "低卡"] }),
    F("enoki", "金针菇", "vegetable", 32, 2.4, 6.0, 0.3, { unit: { label: "份", grams: 100 }, step: 25, role: "vegetable", meals: ["lunch", "dinner"], tags: ["低卡", "高纤维"] }),

    /* 水果 */
    F("apple", "苹果", "fruit", 52, 0.3, 13.8, 0.2, { unit: { label: "个", grams: 150 }, step: 25, role: "fruit", meals: ["breakfast", "snack"], tags: ["高纤维"] }),
    F("banana", "香蕉", "fruit", 93, 1.4, 22.0, 0.2, { unit: { label: "根", grams: 100 }, step: 25, role: "fruit", meals: ["breakfast", "snack"], tags: ["方便"] }),
    F("blueberry", "蓝莓", "fruit", 57, 0.7, 14.5, 0.3, { unit: { label: "小盒", grams: 80 }, step: 20, role: "fruit", meals: ["breakfast", "snack"], tags: ["低卡", "控糖"] }),
    F("strawberry", "草莓", "fruit", 32, 0.7, 7.7, 0.3, { unit: { label: "份", grams: 100 }, step: 25, role: "fruit", meals: ["breakfast", "snack"], tags: ["低卡", "控糖"] }),
    F("orange", "橙子", "fruit", 47, 0.9, 11.8, 0.1, { unit: { label: "个", grams: 150 }, step: 25, role: "fruit", meals: ["breakfast", "snack"], tags: ["控糖"] }),
    F("kiwi", "猕猴桃", "fruit", 61, 1.1, 14.7, 0.5, { unit: { label: "个", grams: 100 }, step: 25, role: "fruit", meals: ["breakfast", "snack"], tags: ["高纤维"] }),
    F("grape", "葡萄", "fruit", 69, 0.7, 18.1, 0.2, { unit: { label: "小碗", grams: 100 }, step: 25, role: "fruit", meals: ["snack"], tags: ["控糖"] }),
    F("pear", "梨", "fruit", 57, 0.4, 15.2, 0.1, { unit: { label: "个", grams: 150 }, step: 25, role: "fruit", meals: ["snack"], tags: ["高纤维"] }),
    F("watermelon", "西瓜", "fruit", 30, 0.6, 7.6, 0.2, { unit: { label: "块", grams: 200 }, step: 50, role: "fruit", meals: ["snack"], tags: ["低卡"] }),
    F("avocado", "牛油果", "fruit", 160, 2.0, 8.5, 14.7, { unit: { label: "个", grams: 100 }, step: 20, role: "fat", meals: ["breakfast", "lunch"], tags: ["优质脂肪", "高纤维"] }),

    /* 坚果油脂 */
    F("almond", "巴旦木", "fat", 579, 21.0, 22.0, 50.0, { unit: { label: "小把", grams: 15 }, step: 5, role: "fat", meals: ["breakfast", "snack"], tags: ["优质脂肪", "饱腹"] }),
    F("walnut", "核桃仁", "fat", 654, 15.0, 14.0, 65.0, { unit: { label: "小把", grams: 15 }, step: 5, role: "fat", meals: ["breakfast", "snack"], tags: ["优质脂肪"] }),
    F("peanut_butter", "无糖花生酱", "fat", 588, 25.0, 20.0, 50.0, { unit: { label: "勺", grams: 15 }, step: 5, role: "fat", meals: ["breakfast", "snack"], tags: ["优质脂肪"] }),
    F("olive_oil", "橄榄油", "fat", 884, 0.0, 0.0, 100.0, { unit: { label: "茶匙", grams: 5 }, step: 5, role: "fat", meals: ["lunch", "dinner"], tags: ["优质脂肪"] }),

    /* 零食饮料 */
    F("dark_chocolate", "黑巧克力（70%）", "snack", 598, 7.8, 45.9, 42.6, { unit: { label: "小块", grams: 15 }, step: 5, role: "snack", meals: ["snack"], tags: ["控糖"] }),
    F("chips", "薯片", "snack", 536, 7.0, 53.0, 35.0, { unit: { label: "小包", grams: 30 }, step: 10, role: "snack", meals: ["snack"], tags: ["高脂"] }),
    F("cola", "可乐", "snack", 42, 0.0, 10.6, 0.0, { unit: { label: "罐", grams: 330 }, step: 330, role: "snack", meals: ["snack"], tags: ["控糖"] }),
    F("milk_tea", "奶茶（全糖）", "snack", 70, 1.0, 12.0, 2.0, { unit: { label: "杯", grams: 400 }, step: 100, role: "snack", meals: ["snack"], tags: ["控糖"] }),
    F("cookie", "曲奇饼干", "snack", 480, 6.0, 65.0, 22.0, { unit: { label: "块", grams: 30 }, step: 10, role: "snack", meals: ["snack"], tags: [] }),
    F("instant_noodles", "方便面", "snack", 473, 9.0, 61.0, 21.0, { unit: { label: "包", grams: 100 }, step: 25, role: "snack", meals: ["snack"], tags: ["高脂"] }),
    F("ice_cream", "冰淇淋", "snack", 207, 3.5, 24.0, 11.0, { unit: { label: "球", grams: 60 }, step: 30, role: "snack", meals: ["snack"], tags: [] }),
    F("beer", "啤酒", "snack", 43, 0.5, 3.6, 0.0, { unit: { label: "罐", grams: 330 }, step: 330, role: "snack", meals: ["snack"], tags: [] }),

    /* 家常菜 */
    F("tomato_egg", "番茄炒蛋", "dish", 108, 5.4, 4.3, 7.6, { unit: { label: "盘", grams: 200 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: ["家常"] }),
    F("kung_pao_chicken", "宫保鸡丁", "dish", 231, 15.0, 11.0, 14.0, { unit: { label: "份", grams: 150 }, step: 25, role: "dish", meals: ["lunch", "dinner"], tags: ["高蛋白"] }),
    F("mapo_tofu", "麻婆豆腐", "dish", 132, 8.0, 5.0, 9.0, { unit: { label: "份", grams: 200 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: ["植物蛋白"] }),
    F("steamed_bass", "清蒸鲈鱼", "dish", 104, 19.0, 0.6, 3.0, { unit: { label: "份", grams: 150 }, step: 25, role: "dish", meals: ["lunch", "dinner"], tags: ["高蛋白", "低脂"] }),
    F("garlic_greens", "蒜蓉青菜", "dish", 62, 1.8, 4.2, 4.3, { unit: { label: "盘", grams: 200 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: ["高纤维"] }),
    F("chicken_salad", "鸡胸沙拉", "dish", 120, 12.0, 5.0, 5.5, { unit: { label: "份", grams: 250 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: ["高蛋白", "低卡"] }),
    F("beef_noodles", "牛肉面", "dish", 128, 7.0, 18.0, 3.0, { unit: { label: "碗", grams: 400 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: ["方便"] }),
    F("dumplings", "猪肉白菜饺子", "dish", 219, 8.0, 25.0, 9.0, { unit: { label: "个", grams: 20 }, step: 20, role: "dish", meals: ["lunch", "dinner"], tags: ["方便"] }),
    F("egg_fried_rice", "蛋炒饭", "dish", 174, 5.0, 24.0, 6.0, { unit: { label: "碗", grams: 250 }, step: 50, role: "dish", meals: ["lunch", "dinner"], tags: [] }),
  ];

  Q.PLAN_TEMPLATES = {
    breakfast: [
      { title: "燕麦牛奶碗", items: [{ id: "oats", grams: 40 }, { id: "milk", grams: 250 }, { id: "egg", grams: 50 }, { id: "blueberry", grams: 80 }] },
      { title: "全麦蛋奶组合", items: [{ id: "whole_wheat_bread", grams: 70 }, { id: "egg", grams: 50 }, { id: "greek_yogurt", grams: 150 }, { id: "strawberry", grams: 100 }] },
      { title: "暖胃小米粥", items: [{ id: "millet_porridge", grams: 300 }, { id: "egg", grams: 50 }, { id: "soy_milk", grams: 250 }, { id: "apple", grams: 100 }] },
      { title: "红薯鸡蛋早餐", items: [{ id: "sweet_potato", grams: 150 }, { id: "milk", grams: 250 }, { id: "egg", grams: 50 }, { id: "kiwi", grams: 100 }] },
    ],
    lunch: [
      { title: "鸡胸糙米能量碗", items: [{ id: "brown_rice", grams: 150 }, { id: "chicken_breast", grams: 120 }, { id: "broccoli", grams: 150 }, { id: "tomato", grams: 100 }, { id: "olive_oil", grams: 5 }] },
      { title: "牛肉时蔬饭", items: [{ id: "rice", grams: 150 }, { id: "beef", grams: 100 }, { id: "lettuce", grams: 150 }, { id: "cucumber", grams: 100 }, { id: "olive_oil", grams: 5 }] },
      { title: "虾仁花菜红薯盘", items: [{ id: "sweet_potato", grams: 180 }, { id: "shrimp", grams: 120 }, { id: "cauliflower", grams: 150 }, { id: "spinach", grams: 100 }, { id: "olive_oil", grams: 5 }] },
      { title: "三文鱼藜麦沙拉", items: [{ id: "quinoa", grams: 150 }, { id: "salmon", grams: 100 }, { id: "asparagus", grams: 120 }, { id: "bell_pepper", grams: 100 }, { id: "olive_oil", grams: 5 }] },
    ],
    dinner: [
      { title: "鳕鱼豆腐晚餐", items: [{ id: "sweet_potato", grams: 150 }, { id: "cod", grams: 120 }, { id: "lettuce", grams: 150 }, { id: "tofu_firm", grams: 80 }, { id: "olive_oil", grams: 5 }] },
      { title: "豆腐杂粮晚餐", items: [{ id: "brown_rice", grams: 100 }, { id: "tofu_firm", grams: 120 }, { id: "bok_choy", grams: 150 }, { id: "shiitake", grams: 100 }, { id: "olive_oil", grams: 5 }] },
      { title: "玉米鸡胸轻食", items: [{ id: "corn", grams: 150 }, { id: "chicken_breast", grams: 100 }, { id: "zucchini", grams: 150 }, { id: "tomato", grams: 100 }, { id: "olive_oil", grams: 5 }] },
      { title: "清蒸鱼配米饭", items: [{ id: "rice", grams: 100 }, { id: "tilapia", grams: 120 }, { id: "cabbage", grams: 150 }, { id: "carrot", grams: 100 }, { id: "olive_oil", grams: 5 }] },
    ],
  };
})();
