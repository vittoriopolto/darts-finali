(function () {
  "use strict";

  var POLL_MS = 3000;
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || "";

  // ---- Aggiornamento automatico della diretta + azioni admin ----
  var box = document.getElementById("live");
  if (box) {
    var url = box.dataset.url;
    var busy = false;

    var refresh = function () {
      if (busy) { return Promise.resolve(); }
      busy = true;
      return fetch(url, { cache: "no-store", headers: { "X-Requested-With": "fetch" } })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) { if (html !== null) { box.innerHTML = html; } })
        .catch(function () { /* rete assente: riprova al prossimo giro */ })
        .then(function () { busy = false; });
    };

    setInterval(function () { if (!document.hidden) { refresh(); } }, POLL_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { refresh(); } });

    box.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-post-url]");
      if (!btn) { return; }
      e.preventDefault();
      if (btn.disabled) { return; }
      btn.disabled = true;

      var body = new URLSearchParams();
      if (btn.dataset.side) { body.set("side", btn.dataset.side); }
      if (btn.dataset.delta) { body.set("delta", btn.dataset.delta); }

      fetch(btn.dataset.postUrl, {
        method: "POST",
        headers: { "X-CSRFToken": csrf, "X-Requested-With": "fetch" },
        body: body
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) { if (data.error) { alert(data.error); } })
        .catch(function () { alert("Errore di rete: riprova."); })
        .then(function () { busy = false; return refresh(); });
    });
  }

  // ---- Suggerimenti nomi giocatori (dopo 3 caratteri) ----
  var list = document.getElementById("players-datalist");
  if (list) {
    var timer = null;
    document.addEventListener("input", function (e) {
      if (!e.target.classList || !e.target.classList.contains("player-input")) { return; }
      var q = e.target.value.trim();
      clearTimeout(timer);
      if (q.length < 3) { list.innerHTML = ""; return; }
      timer = setTimeout(function () {
        fetch(list.dataset.url + "?q=" + encodeURIComponent(q), { headers: { "X-Requested-With": "fetch" } })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            list.innerHTML = "";
            data.results.forEach(function (name) {
              var o = document.createElement("option");
              o.value = name;
              list.appendChild(o);
            });
          })
          .catch(function () {});
      }, 200);
    });
  }
})();
