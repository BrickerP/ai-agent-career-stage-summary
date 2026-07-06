(async () => {
  const data = await fetch("./data/public-domain-map.json").then((response) => {
    if (!response.ok) {
      throw new Error(`Map data failed to load: ${response.status}`);
    }
    return response.json();
  });

  const svg = document.querySelector("#domain-map");
  const detailTitle = document.querySelector("[data-detail-title]");
  const detailSummary = document.querySelector("[data-detail-summary]");
  const detailLinks = document.querySelector("[data-detail-links]");
  const app = document.querySelector("[data-map-app]");
  const width = 1120;
  const height = 700;
  const center = { x: width / 2, y: height / 2 };
  const nodeById = new Map(data.domains.map((node) => [node.id, node]));

  const positions = {
    "research-platform": { x: 560, y: 330, group: "core" },
    "agent-interface": { x: 245, y: 210, group: "agent" },
    "growth-and-onboarding": { x: 245, y: 475, group: "agent" },
    "participant-supply": { x: 560, y: 120, group: "core" },
    "voice-runtime": { x: 820, y: 210, group: "core" },
    "report-quality": { x: 820, y: 475, group: "quality" },
    "infra-release": { x: 560, y: 580, group: "quality" }
  };

  const palette = {
    core: "#0d6b5d",
    agent: "#234f7a",
    quality: "#9b3f2f"
  };

  const highlightSets = {
    reset: new Set(data.domains.map((node) => node.id)),
    "focus-core": new Set(["research-platform", "participant-supply", "voice-runtime", "report-quality"]),
    "focus-agent": new Set(["agent-interface", "growth-and-onboarding", "research-platform"]),
    "focus-quality": new Set(["voice-runtime", "report-quality", "infra-release", "research-platform"])
  };

  function clearSvg() {
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
  }

  function createSvgElement(name, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function connectionsFor(id) {
    return data.flows
      .filter(([source, target]) => source === id || target === id)
      .map(([source, target]) => (source === id ? target : source))
      .map((connectedId) => nodeById.get(connectedId))
      .filter(Boolean);
  }

  function selectNode(id) {
    const node = nodeById.get(id);
    if (!node) return;

    detailTitle.textContent = node.name;
    detailSummary.textContent = node.summary;
    detailLinks.innerHTML = "";
    connectionsFor(id).forEach((connected) => {
      const item = document.createElement("li");
      item.textContent = connected.name;
      detailLinks.appendChild(item);
    });

    app.dataset.selected = id;
    svg.querySelectorAll("[data-node-id]").forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.nodeId === id);
      element.classList.toggle(
        "is-connected",
        connectionsFor(id).some((connected) => connected.id === element.dataset.nodeId)
      );
    });
    svg.querySelectorAll("[data-edge]").forEach((element) => {
      const [source, target] = element.dataset.edge.split("|");
      element.classList.toggle("is-selected", source === id || target === id);
    });
  }

  function applyFocus(action) {
    const visible = highlightSets[action] || highlightSets.reset;
    svg.querySelectorAll("[data-node-id]").forEach((element) => {
      element.classList.toggle("is-muted", !visible.has(element.dataset.nodeId));
    });
    svg.querySelectorAll("[data-edge]").forEach((element) => {
      const [source, target] = element.dataset.edge.split("|");
      element.classList.toggle("is-muted", !visible.has(source) || !visible.has(target));
    });
  }

  function draw() {
    clearSvg();

    const title = createSvgElement("title", { id: "map-title" });
    title.textContent = "AI Agent Product Engineering domain map";
    const desc = createSvgElement("desc", { id: "map-desc" });
    desc.textContent = "Interactive sanitized map of product and runtime domains.";
    svg.appendChild(title);
    svg.appendChild(desc);

    const defs = createSvgElement("defs");
    const marker = createSvgElement("marker", {
      id: "arrow",
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse"
    });
    marker.appendChild(createSvgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#62716c" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const orbit = createSvgElement("circle", {
      cx: center.x,
      cy: center.y,
      r: "265",
      class: "map-orbit"
    });
    svg.appendChild(orbit);

    data.flows.forEach(([sourceId, targetId]) => {
      const source = positions[sourceId];
      const target = positions[targetId];
      const line = createSvgElement("line", {
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        class: "map-edge",
        "marker-end": "url(#arrow)",
        "data-edge": `${sourceId}|${targetId}`
      });
      svg.appendChild(line);
    });

    data.domains.forEach((node) => {
      const position = positions[node.id];
      const group = createSvgElement("g", {
        class: `map-node map-node-${position.group}`,
        tabindex: "0",
        role: "button",
        "aria-label": node.name,
        "data-node-id": node.id,
        transform: `translate(${position.x}, ${position.y})`
      });
      const circle = createSvgElement("circle", {
        r: node.id === "research-platform" ? "88" : "76",
        fill: palette[position.group]
      });
      const title = createSvgElement("text", {
        class: "map-node-title",
        "text-anchor": "middle",
        y: "-8"
      });
      const lines = node.name.split(" ");
      lines.forEach((line, index) => {
        const tspan = createSvgElement("tspan", { x: "0", dy: index === 0 ? "0" : "20" });
        tspan.textContent = line;
        title.appendChild(tspan);
      });
      const label = createSvgElement("text", {
        class: "map-node-meta",
        "text-anchor": "middle",
        y: node.name.split(" ").length > 2 ? "50" : "40"
      });
      label.textContent = position.group;

      group.appendChild(circle);
      group.appendChild(title);
      group.appendChild(label);
      group.addEventListener("click", () => selectNode(node.id));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectNode(node.id);
        }
      });
      svg.appendChild(group);
    });

    selectNode("research-platform");
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => applyFocus(button.dataset.action));
  });

  draw();
})().catch((error) => {
  const app = document.querySelector("[data-map-app]");
  app.innerHTML = `<p class="map-error">${error.message}</p>`;
});
