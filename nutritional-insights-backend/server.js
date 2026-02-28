const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "";

/* --------------------------- MongoDB Models --------------------------- */

const nutritionSchema = new mongoose.Schema(
  {
    diet: { type: String, required: true, index: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true }
  },
  { timestamps: true }
);

const recipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    dietType: { type: String, required: true, index: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true }
  },
  { timestamps: true }
);

const Nutrition = mongoose.model("Nutrition", nutritionSchema);
const Recipe = mongoose.model("Recipe", recipeSchema);

/* --------------------------- Helpers --------------------------- */

function toLower(s) {
  return String(s || "").toLowerCase().trim();
}

function avg(nums) {
  if (!nums.length) return 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

/* --------------------------- Routes --------------------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Nutritional Insights Backend Running (Azure App Service + Cosmos DB)",
    dbConnected: mongoose.connection.readyState === 1
  });
});

// Seed DB once
app.get("/api/seed", async (req, res) => {
  try {
    await Nutrition.deleteMany({});
    await Recipe.deleteMany({});

    await Nutrition.insertMany([
      { diet: "Vegan", calories: 420, protein: 20, carbs: 50, fat: 15 },
      { diet: "Keto", calories: 530, protein: 30, carbs: 10, fat: 60 },
      { diet: "Paleo", calories: 480, protein: 25, carbs: 35, fat: 30 },
      { diet: "Vegetarian", calories: 410, protein: 22, carbs: 45, fat: 20 },
      { diet: "Mediterranean", calories: 460, protein: 24, carbs: 40, fat: 28 }
    ]);

    await Recipe.insertMany([
      { name: "Vegan Bowl", dietType: "vegan", calories: 420, protein: 18 },
      { name: "Keto Chicken", dietType: "keto", calories: 530, protein: 42 },
      { name: "Paleo Salad", dietType: "paleo", calories: 390, protein: 28 },
      { name: "Veggie Wrap", dietType: "vegetarian", calories: 410, protein: 20 },
      { name: "Mediterranean Tuna", dietType: "mediterranean", calories: 480, protein: 35 },
      { name: "Vegan Lentil Soup", dietType: "vegan", calories: 360, protein: 16 },
      { name: "Keto Omelette", dietType: "keto", calories: 510, protein: 33 },
      { name: "Paleo Steak Plate", dietType: "paleo", calories: 610, protein: 48 }
    ]);

    res.json({ ok: true, message: "Seeded Cosmos DB successfully" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/insights", async (req, res) => {
  try {
    const dietType = toLower(req.query.dietType || "all");
    const q = toLower(req.query.q || "");
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.max(1, Number(req.query.pageSize || 10));

    const filter = {};
    if (dietType !== "all") filter.diet = new RegExp(`^${dietType}$`, "i");
    if (q) filter.diet = new RegExp(q, "i");

    const docs = await Nutrition.find(filter).sort({ diet: 1 }).lean();

    const barData = {
      labels: docs.map((d) => d.diet),
      datasets: [
        { label: "Protein", data: docs.map((d) => d.protein) },
        { label: "Carbs", data: docs.map((d) => d.carbs) },
        { label: "Fat", data: docs.map((d) => d.fat) }
      ]
    };

    const scatterData = {
      datasets: [
        {
          label: "Protein vs Carbs",
          data: docs.map((d) => ({ x: d.carbs, y: d.protein }))
        }
      ]
    };

    const pieData = {
      labels: docs.map((d) => d.diet),
      datasets: [{ data: docs.map((d) => d.calories) }]
    };

    const heatmap = {
      labels: ["Calories", "Protein", "Carbs", "Fat"],
      values: [
        [1, 0.4, 0.6, 0.7],
        [0.4, 1, 0.2, 0.3],
        [0.6, 0.2, 1, 0.5],
        [0.7, 0.3, 0.5, 1]
      ]
    };

    const summary = {
      totalDietTypes: docs.length,
      avgCalories: avg(docs.map((d) => d.calories)),
      avgProtein: avg(docs.map((d) => d.protein)),
      avgCarbs: avg(docs.map((d) => d.carbs)),
      avgFat: avg(docs.map((d) => d.fat)),
      bestHighProtein: docs.slice().sort((a, b) => b.protein - a.protein)[0]?.diet || null,
      bestLowCarb: docs.slice().sort((a, b) => a.carbs - b.carbs)[0]?.diet || null
    };

    res.json({
      barData,
      scatterData,
      pieData,
      heatmap,
      summary,
      meta: { page, pageSize, total: docs.length, dietType, q }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/recipes", async (req, res) => {
  try {
    const dietType = toLower(req.query.dietType || "all");
    const q = toLower(req.query.q || "");
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.max(1, Number(req.query.pageSize || 10));

    const filter = {};
    if (dietType !== "all") filter.dietType = new RegExp(`^${dietType}$`, "i");
    if (q) filter.name = new RegExp(q, "i");

    const total = await Recipe.countDocuments(filter);
    const items = await Recipe.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({ recipes: items, meta: { page, pageSize, total, dietType, q } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/clusters", async (req, res) => {
  res.json({
    clusters: [
      { clusterId: 1, name: "High Protein", foods: ["Chicken", "Eggs", "Greek Yogurt"] },
      { clusterId: 2, name: "Low Carb", foods: ["Avocado", "Salmon", "Cheese"] },
      { clusterId: 3, name: "Balanced Meals", foods: ["Oats", "Rice", "Beans"] }
    ]
  });
});

/* --------------------------- Start --------------------------- */

async function start() {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI. Set it in Azure App Service settings.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "nutritional_insights"
    });
    console.log("✅ Connected to Azure Cosmos DB (Mongo API)");

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error("❌ Mongo connection error:", e.message);
    process.exit(1);
  }
}

start();
