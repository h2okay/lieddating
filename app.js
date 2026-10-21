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
  // Plan für den restlichen Abend: wie viele gemischte, wie viele gleichgeschlechtliche
  // Duette und ob am Ende ein Trio nötig ist (ungerade Gesamtzahl).
  function planFor(w, m) {
    const total = w + m, s = Math.abs(w - m), trio = total % 2 === 1;
    const same = trio ? Math.max(0, Math.floor((s - 3) / 2)) : Math.floor(s / 2);
    const mixed = Math.max(0, (total - 2 * same - (trio ? 3 : 0)) / 2);
    return { total, trio, same, mixed, sameG: w > m ? "w" : "m" };
  }

  function analyze(ev) {
    const all = Object.entries(ev.people || {}).map(([id, p]) => ({
      id, ...p, sung: p.sung || 0, likes: new Set(Object.keys(p.likes || {}).filter((s) => SONG[s])),
    }));
    const history = Object.values(ev.history || {}).sort((a, b) => a.k - b.k);
    const active = all.filter((p) => p.ready && !p.away);
    const used = new Set(history.map((h) => h.song));
    const fresh = active.filter((p) => p.sung === 0);
    const zugabe = active.length > 0 && fresh.length === 0;
    let base = fresh;
    if (zugabe) { const min = Math.min(...active.map((p) => p.sung)); base = active.filter((p) => p.sung === min); }
    const poolW = base.filter((p) => p.g === "w"), poolM = base.filter((p) => p.g === "m");
    const allSung = active.length > 0 && fresh.length === 0;
    return { all, active, history, used, pool: base, poolW, poolM, zugabe, allSung,
             plan: planFor(poolW.length, poolM.length), current: ev.current || null };
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

  function buildDraw(A, members, song, joker, type) {
    const k = A.history.length + 1;
    const cast = [...members].sort((a, b) => (a.g === b.g ? 0 : a.g === "w" ? -1 : 1));
    const d = {
      k, song, joker, type, ts: Date.now(),
      likesW: A.active.filter((p) => p.g === "w" && p.likes.has(song)).length,
      likesM: A.active.filter((p) => p.g === "m" && p.likes.has(song)).length,
      cast: cast.map((p) => ({ id: p.id, name: displayName(p), g: p.g })),
    };
    const upd = { ["history/d" + String(k).padStart(3, "0")]: d, current: d };
    cast.forEach((p) => (upd["people/" + p.id + "/sung"] = p.sung + 1));
    return upd;
  }

  // Duett von Hand: 2 oder 3 ausgewählte Personen, Song automatisch.
  // Erlaubt auch Einspringer, die schon gesungen haben.
  function computeManual(ev, ids) {
    const A = analyze(ev);
    const members = ids.map((id) => A.all.find((p) => p.id === id)).filter(Boolean);
    if (members.length < 2 || members.length > 3) return null;
    let freeIds = SONGS.map((s) => s.id).filter((id) => !A.used.has(id));
    if (!freeIds.length) freeIds = SONGS.map((s) => s.id);
    const score = (s) => members.filter((p) => p.likes.has(s)).length;
    const best = Math.max(...freeIds.map(score));
    const song = shuffle(freeIds.filter((s) => score(s) === best))[0];
    const type = members.length === 3 ? "trio" : (members[0].g === members[1].g ? members[0].g : "mixed");
    return buildDraw(A, members, song, best < 2, type);
  }

  // Nächstes Duett bestimmen. force: null | "mixed" | "w" | "m" | "trio"
  // Liefert Firebase-Updates oder null.
  function computeDraw(ev, force) {
    const A = analyze(ev);
    const pool = shuffle(A.pool);
    if (pool.length < 2) return null;
    let freeIds = SONGS.map((s) => s.id).filter((id) => !A.used.has(id));
    if (!freeIds.length) freeIds = SONGS.map((s) => s.id);
    const free = new Set(freeIds);
    const common = (a, b) => [...a.likes].filter((s) => free.has(s) && b.likes.has(s));
    const W = pool.filter((p) => p.g === "w"), M = pool.filter((p) => p.g === "m");
    const pk = (a, b) => [a.id, b.id].sort().join("|");

    // Alle Paare mit mindestens einem gemeinsamen, noch freien Herz-Song
    const edges = new Map();
    const addEdges = (l1, l2) => {
      for (const a of l1) for (const b of (l2 || l1)) {
        if (a === b) continue; const k = pk(a, b); if (edges.has(k)) continue;
        const c = common(a, b); if (c.length) edges.set(k, c);
      }
    };
    addEdges(M, W); addEdges(W); addEdges(M);

    // Welcher Typ kommt dran?
    let type = force || null;
    if (!type) {
      if (pool.length === 3) type = "trio";
      else {
        const pl = planFor(W.length, M.length);
        if (!pl.mixed) type = W.length >= 2 ? "w" : "m";
        else if (pl.same > 0 && Math.random() < pl.same / (pl.same + pl.mixed)) type = pl.sameG;
        else type = "mixed";
      }
    }
    if (type === "mixed" && (!W.length || !M.length)) return null;
    if (type === "w" && W.length < 2) return null;
    if (type === "m" && M.length < 2) return null;
    if (type === "trio" && pool.length < 3) return null;

    const build = (members, song, joker) => buildDraw(A, members, song, joker, type);

    if (type === "trio") {
      const three = pool.length === 3 ? pool : shuffle(pool).slice(0, 3);
      const score = (s) => three.filter((p) => p.likes.has(s)).length;
      const best = Math.max(...freeIds.map(score));
      const song = shuffle(freeIds.filter((s) => score(s) === best))[0];
      return build(three, song, best < 2);
    }

    // Mögliche Paare dieses Typs
    const group = type === "w" ? W : M;
    const pairs = [];
    if (type === "mixed") { for (const m of M) for (const w of W) if (edges.has(pk(m, w))) pairs.push([m, w]); }
    else { for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++)
             if (edges.has(pk(group[i], group[j]))) pairs.push([group[i], group[j]]); }

    if (!pairs.length) {
      // Joker: kein gemeinsamer Song mehr frei
      const two = type === "mixed" ? [W[0], M[0]] : shuffle(group).slice(0, 2);
      const liked = freeIds.filter((s) => two.some((p) => p.likes.has(s)));
      const from = liked.length ? liked : freeIds;
      return build(two, from[rnd(from.length)], true);
    }

    // Wer die wenigsten Möglichkeiten hat, kommt zuerst dran.
    const deg = new Map();
    pairs.forEach(([x, y]) => { deg.set(x.id, (deg.get(x.id) || 0) + 1); deg.set(y.id, (deg.get(y.id) || 0) + 1); });
    const people = [...new Set(pairs.flat())];
    const minDeg = Math.min(...people.map((p) => deg.get(p.id)));
    const x = shuffle(people.filter((p) => deg.get(p.id) === minDeg))[0];
    const partners = pairs.filter((pr) => pr.includes(x)).map((pr) => (pr[0] === x ? pr[1] : pr[0]));
    let best = [], bestScore = -Infinity;
    for (const y of partners) {
      // Bei gemischten Duetten so wählen, dass die übrigen weiterhin ein Match haben können.
      const rest = type === "mixed"
        ? maxMatching(M.filter((p) => p !== x && p !== y), W.filter((p) => p !== x && p !== y), (m, w) => edges.has(pk(m, w)))
        : 0;
      const score = rest * 100 - (deg.get(y.id) || 0);
      if (score > bestScore) { bestScore = score; best = []; }
      if (score === bestScore) best.push(y);
    }
    const y = best[rnd(best.length)];
    // Song wählen, der für andere Paare am wenigsten wichtig ist.
    const c = edges.get(pk(x, y));
    const usage = (s) => { let n = 0; for (const [k, v] of edges) if (k !== pk(x, y) && v.includes(s)) n++; return n; };
    const minU = Math.min(...c.map(usage));
    const song = shuffle(c.filter((s) => usage(s) === minU))[0];
    const members = type === "mixed" ? (x.g === "w" ? [x, y] : [y, x]) : [x, y];
    return build(members, song, false);
  }

  const castOf = (h) => h.cast || [h.w, h.m].filter(Boolean);

  function computeUndo(ev) {
    const A = analyze(ev); const last = A.history[A.history.length - 1]; if (!last) return null;
    const upd = { ["history/d" + String(last.k).padStart(3, "0")]: null, current: A.history[A.history.length - 2] || null };
    castOf(last).forEach((c) => { const p = (ev.people || {})[c.id]; if (p) upd["people/" + c.id + "/sung"] = Math.max(0, (p.sung || 1) - 1); });
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

  window.LD = { CFG, SONGS, SONG, Store, analyze, computeDraw, computeManual, computeUndo, botUpdates, castOf, planFor, rnd, shuffle, esc, displayName, newId };
})();
