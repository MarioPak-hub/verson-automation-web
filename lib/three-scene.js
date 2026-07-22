(function () {
  "use strict";

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  var PART_NAMES = [
    "valve_body", "bonnet", "stem", "actuator_body", "actuator_dome",
    "pipe_left", "pipe_right", "flange_left", "flange_right",
    "bolt_left_0", "bolt_left_1", "bolt_left_2", "bolt_left_3", "bolt_left_4", "bolt_left_5",
    "bolt_right_0", "bolt_right_1", "bolt_right_2", "bolt_right_3", "bolt_right_4", "bolt_right_5",
    "yoke_left", "yoke_right", "positioner_box", "positioner_dial"
  ];

  function initAssemblyScene() {
    if (!window.THREE || !window.THREE.GLTFLoader) return;
    var wrap = document.querySelector("[data-assembly-canvas]");
    var section = document.querySelector("[data-assembly-wrap]");
    if (!wrap || !section) return;

    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isMobile = window.innerWidth < 760;
    var THREE_ = window.THREE;

    var renderer = new THREE_.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE_.sRGBEncoding;
    if (renderer.toneMapping !== undefined) {
      renderer.toneMapping = THREE_.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    }
    wrap.appendChild(renderer.domElement);

    var scene = new THREE_.Scene();
    scene.fog = new THREE_.FogExp2(0x0a0d0a, 0.02);

    var camera = new THREE_.PerspectiveCamera(46, wrap.clientWidth / wrap.clientHeight, 0.1, 100);

    /* ---- lighting: cinematic 4-source, tuned for green industrial metal ---- */
    scene.add(new THREE_.AmbientLight(0x2c3a2f, 0.6));
    var key = new THREE_.DirectionalLight(0xf2fbe9, 1.9);
    key.position.set(6, 8, 5);
    scene.add(key);
    var rim = new THREE_.DirectionalLight(0x8fe36a, 0.9);
    rim.position.set(-7, 4, -5);
    scene.add(rim);
    var accentLight = new THREE_.PointLight(0x6dc24a, 1.6, 24);
    accentLight.position.set(2.2, 2.2, 4);
    scene.add(accentLight);
    var fillLight = new THREE_.PointLight(0x2a4a33, 0.7, 18);
    fillLight.position.set(-3, -1, 4);
    scene.add(fillLight);
    var topLight = new THREE_.PointLight(0xd8ffcf, 0.7, 20);
    topLight.position.set(0, 6, 2);
    scene.add(topLight);

    var group = new THREE_.Group();
    group.rotation.y = -0.5;
    group.rotation.x = 0.06;
    scene.add(group);

    var parts = [];
    var glowMat = null;
    var loaded = false;

    function rnd(seed) { return (Math.sin(seed * 999.123) * 0.5 + 0.5); }
    function explodeFor(i, baseX, baseY, baseZ, spread) {
      var a = rnd(i) * Math.PI * 2;
      var b = rnd(i + 50) * Math.PI * 2;
      var r = spread * (0.7 + rnd(i + 100) * 0.8);
      return [
        baseX + Math.cos(a) * r,
        baseY + Math.sin(b) * r * 0.65 + (rnd(i + 20) - 0.5) * spread,
        baseZ + Math.sin(a) * r
      ];
    }

    var loader = new THREE_.GLTFLoader();
    loader.load(
      "assets/3d/control-valve.glb",
      function (gltf) {
        var root = gltf.scene;
        PART_NAMES.forEach(function (name, i) {
          var mesh = root.getObjectByName(name);
          if (!mesh) return;

          if (name === "positioner_dial") {
            glowMat = mesh.material;
          }

          var assembledPos = mesh.position.clone();
          var assembledRotE = mesh.rotation.clone();
          var isCore = (name === "valve_body" || name === "bonnet" || name === "stem" || name === "actuator_body" || name === "actuator_dome");
          var isBolt = name.indexOf("bolt_") === 0;
          var spread = isBolt ? 2.6 : (isCore ? 1.5 : 2.1);
          var delay = isCore ? 0 : (isBolt ? 0.5 + rnd(i) * 0.15 : (name.indexOf("flange") === 0 ? 0.28 : 0.12));

          var explodeVec = explodeFor(i, assembledPos.x, assembledPos.y, assembledPos.z, spread);
          var rotJitter = [
            (rnd(i + 7) - 0.5) * 4,
            (rnd(i + 8) - 0.5) * 4,
            (rnd(i + 9) - 0.5) * 4
          ];

          mesh.position.set(explodeVec[0], explodeVec[1], explodeVec[2]);
          mesh.rotation.set(
            assembledRotE.x + rotJitter[0],
            assembledRotE.y + rotJitter[1],
            assembledRotE.z + rotJitter[2]
          );

          parts.push({
            mesh: mesh,
            from: new THREE_.Vector3(explodeVec[0], explodeVec[1], explodeVec[2]),
            to: assembledPos,
            rotFrom: new THREE_.Euler(assembledRotE.x + rotJitter[0], assembledRotE.y + rotJitter[1], assembledRotE.z + rotJitter[2]),
            rotTo: assembledRotE,
            delay: delay
          });
        });

        group.add(root);
        loaded = true;
      },
      undefined,
      function (err) { console.warn("[assembly-scene] GLB load failed:", err); }
    );

    /* ---- resize ---- */
    function fitSize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    fitSize();
    window.addEventListener("resize", fitSize);

    /* ---- scroll-driven progress ---- */
    var progress = 0;
    var targetProgress = 0;

    function computeProgress() {
      var rect = section.getBoundingClientRect();
      var total = section.offsetHeight - window.innerHeight;
      if (total <= 0) { targetProgress = 1; return; }
      var scrolled = -rect.top;
      targetProgress = Math.min(1, Math.max(0, scrolled / total));
    }

    if (reduced) {
      progress = 1; targetProgress = 1;
    } else {
      window.addEventListener("scroll", computeProgress, { passive: true });
      computeProgress();
    }

    var camFrom = { pos: new THREE_.Vector3(2.6, 4.4, 13.5), look: new THREE_.Vector3(0, 1.2, 0) };
    var camTo = { pos: new THREE_.Vector3(-1.4, 1.5, 6.6), look: new THREE_.Vector3(0.1, 1.5, 0) };
    var camPos = camFrom.pos.clone();
    var camLook = camFrom.look.clone();

    var label = document.querySelector("[data-assembly-label]");

    function tick(t) {
      progress += (targetProgress - progress) * 0.08;

      if (loaded) {
        parts.forEach(function (p) {
          var pp = Math.min(1, Math.max(0, (progress - p.delay) / (1 - p.delay)));
          var eased = 1 - Math.pow(1 - pp, 3);
          p.mesh.position.lerpVectors(p.from, p.to, eased);
          p.mesh.rotation.x = p.rotFrom.x + (p.rotTo.x - p.rotFrom.x) * eased;
          p.mesh.rotation.y = p.rotFrom.y + (p.rotTo.y - p.rotFrom.y) * eased;
          p.mesh.rotation.z = p.rotFrom.z + (p.rotTo.z - p.rotFrom.z) * eased;
        });
      }

      var camEase = 1 - Math.pow(1 - progress, 2);
      var wantPos = new THREE_.Vector3().lerpVectors(camFrom.pos, camTo.pos, camEase);
      var wantLook = new THREE_.Vector3().lerpVectors(camFrom.look, camTo.look, camEase);
      camPos.lerp(wantPos, 0.06);
      camLook.lerp(wantLook, 0.06);

      var idle = reduced ? 0 : Math.sin(t * 0.00032) * 0.2;
      camera.position.set(camPos.x + idle, camPos.y, camPos.z);
      camera.lookAt(camLook);

      group.rotation.y += reduced ? 0.0008 : 0.0015;

      if (glowMat) {
        var pulse = 2.2 + Math.sin(t * 0.004) * 1.1;
        if (glowMat.emissiveIntensity !== undefined) glowMat.emissiveIntensity = pulse;
      }
      accentLight.intensity = 1.4 + Math.sin(t * 0.0026) * 0.5;

      if (label) {
        var showAt = 0.72;
        var op = progress > showAt ? Math.min(1, (progress - showAt) / (1 - showAt)) : 0;
        label.style.opacity = op;
        label.style.transform = "translateY(" + (14 - op * 14) + "px)";
      }

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { safe(initAssemblyScene, "initAssemblyScene"); });
  } else {
    safe(initAssemblyScene, "initAssemblyScene");
  }
})();
