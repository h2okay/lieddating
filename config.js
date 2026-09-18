// ============================================================
// Lieddating – Einstellungen
// ============================================================

// 1) Firebase-Konfiguration hier einfügen (siehe ANLEITUNG.md).
//    Solange hier null steht, läuft die App im DEMO-MODUS:
//    Alles bleibt in diesem einen Browser (mehrere Tabs synchronisieren sich),
//    Handys können NICHT mitmachen.

window.FIREBASE_CONFIG = {

  apiKey: "AIzaSyDn-A7cuyJHmD9tjhzd79SEO9pnIVjexM4",

  authDomain: "lieddating.firebaseapp.com",

  databaseURL: "https://lieddating-default-rtdb.europe-west1.firebasedatabase.app",

  projectId: "lieddating",

  storageBucket: "lieddating.firebasestorage.app",

  messagingSenderId: "225483540381",

  appId: "1:225483540381:web:36c4a15a0dcbeb2b2ad174"

};


window.LIEDDATING = {
  // Name des Abends in der Datenbank. Für einen neuen Abend einfach ändern,
  // dann startet alles leer (die alten Daten bleiben unter dem alten Namen).
  eventId: "abend-1",
  // So viele Herzen muss jede:r mindestens vergeben.
  minLikes: 10,
  // Wie lange die Leinwand den Song zeigt, bevor das Paar enthüllt wird (Millisekunden).
  teaserMs: 3500,
  drumMs: 1800,
};


