import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// Techade HQ — papan founder: fokus harian tiap orang + status semua project.
// Data project SHARED (semua founder bisa edit). Fokus cuma bisa diedit pemiliknya.

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_ORDER = ["jalan", "nunggu", "stuck", "kelar"];
const STATUS_META = {
  jalan: { label: "● jalan", color: "var(--green)", border: "var(--green-border)" },
  nunggu: { label: "◐ nunggu", color: "var(--janji-ink)", border: "var(--janji-border)" },
  stuck: { label: "✕ stuck", color: "var(--red)", border: "var(--red)" },
  kelar: { label: "✓ kelar", color: "var(--muted)", border: "var(--border)" },
};

const timeAgo = (ts) => {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return "barusan";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kemarin";
  return `${d} hari lalu`;
};

const usernameOf = (session) =>
  (session?.user?.email || "").split("@")[0] || "anon";

const THEMES = {
  light: {
    "--bg": "#F6F4EF", "--ink": "#2B2822", "--muted": "#8A8578",
    "--muted2": "#6E6A5E", "--faint": "#A5A093", "--accent": "#E4572E",
    "--accent-border": "#F0C4B4", "--accent-bg": "#FFF4EC",
    "--border": "#E3DFD4", "--border2": "#D9D4C8", "--badge": "#E8E4DA",
    "--card": "#FFFFFF", "--card2": "#FDFCFA",
    "--green-bg": "#EDF6EE", "--green-border": "#BFDCC2",
    "--green": "#3E7A46", "--green-dark": "#2E5934",
    "--janji-bg": "#FBF6E9", "--janji-border": "#E6D9B8", "--janji-ink": "#7A5C1E",
    "--red": "#C0392B", "--red-bg": "#FDF1EF",
  },
  dark: {
    "--bg": "#16140F", "--ink": "#EDEAE0", "--muted": "#9C968A",
    "--muted2": "#B3AC9E", "--faint": "#6E6A5E", "--accent": "#F26B3F",
    "--accent-border": "#5C2E1E", "--accent-bg": "#2A1B13",
    "--border": "#34302A", "--border2": "#3D3931", "--badge": "#34302A",
    "--card": "#211E18", "--card2": "#26231C",
    "--green-bg": "#17241A", "--green-border": "#2C4A33",
    "--green": "#8FCF9A", "--green-dark": "#3E8A4C",
    "--janji-bg": "#231E10", "--janji-border": "#4C4223", "--janji-ink": "#D9B25C",
    "--red": "#E0604F", "--red-bg": "#2C1712",
  },
};

function EditableText({ value, onSave, style, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  if (!editing)
    return (
      <div
        style={{ ...style, cursor: "text", ...(value ? {} : { color: "var(--faint)", fontStyle: "italic" }) }}
        title="Tap untuk edit"
        onClick={() => {
          setDraft(value || "");
          setEditing(true);
        }}
      >
        {value || placeholder || "—"}
      </div>
    );

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v !== (value || "")) onSave(v);
  };

  return (
    <input
      autoFocus
      style={{
        ...style,
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid var(--accent)",
        borderRadius: 6,
        padding: "2px 6px",
        background: "var(--card)",
        outline: "none",
        font: "inherit",
        fontSize: 16,
      }}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function Login({ themeVars }) {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const u = username.trim().toLowerCase();
    if (!u || !password) return;
    setBusy(true);
    setErr("");
    setInfo("");

    if (mode === "register") {
      try {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password, invite }),
        });
        const data = await r.json();
        setBusy(false);
        if (!r.ok) {
          setErr(data.error || "Gagal daftar.");
          return;
        }
        // akun jadi -> langsung login-in
        setInfo("Akun jadi! Masuk otomatis…");
        const { error } = await supabase.auth.signInWithPassword({
          email: `${u}@techade.local`,
          password,
        });
        if (error) {
          setInfo("");
          setErr("Akun jadi, tapi gagal auto-login. Coba masuk manual.");
          setMode("login");
        }
      } catch {
        setBusy(false);
        setErr("Gagal konek ke server.");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: `${u}@techade.local`,
      password,
    });
    setBusy(false);
    if (error) setErr("Username atau password salah.");
  };

  return (
    <div style={{ ...S.page, ...themeVars, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 340, padding: 16 }}>
        <div style={S.eyebrow}>Founder only</div>
        <h1 style={{ ...S.h1, marginBottom: 18 }}>Techade HQ</h1>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["login", "Masuk"], ["register", "Daftar"]].map(([k, label]) => (
            <button
              key={k}
              style={{
                ...S.ghostSm,
                flex: 1,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                ...(mode === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}),
              }}
              onClick={() => {
                setMode(k);
                setErr("");
                setInfo("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: 8 }}
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: 12 }}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {mode === "register" && (
          <input
            style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: 12 }}
            placeholder="Invite code (minta ke Sol)"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}
        {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{err}</div>}
        {info && <div style={{ color: "var(--green)", fontSize: 13, marginBottom: 10 }}>{info}</div>}
        <button style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
          {busy ? "Sebentar…" : mode === "register" ? "Daftar →" : "Masuk →"}
        </button>
      </div>
    </div>
  );
}

export default function TechadeHQ() {
  const [session, setSession] = useState(undefined);
  const [projects, setProjects] = useState(null);
  const [focuses, setFocuses] = useState([]);
  const [myFocus, setMyFocus] = useState("");
  const [newProject, setNewProject] = useState("");
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem("techade-theme");
      if (s) return s === "dark";
    } catch {}
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const [showPassForm, setShowPassForm] = useState(false);
  const [newPass, setNewPass] = useState("");

  const toggleTheme = () =>
    setDark((d) => {
      const n = !d;
      try {
        localStorage.setItem("techade-theme", n ? "dark" : "light");
      } catch {}
      return n;
    });

  useEffect(() => {
    document.body.style.background = dark ? "#16140F" : "#F6F4EF";
    document.body.style.margin = "0";
  }, [dark]);

  const themeVars = {
    ...(dark ? THEMES.dark : THEMES.light),
    colorScheme: dark ? "dark" : "light",
  };

  // ---------- auth ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------- load ----------
  const loadAll = async (s) => {
    const p = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (p.error) {
      setError(p.error.message);
      return;
    }
    setProjects(p.data);

    const f = await supabase.from("focus").select("*");
    if (!f.error) {
      setFocuses(f.data);
      const mine = f.data.find((x) => x.user_id === s.user.id);
      if (mine && mine.date === localToday()) setMyFocus(mine.text || "");
    }
  };

  useEffect(() => {
    if (session) loadAll(session);
  }, [session]);

  // ---------- fokus ----------
  const saveFocus = async () => {
    const text = myFocus.trim();
    const row = {
      user_id: session.user.id,
      name: usernameOf(session),
      text,
      date: localToday(),
    };
    setFocuses((fs) => [
      ...fs.filter((x) => x.user_id !== session.user.id),
      row,
    ]);
    await supabase.from("focus").upsert(row);
  };

  // ---------- projects ----------
  const addProject = async () => {
    const name = newProject.trim();
    if (!name) return;
    setNewProject("");
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, updated_by: usernameOf(session) })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setProjects((ps) => [data, ...ps]);
  };

  const patchProject = async (id, patch) => {
    const withMeta = {
      ...patch,
      updated_by: usernameOf(session),
      updated_at: new Date().toISOString(),
    };
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...withMeta } : p)));
    await supabase.from("projects").update(withMeta).eq("id", id);
  };

  const removeProject = async (id) => {
    if (!window.confirm("Hapus project ini? (keliatan semua founder)")) return;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    await supabase.from("projects").delete().eq("id", id);
  };

  const cycleStatus = (p) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(p.status) + 1) % STATUS_ORDER.length];
    patchProject(p.id, { status: next });
  };

  const changePassword = async () => {
    if (newPass.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (!error) {
      setNewPass("");
      setShowPassForm(false);
      alert("Password berhasil diganti ✓");
    }
  };

  // ---------- render ----------
  if (session === undefined)
    return (
      <div style={{ ...S.page, ...themeVars, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Memuat…</span>
      </div>
    );

  if (!session) return <Login themeVars={themeVars} />;

  if (error)
    return (
      <div style={{ ...S.page, ...themeVars, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...S.focusCard, maxWidth: 480 }}>
          <div style={S.eyebrow}>Gagal terhubung</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {error} — cek env Supabase & apakah <code>setup.sql</code> sudah dijalankan.
          </div>
        </div>
      </div>
    );

  const me = usernameOf(session);
  const today = localToday();
  const dateLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const others = focuses
    .filter((f) => f.user_id !== session.user.id)
    .sort((a, b) => (a.name < b.name ? -1 : 1));

  const active = (projects || []).filter((p) => p.status !== "kelar");
  const doneP = (projects || []).filter((p) => p.status === "kelar");

  return (
    <div style={{ ...S.page, ...themeVars }}>
      <div style={S.wrap}>
        {/* header */}
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={S.eyebrow}>{dateLabel}</div>
            <h1 style={S.h1}>Techade HQ</h1>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.iconBtn} onClick={toggleTheme}>{dark ? "☀️" : "🌙"}</button>
            <button style={S.iconBtn} onClick={() => setShowPassForm((v) => !v)}>🔑</button>
            <button style={{ ...S.iconBtn, fontSize: 13, color: "var(--muted)" }} onClick={() => supabase.auth.signOut()}>
              keluar
            </button>
          </div>
        </div>

        {showPassForm && (
          <div style={{ ...S.box, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="password"
                style={{ ...S.input, flex: 1, minWidth: 0 }}
                placeholder="Password baru (min. 6 karakter)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && changePassword()}
              />
              <button style={{ ...S.addBtn, width: 60 }} onClick={changePassword}>OK</button>
            </div>
          </div>
        )}

        {/* ===== FOKUS HARI INI ===== */}
        <div style={S.sectionHead}>Fokus hari ini</div>

        {/* punya gue — selalu paling atas, bisa diedit */}
        <div style={{ ...S.focusCard, marginBottom: 8 }}>
          <div style={{ ...S.personName, color: "var(--accent)" }}>{me}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              style={{ ...S.input, flex: 1, minWidth: 0 }}
              placeholder="Hari ini fokus ngerjain apa?"
              value={myFocus}
              onChange={(e) => setMyFocus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFocus()}
            />
            <button style={{ ...S.addBtn, width: 60 }} onClick={saveFocus}>OK</button>
          </div>
        </div>

        {/* founder lain */}
        {others.map((f) => {
          const stale = f.date !== today;
          return (
            <div key={f.user_id} style={{ ...S.card, ...(stale ? { opacity: 0.5 } : {}) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.personName}>{f.name}</div>
                <div style={{ fontSize: 15, marginTop: 3, lineHeight: 1.4 }}>
                  {f.text || <span style={{ color: "var(--faint)" }}>belum diisi</span>}
                </div>
                {stale && f.date && (
                  <div style={S.metaHint}>terakhir update {f.date} — belum isi hari ini</div>
                )}
              </div>
            </div>
          );
        })}
        {others.length === 0 && (
          <div style={S.empty}>Founder lain belum pernah isi fokus.</div>
        )}

        {/* ===== PROJECTS ===== */}
        <div style={{ ...S.sectionHead, marginTop: 30 }}>Projects</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <input
            style={{ ...S.input, flex: 1, minWidth: 0 }}
            placeholder="Project baru…"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
          />
          <button style={{ ...S.addBtn, width: 46 }} onClick={addProject}>+</button>
        </div>

        {projects === null && <div style={S.empty}>Memuat…</div>}

        {[...active, ...doneP].map((p) => {
          const m = STATUS_META[p.status] || STATUS_META.jalan;
          return (
            <div key={p.id} style={{ ...S.projectCard, ...(p.status === "kelar" ? { opacity: 0.55 } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EditableText
                    value={p.name}
                    onSave={(v) => v && patchProject(p.id, { name: v })}
                    style={{ fontSize: 17, fontWeight: 700 }}
                  />
                </div>
                <button
                  style={{ ...S.pill, color: m.color, borderColor: m.border }}
                  title="Klik buat ganti status"
                  onClick={() => cycleStatus(p)}
                >
                  {m.label}
                </button>
                <button style={S.ghostSm} onClick={() => removeProject(p.id)}>✕</button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={S.fieldLabel}>Udah sampe mana</div>
                <EditableText
                  value={p.progress}
                  onSave={(v) => patchProject(p.id, { progress: v })}
                  placeholder="tap buat isi…"
                  style={{ fontSize: 14, lineHeight: 1.5 }}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={S.fieldLabel}>Next step</div>
                <EditableText
                  value={p.next_step}
                  onSave={(v) => patchProject(p.id, { next_step: v })}
                  placeholder="tap buat isi…"
                  style={{ fontSize: 14, lineHeight: 1.5 }}
                />
              </div>

              <div style={S.metaHint}>
                update {timeAgo(p.updated_at)}{p.updated_by ? ` · ${p.updated_by}` : ""}
              </div>
            </div>
          );
        })}
        {projects !== null && projects.length === 0 && (
          <div style={S.empty}>Belum ada project. Tambahin yang lagi jalan.</div>
        )}

        <div style={S.footer}>
          Update "sampe mana" & "next step" tiap ada progres — biar gak ada yang nanya-nanya lagi.
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    fontFamily: "'Avenir Next', 'Segoe UI', system-ui, -apple-system, sans-serif",
    color: "var(--ink)",
    padding: "24px 16px 60px",
  },
  wrap: { maxWidth: 620, margin: "0 auto" },
  eyebrow: {
    fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase",
    color: "var(--muted)", marginBottom: 4,
  },
  h1: { fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  sectionHead: {
    fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--muted2)", marginBottom: 10,
  },
  iconBtn: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "8px 12px", fontSize: 16, cursor: "pointer", lineHeight: 1,
  },
  box: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 14, padding: "12px 14px",
  },
  input: {
    padding: "11px 14px", borderRadius: 10,
    border: "1px solid var(--border2)", background: "var(--card)",
    fontSize: 16, outline: "none", color: "var(--ink)",
  },
  addBtn: {
    borderRadius: 10, border: "none", background: "var(--ink)",
    color: "var(--bg)", fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  primaryBtn: {
    background: "var(--accent)", color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 16px", fontSize: 15, fontWeight: 600,
    cursor: "pointer", width: "100%",
  },
  focusCard: {
    background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
    borderRadius: 14, padding: "12px 14px",
  },
  personName: {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--muted2)",
  },
  card: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "12px 14px", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 10,
  },
  projectCard: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 14, padding: "14px 16px", marginBottom: 10,
  },
  pill: {
    background: "transparent", border: "1px solid var(--border)",
    borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  ghostSm: {
    background: "transparent", color: "var(--muted)",
    border: "1px solid var(--border)", borderRadius: 8,
    padding: "5px 9px", fontSize: 12, cursor: "pointer",
  },
  fieldLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--faint)", marginBottom: 2,
  },
  metaHint: { fontSize: 11, color: "var(--faint)", marginTop: 10 },
  empty: { fontSize: 13, color: "var(--faint)", padding: "10px 2px" },
  footer: { marginTop: 32, fontSize: 12, color: "var(--faint)", textAlign: "center" },
};
