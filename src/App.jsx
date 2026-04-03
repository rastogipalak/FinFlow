import { useState, useRef, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  MessageCircle, TrendingUp, CreditCard, Plus, AlertCircle,
  LayoutDashboard, List, Wallet, ShoppingCart, Coffee,
  Utensils, Zap, Bus, BookOpen, Gamepad2, Send, Home,
  Lightbulb, Target, ChevronRight, Trash2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  Backend URL — talks to server.js which holds the Gemini key
// ─────────────────────────────────────────────────────────────
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

async function callFinBot(systemPrompt, messages) {
  const res = await fetch(`${BACKEND}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data.reply;
}

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const CATEGORIES = {
  Food:          { icon: Utensils,     color: "#f97316", bg: "#fff7ed" },
  Transport:     { icon: Bus,          color: "#3b82f6", bg: "#eff6ff" },
  Shopping:      { icon: ShoppingCart, color: "#a855f7", bg: "#faf5ff" },
  Entertainment: { icon: Gamepad2,     color: "#ec4899", bg: "#fdf2f8" },
  Education:     { icon: BookOpen,     color: "#10b981", bg: "#ecfdf5" },
  Utilities:     { icon: Zap,          color: "#f59e0b", bg: "#fffbeb" },
  Coffee:        { icon: Coffee,       color: "#92400e", bg: "#fef3c7" },
  Housing:       { icon: Home,         color: "#6366f1", bg: "#eef2ff" },
  Other:         { icon: Wallet,       color: "#6b7280", bg: "#f9fafb" },
};

const DEFAULT_BUDGETS = {
  Food: 4000, Transport: 1500, Shopping: 2000,
  Entertainment: 800, Education: 2500, Utilities: 1200,
  Coffee: 500, Housing: 9000, Other: 1000,
};

const PIE_COLORS = [
  "#f97316","#3b82f6","#a855f7","#ec4899",
  "#10b981","#f59e0b","#92400e","#6366f1","#6b7280",
];

const inp = {
  border: "1px solid #e8e6e0", borderRadius: 10, padding: "9px 12px",
  fontSize: 13.5, fontFamily: "inherit", background: "#f8f7f4",
  outline: "none", color: "#1a1a1a", width: "100%", boxSizing: "border-box",
};

// ─────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>No expenses yet</div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>
        Add your transactions to see insights and charts
      </div>
      <button onClick={onAdd} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10,
        padding: "9px 18px", fontSize: 13.5, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        <Plus size={15} /> Add First Expense
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("dashboard");
  const [transactions, setTx]       = useState([]);
  const [budgets, setBudgets]        = useState(DEFAULT_BUDGETS);
  const [messages, setMessages]     = useState([{
    role: "assistant",
    content:
      "Hi! I'm FinBot powered by Gemini 2.5 Flash ✨\n\n" +
      "Add your expenses in the Expenses tab, then ask me anything —\n" +
      "\"Where am I overspending?\", \"How can I save ₹2000?\", \"Give me a budget plan\" etc.",
  }]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({
    desc: "", category: "Food", amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── derived state ──────────────────────────────────────────
  const categoryTotals = useMemo(() => {
    const t = {};
    transactions.forEach((tx) => { t[tx.category] = (t[tx.category] || 0) + tx.amount; });
    return t;
  }, [transactions]);

  const totalSpent  = useMemo(() => Object.values(categoryTotals).reduce((a, b) => a + b, 0), [categoryTotals]);
  const totalBudget = useMemo(() => Object.values(budgets).reduce((a, b) => a + b, 0), [budgets]);
  const savingsRate = totalBudget > 0
    ? Math.max(0, Math.round(((totalBudget - totalSpent) / totalBudget) * 100))
    : 0;

  const pieData = useMemo(() =>
    Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    [categoryTotals]);

  const overBudget = useMemo(() =>
    Object.entries(categoryTotals).filter(([cat, amt]) => budgets[cat] && amt > budgets[cat]),
    [categoryTotals, budgets]);

  const budgetData = useMemo(() =>
    Object.entries(budgets).map(([cat, budget]) => ({
      cat, budget, spent: categoryTotals[cat] || 0,
      pct: Math.min(100, Math.round(((categoryTotals[cat] || 0) / budget) * 100)),
    })),
    [budgets, categoryTotals]);

  // ── transactions ───────────────────────────────────────────
  const addTransaction = () => {
    if (!newTx.desc.trim() || !newTx.amount) return;
    setTx((prev) => [{ ...newTx, id: Date.now(), amount: parseFloat(newTx.amount) }, ...prev]);
    setNewTx({ desc: "", category: "Food", amount: "", date: new Date().toISOString().split("T")[0] });
    setShowAddForm(false);
  };

  const deleteTx = (id) => setTx((prev) => prev.filter((t) => t.id !== id));

  // ── system prompt sent to backend ──────────────────────────
  const buildSystemPrompt = () => {
    const txLines = transactions.length
      ? transactions.map((t) => `- ${t.date}: ${t.desc} (${t.category}) ₹${t.amount}`).join("\n")
      : "No transactions recorded yet.";
    const catSummary = Object.entries(categoryTotals)
      .map(([c, a]) => `${c}: ₹${a} (budget ₹${budgets[c]})`).join(", ") || "None";
    const alerts = overBudget.map(([c, a]) => `${c}: ₹${a} vs ₹${budgets[c]}`).join(", ") || "None";

    return `You are FinBot, a friendly AI personal finance assistant for college students in India.

USER FINANCIAL DATA:
- Total Spent: ₹${totalSpent.toLocaleString("en-IN")}
- Monthly Budget: ₹${totalBudget.toLocaleString("en-IN")}
- Savings Rate: ${savingsRate}%
- By Category: ${catSummary}
- Over Budget: ${alerts}

TRANSACTIONS:
${txLines}

Rules: Be concise, warm, actionable. Use ₹ symbol. Keep replies under 150 words. Bullet points for tips. Indian college student context (UPI, mess food, local transport etc.).`;
  };

  // ── send chat message ──────────────────────────────────────
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: "user", content: chatInput.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setChatInput("");
    setChatLoading(true);

    // strip initial greeting before sending to API
    const apiMsgs = history.filter((m, i) => !(i === 0 && m.role === "assistant"));

    try {
      const reply = await callFinBot(buildSystemPrompt(), apiMsgs);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const tip = pieData[0]
        ? `Quick tip: "${pieData[0].name}" is your top spend at ₹${pieData[0].value?.toLocaleString("en-IN")}.`
        : "Add some expenses so I can analyse them!";
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${err.message}\n\nMake sure server.js is running ( npm run server ).\n\n${tip}`,
      }]);
    }
    setChatLoading(false);
  };

  const TABS = [
    { id: "dashboard",    label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Expenses",   icon: List },
    { id: "budget",       label: "Budget",     icon: Target },
    { id: "chat",         label: "FinBot AI",  icon: MessageCircle },
  ];

  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f8f7f4", minHeight: "100vh", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0ea5e9,#10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={17} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.3px" }}>FinFlow</span>
            <span style={{ background: "#fef9ec", color: "#d97706", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
              Gemini 2.5 Flash
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#bbb" }}>
            {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e6e0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "0 1.25rem", height: 46,
              border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 13.5, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? "#0ea5e9" : "#6b6b6b",
              borderBottom: tab === id ? "2px solid #0ea5e9" : "2px solid transparent",
              fontFamily: "inherit",
            }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* ════ DASHBOARD ════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div>
            {overBudget.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={15} color="#ef4444" />
                <span style={{ fontSize: 13, color: "#dc2626" }}>
                  <b>Over budget:</b> {overBudget.map(([c]) => c).join(", ")}
                </span>
              </div>
            )}

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Spent",  value: `₹${totalSpent.toLocaleString("en-IN")}`, sub: "this month", color: "#0ea5e9", icon: CreditCard },
                { label: "Budget Left",  value: `₹${Math.max(0, totalBudget - totalSpent).toLocaleString("en-IN")}`, sub: `of ₹${totalBudget.toLocaleString("en-IN")}`, color: "#10b981", icon: Wallet },
                { label: "Savings Rate", value: `${savingsRate}%`, sub: savingsRate >= 20 ? "Great!" : "Needs attention", color: savingsRate >= 20 ? "#10b981" : "#f97316", icon: TrendingUp },
                { label: "Transactions", value: transactions.length, sub: "recorded", color: "#a855f7", icon: List },
              ].map(({ label, value, sub, color, icon: Icon }) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                    <div style={{ background: color + "18", borderRadius: 8, padding: 6 }}><Icon size={14} color={color} /></div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {transactions.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14 }}>
                <EmptyState onAdd={() => { setTab("transactions"); setShowAddForm(true); }} />
              </div>
            ) : (
              <>
                {/* Charts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 20 }}>
                  <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: "1.25rem" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>By Category</div>
                    <ResponsiveContainer width="100%" height={185}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pieData.slice(0, 5).map((d, i) => (
                        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#555" }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: "1.25rem" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Spent vs Budget</div>
                    <ResponsiveContainer width="100%" height={185}>
                      <BarChart data={budgetData.filter((d) => d.spent > 0)} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                        <XAxis dataKey="cat" tick={{ fontSize: 10, fill: "#aaa" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#aaa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                        <Bar dataKey="spent" name="Spent" radius={[4, 4, 0, 0]}>
                          {budgetData.filter((d) => d.spent > 0).map((d, i) => (
                            <Cell key={i} fill={d.spent > d.budget ? "#ef4444" : "#0ea5e9"} />
                          ))}
                        </Bar>
                        <Bar dataKey="budget" name="Budget" fill="#e8e6e0" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights */}
                <div style={{ background: "linear-gradient(135deg,#f0f9ff,#ecfdf5)", border: "1px solid #bae6fd", borderRadius: 14, padding: "1.25rem", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb size={15} color="#0ea5e9" />
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#0369a1" }}>AI Insights</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                    {[
                      pieData[0] && { icon: "📊", tip: `"${pieData[0].name}" is your top spend — ₹${pieData[0].value.toLocaleString("en-IN")} (${Math.round((pieData[0].value / totalSpent) * 100)}% of total).` },
                      overBudget.length > 0
                        ? { icon: "⚠️", tip: `Over budget in: ${overBudget.map(([c]) => c).join(", ")}. Consider cutting back.` }
                        : { icon: "✅", tip: "All categories within budget — great discipline!" },
                      savingsRate < 20
                        ? { icon: "💡", tip: `Savings rate is ${savingsRate}%. Try targeting at least 20% of your budget.` }
                        : { icon: "🎯", tip: `Saving ${savingsRate}% of your budget — excellent financial health!` },
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid #e0f2fe" }}>
                        <span style={{ fontSize: 15 }}>{item.icon}</span>
                        <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{item.tip}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTab("chat")} style={{
                    marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8,
                    padding: "7px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <MessageCircle size={13} /> Ask FinBot for personalised advice
                  </button>
                </div>

                {/* Recent */}
                <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Expenses</span>
                    <button onClick={() => setTab("transactions")} style={{ fontSize: 12, color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                      View all <ChevronRight size={12} />
                    </button>
                  </div>
                  {transactions.slice(0, 5).map((tx, i) => {
                    const C = CATEGORIES[tx.category] || CATEGORIES.Other;
                    const Icon = C.icon;
                    return (
                      <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 4 ? "1px solid #f3f3f0" : "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={16} color={C.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{tx.desc}</div>
                          <div style={{ fontSize: 11.5, color: "#aaa" }}>{tx.category} · {tx.date}</div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 500, color: "#ef4444" }}>
                          -₹{tx.amount.toLocaleString("en-IN")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ EXPENSES ══════════════════════════════════════ */}
        {tab === "transactions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>My Expenses</div>
                <div style={{ color: "#888", fontSize: 13 }}>{transactions.length} entries · ₹{totalSpent.toLocaleString("en-IN")} total</div>
              </div>
              <button onClick={() => setShowAddForm((v) => !v)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "#0ea5e9", color: "#fff",
                border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13.5,
                fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}>
                <Plus size={15} /> Add Expense
              </button>
            </div>

            {showAddForm && (
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: "1.25rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>New Expense</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <input value={newTx.desc} onChange={(e) => setNewTx((p) => ({ ...p, desc: e.target.value }))} placeholder="Description (e.g. Lunch, Bus fare)" style={inp} />
                  <input type="number" value={newTx.amount} onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount in ₹" style={inp} min="0" />
                  <select value={newTx.category} onChange={(e) => setNewTx((p) => ({ ...p, category: e.target.value }))} style={inp}>
                    {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input type="date" value={newTx.date} onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addTransaction} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Save</button>
                  <button onClick={() => setShowAddForm(false)} style={{ background: "#f3f3f0", color: "#555", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14 }}>
                <EmptyState onAdd={() => setShowAddForm(true)} />
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, overflow: "hidden" }}>
                {transactions.map((tx, i) => {
                  const C = CATEGORIES[tx.category] || CATEGORIES.Other;
                  const Icon = C.icon;
                  const isOver = categoryTotals[tx.category] > (budgets[tx.category] || Infinity);
                  return (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < transactions.length - 1 ? "1px solid #f3f3f0" : "none" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={17} color={C.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{tx.desc}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, background: C.bg, color: C.color, padding: "1px 8px", borderRadius: 20, fontWeight: 500 }}>{tx.category}</span>
                          <span style={{ fontSize: 11, color: "#bbb" }}>{tx.date}</span>
                          {isOver && <span style={{ fontSize: 10, background: "#fef2f2", color: "#ef4444", padding: "1px 7px", borderRadius: 20 }}>Over budget</span>}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 500, color: "#ef4444", marginRight: 8 }}>
                        -₹{tx.amount.toLocaleString("en-IN")}
                      </div>
                      <button onClick={() => deleteTx(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", display: "flex", padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ BUDGET ════════════════════════════════════════ */}
        {tab === "budget" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>Budget Limits</div>
              <div style={{ color: "#888", fontSize: 13 }}>Edit monthly limits per category</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
              {budgetData.map(({ cat, budget, spent, pct }) => {
                const C = CATEGORIES[cat] || CATEGORIES.Other;
                const Icon = C.icon;
                const over = spent > budget;
                return (
                  <div key={cat} style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ background: C.bg, borderRadius: 8, padding: 6, flexShrink: 0 }}><Icon size={14} color={C.color} /></div>
                      <div style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{cat}</div>
                      {over && <span style={{ fontSize: 10, background: "#fef2f2", color: "#ef4444", padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>OVER</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>Limit ₹</span>
                      <input type="number" value={budget}
                        onChange={(e) => setBudgets((p) => ({ ...p, [cat]: parseFloat(e.target.value) || 0 }))}
                        style={{ ...inp, padding: "5px 8px", fontSize: 13, fontFamily: "'DM Mono',monospace" }} min="0" />
                    </div>
                    <div style={{ background: "#f3f3f0", borderRadius: 6, height: 6, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: over ? "#ef4444" : C.color, borderRadius: 6, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#aaa" }}>
                      <span>₹{spent.toLocaleString("en-IN")} spent</span>
                      <span style={{ color: over ? "#ef4444" : "#10b981", fontWeight: 500 }}>{pct}% used</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ CHAT ══════════════════════════════════════════ */}
        {tab === "chat" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "74vh" }}>

              {/* header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0ede8", display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(90deg,#fffbeb,#ecfdf5)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MessageCircle size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>FinBot AI</div>
                  <div style={{ fontSize: 11.5, color: "#10b981" }}>
                    {transactions.length > 0
                      ? `Gemini 2.5 Flash · ${transactions.length} transactions loaded`
                      : "Gemini 2.5 Flash · add expenses to get started"}
                  </div>
                </div>
              </div>

              {/* messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MessageCircle size={12} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: "76%",
                      background: msg.role === "user" ? "#0ea5e9" : "#f8f7f4",
                      color: msg.role === "user" ? "#fff" : "#1a1a1a",
                      borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                      padding: "10px 14px", fontSize: 13.5, lineHeight: 1.65,
                      border: msg.role === "assistant" ? "1px solid #e8e6e0" : "none",
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MessageCircle size={12} color="#fff" />
                    </div>
                    <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: "#f8f7f4", border: "1px solid #e8e6e0", borderRadius: "4px 14px 14px 14px" }}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", display: "inline-block", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* quick suggestions */}
              <div style={{ padding: "8px 12px", borderTop: "1px solid #f0ede8", display: "flex", gap: 6, overflowX: "auto" }}>
                {["Where am I overspending?","How to save ₹2000?","Biggest expense?","Give me a budget plan","Am I on track?"].map((q) => (
                  <button key={q} onClick={() => setChatInput(q)} style={{
                    background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20,
                    padding: "4px 12px", fontSize: 11.5, color: "#92400e",
                    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
                  }}>{q}</button>
                ))}
              </div>

              {/* input */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f0ede8", display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask anything about your finances…"
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0, border: "none",
                  background: chatLoading || !chatInput.trim() ? "#e8e6e0" : "#f59e0b",
                  cursor: chatLoading || !chatInput.trim() ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Send size={16} color={chatLoading || !chatInput.trim() ? "#aaa" : "#fff"} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-4px);opacity:1} }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }
      `}</style>
    </div>
  );
}