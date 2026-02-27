const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Demo datasets (replace later with DB/CSV)
const NUTRITION_DATA = [
  { diet: "Vegan", calories: 420, protein: 20, carbs: 50, fat: 15 },
  { diet: "Keto", calories: 530, protein: 30, carbs: 10, fat: 60 },
  { diet: "Paleo", calories: 480, protein: 25, carbs: 35, fat: 30 },
  { diet: "Vegetarian", calories: 410, protein: 22, carbs: 45, fat: 20 },
  { diet: "Mediterranean", calories: 460, protein: 24, carbs: 40, fat: 28 },
];

const RECIPES = [
  { id: 1, name: "Vegan Bowl", dietType: "vegan", calories: 420, protein: 18 },
  { id: 2, name: "Keto Chicken", dietType: "keto", calories: 530, protein: 42 },
  { id: 3, name: "Paleo Salad", dietType: "paleo", calories: 390, protein: 28 },
  { id: 4, name: "Veggie Wrap", dietType: "vegetarian", calories: 410, protein: 20 },
  { id: 5, name: "Mediterranean Tuna", dietType: "mediterranean", calories: 480, protein: 35 },
  { id: 6, name: "Vegan Lentil Soup", dietType: "vegan", calories: 360, protein: 16 },
  { id: 7, name: "Keto Omelette", dietType: "keto", calories: 510, protein: 33 },
  { id: 8, name: "Paleo Steak Plate", dietType: "paleo", calories: 610, protein: 48 },
];

function toLower(s) {
  return String(s || "").toLowerCase().trim();
}

function avg(nums) {
  if (!nums.length) return 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Nutritional Insights Backend Running" });
});

/**
 * GET /api/insights
 * Query:
 * - dietType=all|vegan|keto|...
 * - q=search text (matches diet name)
 * - page, pageSize (included for consistency)
 *
 * Response:
 * { barData, scatterData, pieData, heatmap, summary, meta }
 */
app.get("/api/insights", (req, res) => {
  const dietType = toLower(req.query.dietType || "all");
  const q = toLower(req.query.q || "");
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.max(1, Number(req.query.pageSize || 10));

  const filtered = NUTRITION_DATA.filter((item) => {
    const matchDiet = dietType === "all" || toLower(item.diet) === dietType;
    const matchQ = !q || toLower(item.diet).includes(q);
    return matchDiet && matchQ;
  });

  // Charts
  const barData = {
    labels: filtered.map((d) => d.diet),
    datasets: [
      { label: "Protein", data: filtered.map((d) => d.protein) },
      { label: "Carbs", data: filtered.map((d) => d.carbs) },
      { label: "Fat", data: filtered.map((d) => d.fat) },
    ],
  };

  const scatterData = {
    datasets: [
      {
        label: "Protein vs Carbs",
        data: filtered.map((d) => ({ x: d.carbs, y: d.protein })),
      },
    ],
  };

  const pieData = {
    labels: filtered.map((d) => d.diet),
    datasets: [{ data: filtered.map((d) => d.calories) }],
  };

  const heatmap = {
    labels: ["Calories", "Protein", "Carbs", "Fat"],
    values: [
      [1, 0.4, 0.6, 0.7],
      [0.4, 1, 0.2, 0.3],
      [0.6, 0.2, 1, 0.5],
      [0.7, 0.3, 0.5, 1],
    ],
  };

  // Summary (this makes your “insights” feel real)
  const summary = {
    totalDietTypes: filtered.length,
    avgCalories: avg(filtered.map((d) => d.calories)),
    avgProtein: avg(filtered.map((d) => d.protein)),
    avgCarbs: avg(filtered.map((d) => d.carbs)),
    avgFat: avg(filtered.map((d) => d.fat)),
    bestHighProtein:
      filtered.slice().sort((a, b) => b.protein - a.protein)[0]?.diet || null,
    bestLowCarb:
      filtered.slice().sort((a, b) => a.carbs - b.carbs)[0]?.diet || null,
  };

  res.json({
    barData,
    scatterData,
    pieData,
    heatmap,
    summary,
    meta: { page, pageSize, total: filtered.length, dietType, q },
  });
});

/**
 * GET /api/recipes
 * Query:
 * - dietType=all|vegan|keto|...
 * - q=search text (matches recipe name)
 * - page, pageSize
 *
 * Response:
 * { recipes: [...], meta }
 */
app.get("/api/recipes", (req, res) => {
  const dietType = toLower(req.query.dietType || "all");
  const q = toLower(req.query.q || "");
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.max(1, Number(req.query.pageSize || 10));

  const filtered = RECIPES.filter((r) => {
    const matchDiet = dietType === "all" || toLower(r.dietType) === dietType;
    const matchQ = !q || toLower(r.name).includes(q);
    return matchDiet && matchQ;
  });

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  res.json({
    recipes: items,
    meta: { page, pageSize, total: filtered.length, dietType, q },
  });
});

/**
 * GET /api/clusters
 * Response:
 * { clusters: [...] }
 */
app.get("/api/clusters", (req, res) => {
  res.json({
    clusters: [
      { clusterId: 1, name: "High Protein", foods: ["Chicken", "Eggs", "Greek Yogurt"] },
      { clusterId: 2, name: "Low Carb", foods: ["Avocado", "Salmon", "Cheese"] },
      { clusterId: 3, name: "Balanced Meals", foods: ["Oats", "Rice", "Beans"] },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running: http://localhost:${PORT}`);
});