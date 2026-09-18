// Lieddating – gemeinsame Logik für alle Seiten
(function () {
  const CFG = window.LIEDDATING || {};

  // ---------- Songs ----------
  const slug = (s) => s.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const SONGS = (window.SONGS_RAW || []).map(([t, a, cat], i) => ({ id: slug(t + "-" + a), t, a, cat, hue: (i * 47) % 360 }));
  const SONG = Object.fromEntries(SONGS.map((s) => [s.id, s]));

  // ---------- Helfer ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const displayName = (p) => p ? `${p.first} ${p.initial}.` : "";
  const newId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function setPath(obj, path, val) {
    const parts = path.split("/"); let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
    const last = parts[parts.length - 1];
    if (val === null || val === undefined) delete o[last]; else o[last] = JSON.parse(JSON.stringify(val));
  }

  // ---------- Datenspeicher: Firebase oder Demo ----------
  const Store = (function () {
    const base = "events/" + (CFG.eventId || "abend-1");
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.firebase) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      const db = firebase.database(); const ref = db.ref(base);
      return {
        mode: "firebase",
        subscribe(cb) { ref.on("value", (s) => cb(s.val() || {})); },
        update(obj) { return ref.update(obj); },
        reset() { return ref.remove(); },
        connected(cb) { db.ref(".info/connected").on("value", (s) => cb(!!s.val())); },
      };
    }
    const KEY = "lieddating-demo-" + base;
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const subs = [];
    window.addEventListener("storage", (e) => { if (e.key === KEY) subs.forEach((cb) => cb(read())); });
    return {
      mode: "demo",
      subscribe(cb) { subs.push(cb); cb(read()); },
      update(obj) {
        const d = read(); for (const [p, v] of Object.entries(obj)) setPath(d, p, v);
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
        subs.forEach((cb) => cb(read())); return Promise.resolve();
      },
      reset() { try { localStorage.removeItem(KEY); } catch (e) {} subs.forEach((cb) => cb({})); return Promise.resolve(); },
      connected(cb) { cb(true); },
    };
  })();

  // ---------- Auswertung des Zustands ----------
  function analyze(ev) {
    const all = Object.entries(ev.people || {}).map(([id, p]) => ({
      id, ...p, sung: p.sung || 0, likes: new Set(Object.keys(p.likes || {}).filter((s) => SONG[s])),
    }));
    const history = Object.values(ev.history || {}).sort((a, b) => a.k - b.k);
    const active = all.filter((p) => p.ready && !p.away);
    const used = new Set(history.map((h) => h.song));
    const pool = (g) => {
      const arr = active.filter((p) => p.g === g); if (!arr.length) return [];
      const min = Math.min(...arr.map((p) => p.sung)); return arr.filter((p) => p.sung === min);
    };
    const allSung = active.length > 0 && active.every((p) => p.sung >= 1);
    return { all, active, history, used, poolW: pool("w"), poolM: pool("m"), allSung, current: ev.current || null };
  }

  function maxMatching(ms, ws, edge) {
    const owner = new Map();
    const tryK = (m, seen) => {
      for (const w of ws) {
        if (seen.has(w.id) || !edge(m, w)) continue; seen.add(w.id);
        const cur = owner.get(w.id); if (!cur || tryK(cur, seen)) { owner.set(w.id, m); return true; }
      }
      return false;
    };
    for (const m of ms) tryK(m, new Set());
    return owner.size;
  }

  // Nächstes Duett bestimmen. Liefert Firebase-Updates oder null.
  function computeDraw(ev) {
    const A = analyze(ev);
    const ws = shuffle(A.poolW), ms = shuffle(A.poolM);
    if (!ws.length || !ms.length) return null;
    let freeIds = SONGS.map((s) => s.id).filter((id) => !A.used.has(id));
    if (!freeIds.length) freeIds = SONGS.map((s) => s.id);
    const free = new Set(freeIds);
    const common = (m, w) => [...m.likes].filter((s) => free.has(s) && w.likes.has(s));

    const edges = new Map(); // "m|w" -> Songs
    for (const m of ms) for (const w of ws) { const c = common(m, w); if (c.length) edges.set(m.id + "|" + w.id, c); }
    const edge = (m, w) => edges.has(m.id + "|" + w.id);
    const deg = new Map();
    for (const k of edges.keys()) { const [a, b] = k.split("|"); deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); }

    let m, w, song, joker = false;
    const size = maxMatching(ms, ws, edge);
    if (size > 0) {
      // Wer die wenigsten Möglichkeiten hat, kommt zuerst dran.
      const cands = [...ms, ...ws].filter((p) => deg.get(p.id));
      const minDeg = Math.min(...cands.map((p) => deg.get(p.id)));
      const x = shuffle(cands.filter((p) => deg.get(p.id) === minDeg))[0];
      const partners = (x.g === "m" ? ws.filter((y) => edge(x, y)) : ms.filter((y) => edge(y, x)));
      // Partner so wählen, dass alle anderen weiterhin ein Match haben können.
      let best = [], bestScore = -Infinity;
      for (const y of partners) {
        const mm = x.g === "m" ? x : y, ww = x.g === "m" ? y : x;
        const rest = maxMatching(ms.filter((p) => p !== mm), ws.filter((p) => p !== ww), edge);
        const score = rest * 100 - deg.get(y.id);
        if (score > bestScore) { bestScore = score; best = []; }
        if (score === bestScore) best.push(y);
      }
      const y = best[rnd(best.length)];
      m = x.g === "m" ? x : y; w = x.g === "m" ? y : x;
      // Song wählen, der für andere Paare am wenigsten wichtig ist.
      const c = edges.get(m.id + "|" + w.id);
      const usage = (s) => { let n = 0; for (const [k, v] of edges) if (k !== m.id + "|" + w.id && v.includes(s)) n++; return n; };
      const minU = Math.min(...c.map(usage));
      song = shuffle(c.filter((s) => usage(s) === minU))[0];
    } else {
      joker = true;
      m = ms[0]; w = ws[0];
      const liked = freeIds.filter((s) => m.likes.has(s) || w.likes.has(s));
      const pickFrom = liked.length ? liked : freeIds;
      song = pickFrom[rnd(pickFrom.length)];
    }
    const likesW = A.active.filter((p) => p.g === "w" && p.likes.has(song)).length;
    const likesM = A.active.filter((p) => p.g === "m" && p.likes.has(song)).length;
    const k = A.history.length + 1;
    const d = {
      k, song, joker, likesW, likesM, ts: Date.now(),
      w: { id: w.id, name: displayName(w), sung: w.sung + 1 },
      m: { id: m.id, name: displayName(m), sung: m.sung + 1 },
    };
    const key = "d" + String(k).padStart(3, "0");
    return {
      ["people/" + w.id + "/sung"]: w.sung + 1,
      ["people/" + m.id + "/sung"]: m.sung + 1,
      ["history/" + key]: d,
      current: d,
    };
  }

  function computeUndo(ev) {
    const A = analyze(ev); const last = A.history[A.history.length - 1]; if (!last) return null;
    const upd = { ["history/d" + String(last.k).padStart(3, "0")]: null, current: A.history[A.history.length - 2] || null };
    for (const side of ["w", "m"]) { const p = (ev.people || {})[last[side].id]; if (p) upd["people/" + last[side].id + "/sung"] = Math.max(0, (p.sung || 1) - 1); }
    return upd;
  }

  // Testdaten für Proben
  function botUpdates(n) {
    const FN = { w: ["Anna", "Lea", "Laura", "Sophie", "Marie", "Julia", "Lena", "Hannah", "Sarah", "Lisa", "Clara", "Emma", "Mia", "Paula", "Nina", "Jana", "Carla", "Johanna", "Miriam", "Ida"],
                 m: ["Jonas", "Felix", "Lukas", "Max", "Paul", "Tim", "Leon", "Ben", "Niklas", "David", "Moritz", "Simon", "Tobias", "Jan", "Erik", "Marco", "Florian", "Sebastian", "Aaron", "Philipp"] };
    const L = "ABCDEFGHKLMNPRSTWZ"; const upd = {};
    for (let i = 0; i < n; i++) {
      const g = i % 2 ? "m" : "w"; const likes = {};
      SONGS.forEach((s) => { if (Math.random() < 0.25) likes[s.id] = true; });
      shuffle(SONGS).slice(0, 10).forEach((s) => (likes[s.id] = true));
      upd["people/" + newId()] = { first: FN[g][rnd(20)], initial: L[rnd(L.length)], g, ready: true, sung: 0, likes, joinedAt: Date.now(), test: true };
    }
    return upd;
  }

  window.LD = { CFG, SONGS, SONG, Store, analyze, computeDraw, computeUndo, botUpdates, rnd, shuffle, esc, displayName, newId };
})();
