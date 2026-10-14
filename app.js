(function () {
  "use strict";

  // Math
  function renderMath() {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  }

  // Explorer: who writes each token of the training sequence after the student errs,
  // and which tokens receive a loss (Figure 1 of the paper).
  // Cells: s student, e error, f student continuing the error, t teacher, c critique, x removed, r rewrite.
  // Loss: 1 loss, 2 loss scored with the critique, 0 none.
  var METHODS = {
    opd: {
      cells: "ssseffffffff", loss: "111111111111",
      text: "<strong>OPD</strong> scores every token of the student's rollout. After the error, the teacher continues from a wrong prefix and tends to follow the error, so its next-token distribution is no longer a reliable corrective target.",
      props: [1, 1, 0]
    },
    trunc: {
      cells: "sssexxxxxxxx", loss: "111100000000",
      text: "<strong>Truncation</strong> removes supervision from the later part of the response. It avoids the unreliable states, but the states that the student reaches there at inference are never trained.",
      props: [1, 0, 2]
    },
    takeover: {
      cells: "sssetttsssss", loss: "111100011111",
      text: "<strong>Takeover</strong> lets the teacher write a span into the trajectory. The student then trains on a sequence that the teacher partly wrote and that the student itself would rarely generate.",
      props: [0, 1, 1]
    },
    ours: {
      cells: "sssecrrrrrrr", loss: "000002222222",
      text: "<strong>CriticOPD</strong> keeps the student's prefix through the last error. The teacher critiques it, the student rewrites the rest, and the teacher scores the rewrite with the critique in its context. The critique is never part of the student's training sequence.",
      props: [1, 1, 1]
    }
  };
  var PROPS = [
    "Every supervised token is written by the student",
    "Supervision continues after the error, where the student goes at inference",
    "The teacher's target is reliable on the supervised tokens"
  ];
  var CELL = { s: "", e: "error", f: "follow", t: "teacher", c: "critique", x: "empty", r: "rewrite" };
  var LABEL = { s: "student token", e: "student error", f: "student token that continues the error", t: "teacher token", c: "critique", x: "removed", r: "student rewrite" };

  function initExplorer() {
    var strip = document.getElementById("strip"), loss = document.getElementById("loss");
    if (!strip) return;
    var text = document.getElementById("m-text"), props = document.getElementById("props");
    var tabs = document.querySelectorAll(".tabs button");
    var cells = [], bars = [];
    for (var i = 0; i < 12; i++) {
      var c = document.createElement("div"); c.className = "cell"; strip.appendChild(c); cells.push(c);
      var b = document.createElement("div"); b.className = "bar"; loss.appendChild(b); bars.push(b);
    }

    function show(key) {
      var m = METHODS[key];
      for (var i = 0; i < 12; i++) {
        var t = m.cells[i];
        cells[i].className = "cell " + CELL[t];
        cells[i].setAttribute("title", LABEL[t]);
        bars[i].className = "bar" + (m.loss[i] === "1" ? " on" : m.loss[i] === "2" ? " fb" : "");
      }
      strip.setAttribute("aria-label", "Training sequence: " + m.cells.split("").map(function (t) { return LABEL[t]; }).join(", "));
      text.innerHTML = m.text;
      props.innerHTML = "";
      m.props.forEach(function (v, j) {
        var li = document.createElement("li");
        li.className = v === 1 ? "yes" : v === 0 ? "no" : "na";
        var sym = v === 1 ? "✓" : v === 0 ? "✗" : "–";
        var note = v === 2 ? " <span class=\"small\">(no supervision there)</span>" : "";
        li.innerHTML = "<i aria-hidden=\"true\">" + sym + "</i><span><span class=\"sr\">" + (v === 1 ? "Yes: " : v === 0 ? "No: " : "Not applicable: ") + "</span>" + PROPS[j] + note + "</span>";
        props.appendChild(li);
      });
      tabs.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-m") === key ? "true" : "false"); });
    }

    tabs.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-m")); }); });
    show("ours");
  }

  function initCopy() {
    var btn = document.getElementById("copy-bib"), bib = document.getElementById("bibtex");
    if (!btn || !bib) return;
    btn.addEventListener("click", function () {
      var text = bib.textContent;
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta); done();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderMath();
    initExplorer();
    initCopy();
  });
})();
