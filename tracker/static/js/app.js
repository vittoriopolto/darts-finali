(function () {
  "use strict";

  var POLL_MS = 3000;
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || "";

  // =====================================================================
  //  Condividi: disegna il foglio gara in un'immagine (solo nel browser,
  //  nulla viene salvato sul server) e apre il menu di condivisione.
  // =====================================================================
  var STATUS = {
    live: { text: "● In corso", color: "#e10600" },
    finished: { text: "Conclusa", color: "#ffffff" },
    paused: { text: "Sospesa", color: "#9a9a9a" },
    pending: { text: "In attesa", color: "#9a9a9a" }
  };
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); } else { ctx.rect(x, y, w, h); }
  }

  function fit(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) { return text; }
    while (text.length > 1 && ctx.measureText(text + "…").width > maxW) { text = text.slice(0, -1); }
    return text + "…";
  }

  function drawSheet(data) {
    var W = 1080, PAD = 48, RED = "#e10600";
    var hasBanner = !!data.winner;
    var height = PAD + 40 + 150 + 50 + (hasBanner ? 84 : 0);
    data.games.forEach(function (g) { height += (g.kind === "Doppio" ? 150 : 112) + 16; });
    height += PAD;

    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, height);
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, 14);

    // Intestazione
    var y = PAD + 22;
    ctx.fillStyle = "#9a9a9a";
    ctx.font = "700 28px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("FINALI", PAD, y);
    var now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    ctx.textAlign = "right";
    ctx.font = "400 26px " + FONT;
    ctx.fillText("Aggiornato alle " + now, W - PAD, y);

    // Squadre e punteggio incontro
    y += 110;
    var teamMax = (W - PAD * 2 - 300) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 42px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(fit(ctx, "👑 " + data.team_a, teamMax), PAD, y - 12);
    ctx.textAlign = "right";
    ctx.fillText(fit(ctx, data.team_b, teamMax), W - PAD, y - 12);

    ctx.font = "800 100px " + FONT;
    ctx.textAlign = "right";
    ctx.fillStyle = data.winner === "a" ? RED : "#ffffff";
    ctx.fillText(String(data.wins_a), W / 2 - 34, y + 22);
    ctx.textAlign = "center";
    ctx.fillStyle = "#9a9a9a";
    ctx.fillText("–", W / 2, y + 22);
    ctx.textAlign = "left";
    ctx.fillStyle = data.winner === "b" ? RED : "#ffffff";
    ctx.fillText(String(data.wins_b), W / 2 + 34, y + 22);

    y += 60;
    if (hasBanner) {
      ctx.fillStyle = RED;
      roundRect(ctx, PAD, y, W - PAD * 2, 64, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 30px " + FONT;
      ctx.textAlign = "center";
      var who = data.winner === "a" ? "👑 " + data.team_a : data.team_b;
      ctx.fillText(fit(ctx, "🏆 Incontro vinto da " + who, W - PAD * 2 - 40), W / 2, y + 42);
      y += 84;
    } else {
      y += 10;
    }

    // Righe delle partite
    var nameMax = W / 2 - 80 - (PAD + 24);
    data.games.forEach(function (g) {
      var isDouble = g.kind === "Doppio";
      var h = isDouble ? 150 : 112;
      var st = STATUS[g.status] || STATUS.pending;

      ctx.fillStyle = "#1a1a1a";
      roundRect(ctx, PAD, y, W - PAD * 2, h, 16);
      ctx.fill();
      ctx.strokeStyle = g.status === "live" ? RED : "#333333";
      ctx.lineWidth = g.status === "live" ? 3 : 1.5;
      roundRect(ctx, PAD, y, W - PAD * 2, h, 16);
      ctx.stroke();

      ctx.font = "600 22px " + FONT;
      ctx.textAlign = "left";
      ctx.fillStyle = "#9a9a9a";
      ctx.fillText("Partita " + g.order + " · " + g.kind, PAD + 24, y + 34);
      ctx.textAlign = "right";
      ctx.fillStyle = st.color;
      ctx.fillText(st.text, W - PAD - 24, y + 34);

      var dimA = g.status === "finished" && g.winner !== "a";
      var dimB = g.status === "finished" && g.winner !== "b";
      ctx.font = "600 30px " + FONT;
      g.names_a.forEach(function (n, i) {
        ctx.textAlign = "left";
        ctx.fillStyle = dimA ? "#9a9a9a" : "#ffffff";
        ctx.fillText(fit(ctx, n, nameMax), PAD + 24, y + 82 + i * 38);
      });
      g.names_b.forEach(function (n, i) {
        ctx.textAlign = "right";
        ctx.fillStyle = dimB ? "#9a9a9a" : "#ffffff";
        ctx.fillText(fit(ctx, n, nameMax), W - PAD - 24, y + 82 + i * 38);
      });

      var sy = y + (isDouble ? 104 : 90);
      ctx.font = "800 54px " + FONT;
      ctx.textAlign = "right";
      ctx.fillStyle = g.winner === "a" ? RED : "#ffffff";
      ctx.fillText(String(g.score_a), W / 2 - 26, sy);
      ctx.textAlign = "center";
      ctx.fillStyle = "#9a9a9a";
      ctx.fillText("–", W / 2, sy);
      ctx.textAlign = "left";
      ctx.fillStyle = g.winner === "b" ? RED : "#ffffff";
      ctx.fillText(String(g.score_b), W / 2 + 26, sy);

      y += h + 16;
    });

    return canvas;
  }

  function downloadBlob(blob) {
    var a = document.createElement("a");
    var objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = "foglio-gara.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 5000);
  }

  function closePreview() {
    var old = document.getElementById("share-overlay");
    if (old) {
      var img = old.querySelector("img");
      if (img) { URL.revokeObjectURL(img.src); }
      old.remove();
    }
  }

  // Anteprima con tasto Condividi: la condivisione parte da un tocco diretto,
  // come richiesto da iPhone/Safari.
  function showPreview(file, blob, note) {
    closePreview();
    var overlay = document.createElement("div");
    overlay.id = "share-overlay";
    overlay.className = "share-overlay";

    var card = document.createElement("div");
    card.className = "share-card";

    var img = document.createElement("img");
    img.alt = "Foglio gara";
    img.src = URL.createObjectURL(blob);
    card.appendChild(img);

    if (note) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = note;
      card.appendChild(p);
    }

    var actions = document.createElement("div");
    actions.className = "actions";

    if (navigator.share) {
      var shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "btn red";
      shareBtn.textContent = "📤 Condividi";
      shareBtn.addEventListener("click", function () {
        navigator.share({ files: [file], title: "Foglio gara" }).catch(function () {});
      });
      actions.appendChild(shareBtn);
    }

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn";
    saveBtn.textContent = "Salva";
    saveBtn.addEventListener("click", function () { downloadBlob(blob); });
    actions.appendChild(saveBtn);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn ghost";
    closeBtn.textContent = "Chiudi";
    closeBtn.addEventListener("click", closePreview);
    actions.appendChild(closeBtn);

    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { closePreview(); } });
    document.body.appendChild(overlay);
  }

  function shareSheet(btn) {
    if (btn.disabled) { return; }
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Creo l'immagine…";

    var done = function () { btn.disabled = false; btn.textContent = label; };

    fetch(btn.dataset.shareUrl, { cache: "no-store", headers: { "X-Requested-With": "fetch" } })
      .then(function (r) { if (!r.ok) { throw new Error("dati"); } return r.json(); })
      .then(function (data) {
        var canvas = drawSheet(data);
        canvas.toBlob(function (blob) {
          if (!blob) { alert("Impossibile creare l'immagine."); done(); return; }
          var file = new File([blob], "foglio-gara.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: "Foglio gara" })
              .catch(function (err) {
                if (err && err.name === "AbortError") { return; }   // chiuso dall'utente
                showPreview(file, blob, "");   // iPhone: serve un secondo tocco su Condividi
              })
              .then(done);
          } else if (!window.isSecureContext) {
            showPreview(file, blob, "La condivisione funziona solo con indirizzo https (il sito su Render), non con http://indirizzo-locale. Intanto puoi salvare l'immagine.");
            done();
          } else {
            downloadBlob(blob);   // browser senza condivisione file (es. PC): scarica il PNG
            done();
          }
        }, "image/png");
      })
      .catch(function () { alert("Errore di rete: riprova."); done(); });
  }

  // =====================================================================
  //  Condividi testo: "NOME PUNTI - PUNTI NOME"
  // =====================================================================
  function joinNames(names) { return names.join(" / "); }

  function lineFor(g) {
    return joinNames(g.names_a) + " " + g.score_a + " - " + g.score_b + " " + joinNames(g.names_b);
  }

  function buildText(data) {
    var lines = ["👑 " + data.team_a + " " + data.wins_a + " - " + data.wins_b + " " + data.team_b];
    var finished = data.games.filter(function (g) { return g.status === "finished"; });
    var live = data.games.filter(function (g) { return g.status === "live"; });

    if (finished.length) {
      lines.push("", "✅ Concluse");
      finished.forEach(function (g) { lines.push(lineFor(g)); });
    }
    if (live.length) {
      lines.push("", "🔴 In corso");
      live.forEach(function (g) { lines.push(lineFor(g)); });
    }
    return lines.join("\n");
  }

  function copyText(text, btn) {
    var ok = function () { var l = btn.textContent; btn.textContent = "Copiato ✓"; setTimeout(function () { btn.textContent = l; }, 1500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {});
    } else {
      var ta = document.querySelector("#share-overlay textarea");
      if (ta) { ta.focus(); ta.select(); try { if (document.execCommand("copy")) { ok(); } } catch (e) {} }
    }
  }

  function showTextPreview(text) {
    closePreview();
    var overlay = document.createElement("div");
    overlay.id = "share-overlay";
    overlay.className = "share-overlay";
    var card = document.createElement("div");
    card.className = "share-card";

    var ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.value = text;
    ta.rows = Math.min(14, text.split("\n").length + 1);
    card.appendChild(ta);

    var actions = document.createElement("div");
    actions.className = "actions";

    if (navigator.share) {
      var shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "btn red";
      shareBtn.textContent = "💬 Condividi";
      shareBtn.addEventListener("click", function () {
        navigator.share({ text: text, title: "Foglio gara" }).catch(function () {});
      });
      actions.appendChild(shareBtn);
    }

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn";
    copyBtn.textContent = "Copia";
    copyBtn.addEventListener("click", function () { copyText(text, copyBtn); });
    actions.appendChild(copyBtn);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn ghost";
    closeBtn.textContent = "Chiudi";
    closeBtn.addEventListener("click", closePreview);
    actions.appendChild(closeBtn);

    card.appendChild(actions);
    overlay.appendChild(card);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { closePreview(); } });
    document.body.appendChild(overlay);
  }

  function shareText(btn) {
    if (btn.disabled) { return; }
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparo il testo…";
    var done = function () { btn.disabled = false; btn.textContent = label; };

    fetch(btn.dataset.shareTextUrl, { cache: "no-store", headers: { "X-Requested-With": "fetch" } })
      .then(function (r) { if (!r.ok) { throw new Error("dati"); } return r.json(); })
      .then(function (data) {
        var text = buildText(data);
        if (navigator.share) {
          navigator.share({ text: text, title: "Foglio gara" })
            .catch(function (err) {
              if (err && err.name === "AbortError") { return; }
              showTextPreview(text);   // iPhone: serve un secondo tocco
            })
            .then(done);
        } else {
          showTextPreview(text);       // PC: anteprima con tasto Copia
          done();
        }
      })
      .catch(function () { alert("Errore di rete: riprova."); done(); });
  }

  // =====================================================================
  //  Aggiornamento automatico della diretta + azioni admin
  // =====================================================================
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
      var shareBtn = e.target.closest("[data-share-url]");
      if (shareBtn) { e.preventDefault(); shareSheet(shareBtn); return; }
      var textBtn = e.target.closest("[data-share-text-url]");
      if (textBtn) { e.preventDefault(); shareText(textBtn); return; }

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

  // =====================================================================
  //  Suggerimenti nomi giocatori (dopo 3 caratteri)
  // =====================================================================
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
