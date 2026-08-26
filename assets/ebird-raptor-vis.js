window.addEventListener("load", init);

// parameters passed from page importing this script
const visConfig = window.EBIRD_VIS_CONFIG || {};
const dataDir = visConfig.dataDir || "source_data_upload";
//

const svg = d3.select("#map");
const sidebarWidth = 200;
// const mapWidth = 570;                    // expanded range
const mapWidth = 500;                       // original
const svgWidth = mapWidth + sidebarWidth;   // update #map 'width' CSS value above to match if this changed
const svgHeight = 550;                      // original
// const svgHeight = 570;                   // expanded range
const mapHeight = svgHeight;
svg.attr("width", svgWidth)
   .attr("height", svgHeight);

const map_scale = 530;         // original
const latMapOffset = 26;       // shift map leftward in SVG window
const vertMapOffset = 5;       // shift map downward in SVG window
// const map_scale = 400;      // expanded range
// const latMapOffset = 31.5;  // shift map leftward in SVG window
// const vertMapOffset = 3;    // shift map downward in SVG window

const panOverscrollWest = 320;
const panOverscrollEast = 105;
const panOverscrollNorth = 387;
const panOverscrollSouth = 150;

const hexSpacingKm = 50;  // used with dggridr::dgconstruct()
const hexRadiusKm = hexSpacingKm / 2;

function makeHexPath(lon, lat, radiusKm) {
    const [cx, cy] = projection([lon, lat]);

    // convert km to degrees for the hex corners
    const radiusLat = radiusKm / 111.32;
    const radiusLon = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

    const points = d3.range(6).map(i => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const lon2 = lon + Math.cos(angle) * radiusLon;
        const lat2 = lat + Math.sin(angle) * radiusLat;
        return projection([lon2, lat2]);
    });

    const p = d3.path();
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
    p.closePath();
    return p.toString();
}

const mapLayer = svg.append("g").attr("class", "map-layer");     // zoomable base map layer
const dataLayer = svg.append("g").attr("class", "data-layer");   // species hex layers and map annotations
const mapAnnotationLayer = dataLayer.append("g").attr("class", "map-annotation-layer");
const labelLayer = svg.append("g").attr("class", "label-layer"); // lat/lon labels (always above filled cells)

// Border around the map viewport
svg.append("rect")
   .attr("class", "map-border")
   .attr("x", 0).attr("y", 0)
   .attr("width", mapWidth).attr("height", mapHeight);

// Transparent overlay to block all map interactions until narrative unlocks.
const mapInteractionBlocker = svg.append("rect")
                                 .attr("id", "map-interaction-blocker")
                                 .attr("x", 0)
                                 .attr("y", 0)
                                 .attr("width", mapWidth)
                                 .attr("height", mapHeight)
                                 .attr("fill", "transparent")
                                 .style("pointer-events", "all");

// Static sidebar — NOT part of the zoom/pan transform
const sidebarLayer = svg.append("g")
                        .attr("class", "sidebar-layer")
                        .attr("transform", `translate(${mapWidth}, 0)`);
sidebarLayer.append("rect")
            .attr("class", "sidebar-bg")
            .attr("width", sidebarWidth)
            .attr("height", svgHeight)
            .attr("fill", "black");
const sidebarAnnotationLayer = sidebarLayer.append("g").attr("class", "sidebar-annotation-layer");

const citationText = [
    "eBird Basic Dataset.",
    "Version: EBD_relMar-2026.",
    "Cornell Lab of Ornithology",
    "Ithaca, New York. Mar 2026."
];

const citationGroup = sidebarLayer.append("g")
                                   .attr("class", "sidebar-citation")
                                   .attr("transform", `translate(20, ${svgHeight - 45})`);
citationGroup.selectAll("text")
             .data(citationText)
             .enter()
             .append("text")
             .attr("y", (d, i) => i * 12)
             .text(d => d);

const latLabelShift = 275;  // shift latitude-line labels rightward (pixels)
const lonLabelShift = 73;  // shift longitude-line labels upward (pixels)

const wrapper = d3.select("#viz-wrapper");
const tooltip = wrapper.select("#tooltip");

const SLOT_A_COLOR = "#12eb1f";
const SLOT_B_COLOR = "#926fff";
const BOTH_COLOR = "#41e2f5";

const speciesCatalog = [
    { id: "msk", label: "Mississippi Kite", file: "ar_20260821_Ictinia_mississippiensis_zf_clean_agg_weekly.csv.gz" },
    { id: "osp", label: "Osprey", file: "ar_20260821_Pandion_haliaetus_zf_clean_agg_weekly.csv.gz" },
    { id: "swa", label: "Swainson's Hawk", file: "ar_20260821_Buteo_swainsoni_zf_clean_agg_weekly.csv.gz" },
    { id: "bwh", label: "Broad-winged Hawk", file: "ar_20260821_Buteo_platypterus_zf_clean_agg_weekly.csv.gz" },
    { id: "nth", label: "Northern Harrier", file: "ar_20260821_Circus_hudsonius_zf_clean_agg_weekly.csv.gz" },
    { id: "ssk", label: "Sharp-shinned Hawk", file: "ar_20260821_Accipiter_striatus_zf_clean_agg_weekly.csv.gz" },
    { id: "coh", label: "Cooper's Hawk", file: "ar_20260821_Astur_cooperii_zf_clean_agg_weekly.csv.gz" },
    { id: "rsh", label: "Red-shouldered Hawk", file: "ar_20260821_Buteo_lineatus_zf_clean_agg_weekly.csv.gz" },
    { id: "rth", label: "Red-tailed Hawk", file: "ar_20260821_Buteo_jamaicensis_zf_clean_agg_weekly.csv.gz" },
    { id: "merk", label: "Merlin", file: "ar_20260821_Falco_columbarius_zf_clean_agg_weekly.csv.gz" },
    { id: "amke", label: "American Kestrel", file: "ar_20260821_Falco_sparverius_zf_clean_agg_weekly.csv.gz" },
    { id: "pere", label: "Peregrine Falcon", file: "ar_20260821_Falco_peregrinus_zf_clean_agg_weekly.csv.gz" },
    { id: "baea", label: "Bald Eagle", file: "ar_20260821_Haliaeetus_leucocephalus_zf_clean_agg_weekly.csv.gz" },
    { id: "gole", label: "Golden Eagle", file: "ar_20260821_Aquila_chrysaetos_zf_clean_agg_weekly.csv.gz" },
    { id: "stki", label: "Swallow-tailed Kite", file: "ar_20260821_Elanoides_forficatus_zf_clean_agg_weekly.csv.gz" }
];

const speciesById = new Map(speciesCatalog.map(species => [species.id, species]));
const speciesDataCache = new Map();
const speciesLoadPromises = new Map();

const defaultSlotAId = "msk";
const defaultSlotBId = "osp";

let selectedSlotAId = defaultSlotAId;
let selectedSlotBId = defaultSlotBId;

function setSpeciesSelection(mskChecked, ospChecked) {
    wrapper.select("#chk-msk").property("checked", mskChecked);
    wrapper.select("#chk-osp").property("checked", ospChecked);
}

function getSelectedSpeciesLabel(slotKey) {
    const selectedId = slotKey === "slotA" ? selectedSlotAId : selectedSlotBId;
    return speciesById.get(selectedId)?.label || "Unknown species";
}

function updateSpeciesSlotLabels() {
    d3.select("#lbl-msk").text(getSelectedSpeciesLabel("slotA"));
    d3.select("#lbl-osp").text(getSelectedSpeciesLabel("slotB"));
}

function showTooltip(event, d) {
    const fmt = d3.format(".3f");
    const mskVisible = wrapper.select("#chk-msk").property("checked");
    const ospVisible = wrapper.select("#chk-osp").property("checked");

    const slotALabel = getSelectedSpeciesLabel("slotA");
    const slotBLabel = getSelectedSpeciesLabel("slotB");

    const speciesLines = [
        mskVisible ? `Checklists w/ ${slotALabel}: ${d.n_detected_slot_a || 0}<br/>` : "",
        ospVisible ? `Checklists w/ ${slotBLabel}: ${d.n_detected_slot_b || 0}<br/>` : ""
    ].join("");

    tooltip.html(` <strong>${fmt(d.cell_ctr_lat)}°, ${fmt(d.cell_ctr_lon)}°</strong><br/>
                   Country (primary): ${d.country_code}<br/>
                   Complete checklists: ${d.n_checklists}<br/>
                   ${speciesLines}
                   `).style("opacity", 0.85);

    const [x, y] = d3.pointer(event, wrapper.node());
    tooltip.style("left", `${x + 12}px`)
           .style("top", `${y + 12}px`);
}

function hideTooltip() {
    tooltip.style("opacity", 0);
}

let graticule;
let path;
let projection;
let currentTransform = d3.zoomIdentity;
let lat_range;
let lon_range;

let firstWeek;
let selectedWeek;
let weekIndexMsk;
let weekIndexOsp;
let layerMSK;
let layerOSP;
let zoomBehavior;

let currentStep = 0; // intro
let isMapInteractionLocked = true;

const mapAnnotationDefs = [
    {
        id: "ex-mississippi-kite",
        lat: 12.031, lon: -86.599,
        dx: -17, dy: 15,
        title: "",
        label: "Mississippi Kite",
        textColor: "#12eb1f"
    },
    {
        id: "ex-neither",
        lat: 9.659, lon: -73.688,
        dx: -10, dy: -35,
        title: "",
        label: "neither"
    },
    {
        id: "ex-osprey",
        lat: 6.027, lon: -77.698,
        dx: -65, dy: 30 ,
        title: "",
        label: "Osprey",
        textColor: "#926fff"
    },
    {
        id: "ex-both",
        lat: 9.261, lon: -84.068,
        dx: -40, dy: 20,
        title: "",
        label: "both",
        textColor: "#41e2f5"
    },
    {
        id: "ex-no-data",
        lat: -3.638, lon: -76.122,
        dx: -70, dy: 25,
        title: "",
        label: "[no data]",
        textColor: "#999"
    },
    {
        id: "msk-breeding-ground",
        lat: 34.75, lon: -90.0,
        dx: 200, dy: 60,
        title: "",
        label: "Mississippi Kite breeding grounds"
    },
    {
        id: "msk-overland-migration",
        lat: 17.253, lon: -91.001,
        dx: 200, dy: -90,
        title: "",
        label: "Overland migration begins"
    },
    {
        id: "msk-no-detections",
        lat: 20.649, lon: -76.149,
        dx: 80, dy: -65,
        title: "",
        label: "No detections"
    },
    {
        id: "msk-no-staging-florida",
        lat: 26.759, lon: -80.921,
        dx: 115, dy: -62,
        title: "",
        label: "No real \"staging\" activity"
    },
    {
        id: "osp-breeding-ground",
        lat: 39.50, lon: -84.350,
        dx: 150, dy: 120,
        title: "",
        label: "Osprey summer range"
    },
    {
        id: "osp-funnel-texas",
        lat: 29.000, lon: -97.500,
        dx: 260, dy: -45,
        title: "",
        label: "Some Osprey start to funnel through the same corridor other species follow…"
    },
    {
        id: "osp-increased-detections-dr",
        lat: 18.926, lon: -70.394,
        dx: 20, dy: -55,
        title: "",
        label: "More detections"
    }
];
let activeMapAnnotationIds = [];

// Sidebar: positioned by fixed x/y within the sidebar. No connector/subject.
const sidebarAnnotationDefs = [
    {
        id: "intro-note",
        x: 20,
        y: 35,
        title: "Welcome",
        label: "Click 'Start the Tour' to see how two raptor species migrate differently each Fall.",
        wrap: 160
    },
    {
        id: "guided-int-note",
        x: 20,
        y: 145,
        label: "Click 'Free Explore' to explore the data on your own.",
        wrap: 160
    },
    {
        id: "color-scale-note",
        x: 20,
        y: svgHeight / 2 - 240,
        title: "INTRO",
        label: "Each hex cell is colored to indicate if species was observed on an eBird checklist this week (see slider at top left).",
        wrap: 160
    },
    {
        id: "hex-presence-note",
        x: 20,
        y: svgHeight / 2 - 100,
        title: "",
        label: "A missing cell outline indicates no checklists were collected in that area this week.",
        wrap: 160
    },
    {
        id: "agg-info-note",
        x: 20,
        y: 280,
        label: "Observation data are aggregated by week, across years from early 2000s to Mar 2026.",
        wrap: 160
    },
    {
        id: "hover-note",
        x: 20,
        y: 390,
        title: "",
        label: "Hover over each cell to see more details.",
        wrap: 160
    },
    {
        id: "msk-breeding-note",
        x: 20,
        y: svgHeight / 8 - 20,
        title: "",
        label: "Mississippi kites breed in the central/southern US during the warmer months.",
        wrap: 160
    },
    {
        id: "msk-overland-note",
        x: 20,
        y: svgHeight / 8 + 20,
        title: "",
        label: "Mississippi kites start flying south, clearly following a land route through Central America.",
        wrap: 160
    },
    {
        id: "msk-no-detections-note",
        x: 20,
        y: svgHeight / 8 + 45,
        title: "",
        label: "Mississippi kites travel in groups over land instead of crossing the Gulf or Caribbean in their journey to South America.",
        wrap: 160
    },
    {
        id: "msk-explanation-note",
        x: 20,
        y: svgHeight / 2 - 30,
        title: "",
        label: "These raptors rely on air currents (\"thermals\") that form only over land to help them travel. Their physiology doesn't lend itself to prolonged powered flight, so they are unable to cross large bodies of water.",
        wrap: 160
    },
    {
        id: "osp-intro-note",
        x: 20,
        y: svgHeight / 8 - 10,
        title: "",
        label: "Now let's compare to the Osprey, which uses a different migration strategy.",
        wrap: 160
    },
    {
        id: "osp-breeding-note",
        x: 20,
        y: svgHeight / 8 + 80,
        title: "",
        label: "Osprey can be found throughout North America (breeding up through northern Canada and Alaska) during the warmer months.",
        wrap: 160
    },
    {
        id: "osp-caribbean-note",
        x: 20,
        y: svgHeight / 8 + 100,
        title: "",
        label: "However, Osprey also start appearing in larger numbers in the Caribbean.",
        wrap: 160
    },
    {
        id: "osp-powered-flight-note",
        x: 20,
        y: svgHeight / 8 + 80,
        title: "",
        label: "The Osprey's powerful wings allow it to cross the Gulf and Caribbean with ease, flying sometimes as long as 24-48 hrs at a time, and it has no trouble catching a fishy meal along the way.",
        wrap: 160
    },
    {
        id: "final-explore-note",
        x: 20,
        y: svgHeight / 8,
        title: "",
        label: "Now use the week slider and species toggles to explore observation distributions throughout the Fall migration! Zoom in to explore areas in more detail.",
        wrap: 160
    }
];

let activeSidebarAnnotationIds = ["intro-note", "guided-int-note"];

function translation_str(x, y) { return "translate(" + x + "," + y + ")"; }

function colorScale(freq_range, color) {
    return d3.scaleLinear()
        .domain([0, d3.max(freq_range)])
        .range(['white', color])
}

function buildWeekIndex(rows) {
    const index = new Map();
    for (const row of rows) {
        const week = row.week;
        if (!index.has(week)) {
            index.set(week, []);
        }
        index.get(week).push(row);
    }
    return index;
}

function parseSpeciesCsvRow(d) {
    const week = +d.week;
    const lat = +d.cell_ctr_lat;
    const lon = +d.cell_ctr_lon;
    if (!Number.isFinite(week) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
    }

    return {
        week,
        cell: d.cell,
        cell_ctr_lat: lat,
        cell_ctr_lon: lon,
        country_code: d.country_code,
        n_checklists: +d.n_checklists || 0,
        n_detected: +d.n_detected || 0,
        tot_observed: +d.tot_observed || 0
    };
}

async function loadCsvGzip(url, rowParser) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }

    const contentEncoding = (response.headers.get("content-encoding") || "").toLowerCase();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    // Case 1: Server sends Content-Encoding: gzip (browser auto-decompresses for text()).
    if (contentEncoding.includes("gzip")) {
        const text = await response.text();
        return d3.csvParse(text, rowParser);
    }

    // Case 2: Raw .gz file without Content-Encoding gzip -> manually decompress in browser.
    const looksCompressed = url.endsWith(".gz") || contentType.includes("gzip") || contentType.includes("x-gzip");
    if (looksCompressed) {
        if (typeof DecompressionStream === "undefined") {
            throw new Error("This browser does not support DecompressionStream for gzip files.");
        }
        const ds = new DecompressionStream("gzip");
        const decompressed = response.body.pipeThrough(ds);
        const text = await new Response(decompressed).text();
        return d3.csvParse(text, rowParser);
    }

    // Fallback: plain CSV response.
    const text = await response.text();
    return d3.csvParse(text, rowParser);
}

async function ensureSpeciesLoaded(speciesId) {
    if (speciesDataCache.has(speciesId)) {
        return speciesDataCache.get(speciesId);
    }

    if (speciesLoadPromises.has(speciesId)) {
        return speciesLoadPromises.get(speciesId);
    }

    const species = speciesById.get(speciesId);
    if (!species) {
        throw new Error(`Unknown species id: ${speciesId}`);
    }

    const loadPromise = loadCsvGzip(`${dataDir}/${species.file}`, parseSpeciesCsvRow)
        .then(rows => ({
            rows,
            weekIndex: buildWeekIndex(rows)
        }))
        .then(speciesData => {
            speciesDataCache.set(speciesId, speciesData);
            speciesLoadPromises.delete(speciesId);
            return speciesData;
        })
        .catch(error => {
            speciesLoadPromises.delete(speciesId);
            throw error;
        });

    speciesLoadPromises.set(speciesId, loadPromise);
    return loadPromise;
}

async function ensureSpeciesPairLoaded(slotAId, slotBId) {
    await Promise.all([
        ensureSpeciesLoaded(slotAId),
        ensureSpeciesLoaded(slotBId)
    ]);
}

function getWeekRowsForSpecies(speciesId) {
    const speciesData = speciesDataCache.get(speciesId);
    if (!speciesData || !speciesData.weekIndex) {
        return [];
    }
    return speciesData.weekIndex.get(selectedWeek) || [];
}

function getSpeciesDataForSlot(slotKey) {
    const speciesId = slotKey === "slotA" ? selectedSlotAId : selectedSlotBId;
    const weekRows = getWeekRowsForSpecies(speciesId);
    const species = speciesById.get(speciesId);
    return {
        speciesId,
        speciesLabel: species?.label || speciesId,
        weekRows
    };
}

function populateSpeciesSelects() {
    const slotASelect = d3.select("#sel-msk");
    const slotBSelect = d3.select("#sel-osp");

    slotASelect.selectAll("option")
        .data(speciesCatalog, d => d.id)
        .join("option")
        .attr("value", d => d.id)
        .text(d => d.label);

    slotBSelect.selectAll("option")
        .data(speciesCatalog, d => d.id)
        .join("option")
        .attr("value", d => d.id)
        .text(d => d.label);

    slotASelect.property("value", selectedSlotAId);
    slotBSelect.property("value", selectedSlotBId);
    updateSpeciesSlotLabels();
}

function resetSpeciesSelectsToDefaults() {
    selectedSlotAId = defaultSlotAId;
    selectedSlotBId = defaultSlotBId;
    d3.select("#sel-msk").property("value", selectedSlotAId);
    d3.select("#sel-osp").property("value", selectedSlotBId);
    updateSpeciesSlotLabels();
}

async function onSpeciesDropdownChange(slotKey, x, y) {
    const isFreeExplore = currentStep === 11;
    if (!isFreeExplore) {
        return;
    }

    const selectId = slotKey === "slotA" ? "#sel-msk" : "#sel-osp";
    const selectedId = d3.select(selectId).property("value");

    if (slotKey === "slotA") {
        selectedSlotAId = selectedId;
    } else {
        selectedSlotBId = selectedId;
    }

    updateSpeciesSlotLabels();

    try {
        await ensureSpeciesPairLoaded(selectedSlotAId, selectedSlotBId);
        updateChart(x, y);
    } catch (error) {
        console.error("Failed to load selected species:", error);
    }
}

async function init() {
    const [mskRows, ospRows, worldData] = await Promise.all([
        loadCsvGzip(`${dataDir}/ar_20260821_Ictinia_mississippiensis_zf_clean_agg_weekly.csv.gz`, parseSpeciesCsvRow),
        loadCsvGzip(`${dataDir}/ar_20260821_Pandion_haliaetus_zf_clean_agg_weekly.csv.gz`, parseSpeciesCsvRow),
        d3.json(`${dataDir}/countries-50m.json`)
    ]);
    weekIndexMsk = buildWeekIndex(mskRows);
    weekIndexOsp = buildWeekIndex(ospRows);

    speciesDataCache.set("msk", {
        rows: mskRows,
        weekIndex: weekIndexMsk
    });
    speciesDataCache.set("osp", {
        rows: ospRows,
        weekIndex: weekIndexOsp
    });

    firstWeek = 31;    // original range
    // firstWeek = 27; // expanded range
    selectedWeek = firstWeek;
    d3.select("#week-slider").property("value", selectedWeek);
    d3.select("#week-label").text(`Week ${selectedWeek}`);

    // lat_range = d3.extent(data_msk, d => Math.round(d.cell_ctr_lat));
    // lon_range = d3.extent(data_msk, d => Math.round(d.cell_ctr_lon));
    lat_range = [-15, 40];           // hard-coded to optimal values for original narrative scenes, calculated from extent of original range
    lon_range = [-108, -50];         // hard-coded to optimal values for original narrative scenes
    // https://observablehq.com/@d3/d3-extent
    const centerLon = latMapOffset + (lon_range[0]-1 + lon_range[1]) / 2;
    const centerLat = vertMapOffset + (lat_range[0]-1 + lat_range[1]) / 2;
    // expanded longitude range by 1 degree West to un-crowd axis
    // expanded latitude range by 1 degree South to un-crowd axis
    lat_range_graticule = [-20, 60];           // extending beyond narrative-vis window for overscroll and zoom out
    lon_range_graticule = [-130, -50];         // extending beyond narrative-vis window for overscroll and zoom out

    projection = d3.geoMercator()
                   .center([centerLon, centerLat])
                   .scale(map_scale);
    path = d3.geoPath()
             .projection(projection);
    graticule = d3.geoGraticule();

    // instead of a d3 "scale" function, using a projection to map lat/lon to pixels
    const x = d => projection([d.cell_ctr_lon, d.cell_ctr_lat])[0];
    const y = d => projection([d.cell_ctr_lon, d.cell_ctr_lat])[1];

    // each species on its own layer
    layerMSK = dataLayer.append("g").attr("class", "layer-msk");
    layerOSP = dataLayer.append("g").attr("class", "layer-osp");

    populateSpeciesSelects();

    // update when date selection changes
    d3.select("#week-slider")
      .on("input", function() { selectedWeek = +this.value;
                                d3.select("#week-label").text(`Week ${selectedWeek}`);
                                updateChart(x, y);
                   });
        // "this" refers to whatever DOM element triggered the event.
        // "this.value" is the value of the slider (as str, so convert to number w/ +).

    // update when species selection changes
    d3.selectAll("#chk-msk, #chk-osp")
      .on("change", function() { updateChart(x, y); });

        d3.select("#sel-msk")
            .on("change", async function() {
                    await onSpeciesDropdownChange("slotA", x, y);
            });

        d3.select("#sel-osp")
            .on("change", async function() {
                    await onSpeciesDropdownChange("slotB", x, y);
            });

    // Force initial species state for consistency across browser/page restores.
    setSpeciesSelection(true, true);

    updateChart(x, y);

    // Lock interactive controls until narrative intro completes.
    setControlsLocked(true);
    setMapInteractionLocked(true);
    setResetButtonLocked(true);

    // Show intro note immediately; map annotation stays hidden until button click.
    activeSidebarAnnotationIds = ["intro-note", "guided-int-note"];
    activeMapAnnotationIds = [];
    updateSidebarAnnotation();
    updateMapAnnotation();

    d3.select("#narr-forward").on("click", async function() {
        setFreeButtonLocked(true);
        try {
        if (currentStep === 11) {
            // From Free Explore, restore baseline state before replaying step 1.
            await resetVisualization({ keepResetUnlocked: true });
        }

        if (currentStep > 0 && currentStep < 11) {
            // Return to the expected guided view before advancing scenes.
            d3.select(this).property("disabled", true);
            setControlsLocked(true);
            setMapInteractionLocked(true);
            await restoreGuidedViewForStep(currentStep, 700);
        }

        if (currentStep === 0) {
            // Optional: prevent double-click during animation
            d3.select(this).property("disabled", true);
            setResetButtonLocked(false);

            // Clear intro annotations first (optional, but cleaner)
            await showAnnotations({ sidebar: [], map: [] });

            // week slider
            await animateWeekSlider(42, 1500);

            // zoom
            await zoomToLonLat(-85, 5.7, 1.9, 2500);

            // annotations
            await showAnnotationsStaggered({
                sidebar: ["color-scale-note", "hex-presence-note", "hover-note", "agg-info-note"],
                map: ["ex-mississippi-kite", "ex-neither", "ex-osprey", "ex-both", "ex-no-data"]
            });

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
            // Keep data controls locked until the final scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 1;
        }

        else if (currentStep === 1) {
            d3.select(this).property("disabled", true);

            // Keep everything locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Clear scene 2 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Zoom all the way back out.
            await svg.transition()
                     .duration(1000)
                     .call(zoomBehavior.transform, d3.zoomIdentity)
                     .end()
                     .catch(() => {});

            // Move week slider back to week 31.
            await animateWeekSlider(31);
            await sleep(700);

            // Show only Mississippi kite data.
            setSpeciesSelection(true, false);
            updateChart(x, y);

            await sleep(300);
            // Add final scene annotations.
            await showAnnotations({
                sidebar: ["msk-breeding-note"],
                map: ["msk-breeding-ground"]
            });

            // Keep data controls locked for subsequent guided scenes.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 2;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 2) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Clear scene 3 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Move week slider slowly to week 34.
            await animateWeekSlider(34, 2600);

            // Add scene 4 annotations.
            await showAnnotations({
                sidebar: ["msk-overland-note"],
                map: ["msk-overland-migration"]
            });

            // Keep data controls locked for subsequent guided scenes.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 3;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 3) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Transition out scene 4 annotations.
            await showAnnotations({ sidebar: ["msk-overland-note"], map: [] });
            await sleep(250);

            // Add new Mississippi Kite scene annotation.
            await showAnnotations({
                sidebar: ["msk-overland-note"],
                map: ["msk-no-staging-florida"]
            });

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 4;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 4) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Clear scene 4 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Move week slider slowly to week 40.
            await animateWeekSlider(40, 2600);

            // Add scene 5 annotations.
            await showAnnotations({
                sidebar: ["msk-no-detections-note", "msk-explanation-note"],
                map: ["msk-no-detections"]
            });

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 5;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 5) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Clear scene 5 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Toggle off all species as a reset
            setSpeciesSelection(false, false);
            updateChart(x, y);

            // Zoom all the way out and move slider to week 30.
            await Promise.all([
                svg.transition()
                   .duration(1000)
                   .call(zoomBehavior.transform, d3.zoomIdentity)
                   .end()
                   .catch(() => {}),
                animateWeekSlider(31)
            ]);

            // Switch to Osprey-only.
            setSpeciesSelection(false, true);
            updateChart(x, y);

            // Add scene 6 annotations.
            await showAnnotations({
                sidebar: ["osp-breeding-note", "osp-intro-note"],
                map: ["osp-breeding-ground"]
            });

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 6;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 6) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Clear scene 6 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Slowly move week slider to week 37.
            await animateWeekSlider(37, 2600);

            // Add scene 7 map annotation.
            await showAnnotations({
                sidebar: [],
                map: ["osp-funnel-texas"]
            });

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 7;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 7) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Transition out scene 7 annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Keep week slider where it is; add scene 8 annotations.
            await showAnnotations({
                sidebar: ["osp-caribbean-note"],
                map: ["osp-increased-detections-dr"]
            });

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 8;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 8) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Keep current annotations and animate a tighter Caribbean zoom.
            await zoomToLonLat(-71.246, 19.352, 2, 1800);
            // Don't re-render annotations here - causes blink

            // Keep data controls locked for the next guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 9;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 9) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Remove the current map and sidebar annotations.
            await showAnnotations({ sidebar: [], map: [] });
            await sleep(250);

            // Slowly move to late fall.
            await animateWeekSlider(43, 3000);

            // Add sidebar-only explanatory note.
            await showAnnotations({
                sidebar: ["osp-powered-flight-note"],
                map: []
            });

            // Keep controls locked for one more guided scene.
            setControlsLocked(true);
            setMapInteractionLocked(false);
            currentStep = 10;

            d3.select(this).text("Next").property("disabled", false).classed("is-explore", false);
        }

        else if (currentStep === 10) {
            d3.select(this).property("disabled", true);

            // Keep interactions locked while scene transition runs.
            setControlsLocked(true);
            setMapInteractionLocked(true);

            // Zoom back out.
            await svg.transition()
                     .duration(1200)
                     .call(zoomBehavior.transform, d3.zoomIdentity)
                     .end()
                     .catch(() => {});

            // Switch on both species.
            setSpeciesSelection(true, true);
            updateChart(x, y);

            // Add final sidebar guidance note in addition to existing scene content.
            await showAnnotations({
                sidebar: ["final-explore-note"],
                map: []
            });

            // New final scene reached: unlock controls for free exploration.
            setControlsLocked(false);
            setMapInteractionLocked(false);
            currentStep = 11;

            d3.select(this).text("Start the Tour").property("disabled", false).classed("is-explore", false);
        }

        } finally {
            // Keep Free Explore inactive during transitions, but re-enable
            // it once the current guided step finishes.
            if (currentStep < 11) {
                setFreeButtonLocked(false);
            }
        }
    });

    d3.select("#narr-reset").on("click", resetVisualization);

    d3.select("#narr-free").on("click", () => {
            // Skip guided steps and unlock all interactions immediately.
            activeMapAnnotationIds = [];
            activeSidebarAnnotationIds = [];
            mapAnnotationLayer.selectAll("*").interrupt();
            sidebarAnnotationLayer.selectAll("*").interrupt();
            hideAnnotations();

            setControlsLocked(false);
            setMapInteractionLocked(false);
            setResetButtonLocked(false);
            currentStep = 11;

            d3.select("#narr-forward")
              .text("Start the Tour")
              .property("disabled", false)
              .classed("is-explore", false);
            setFreeButtonLocked(true);
    });

    // zoom and pan
    zoomBehavior = d3.zoom()
                     .filter((event) => {
                         if (isMapInteractionLocked) return false;
                         return (!event.ctrlKey || event.type === "wheel") && !event.button;
                     })
                     .scaleExtent([0.537, 4]) // min/max zoom
                     .extent([[0, 0], [mapWidth, mapHeight]]) // define the area in which zooming is allowed
                     .translateExtent([[-panOverscrollWest, -panOverscrollNorth], [mapWidth + panOverscrollEast, mapHeight + panOverscrollSouth]]) // allow directional overscroll beyond default viewport
                     .on("zoom", (event) => {
                             currentTransform = event.transform;
                             mapLayer.attr("transform", currentTransform);
                             dataLayer.attr("transform", currentTransform);
                             updateLabelTransform();
                     });

    svg.call(zoomBehavior);

    drawMap(worldData);

    makeLabels(lat_range_graticule, lon_range_graticule);
    updateLabelTransform();

}

function animateWeekSlider(targetWeek, duration = 700) {
    const slider = d3.select("#week-slider");
    const start = +slider.property("value");
    const end = +targetWeek;
    const interp = d3.interpolateNumber(start, end);

    // Drive slider + existing input handler
    return d3.transition()
             .duration(duration)
             .tween("week-slider", () => t => {
                 const v = Math.round(interp(t));
                 slider.property("value", v).dispatch("input");
             })
             .end()
             .catch(() => {});
}

function clampTransform(transform) {
    const [[x0, y0], [x1, y1]] = [[-panOverscrollWest, -panOverscrollNorth], [mapWidth + panOverscrollEast, mapHeight + panOverscrollSouth]];
    const k = transform.k;
    const tx = Math.min(-x0 * k, Math.max(mapWidth - x1 * k, transform.x));
    const ty = Math.min(-y0 * k, Math.max(mapHeight - y1 * k, transform.y));
    return d3.zoomIdentity.translate(tx, ty).scale(k);
}

function zoomToLonLat(lon, lat, scale, duration = 750) {
    const [px, py] = projection([lon, lat]);
    const rawTransform = d3.zoomIdentity
                           .translate(mapWidth / 2, mapHeight / 2)
                           .scale(scale)
                           .translate(-px, -py);
    const targetTransform = clampTransform(rawTransform);

    return svg.transition()
              .duration(duration)
              .call(zoomBehavior.transform, targetTransform)
              .end()
              .catch(() => {});
}

async function restoreGuidedViewForStep(step, duration = 700) {
    if (step === 1) {
        await zoomToLonLat(-85, 5.7, 1.9, duration);
        return;
    }

    if (step === 9 || step === 10) {
        await zoomToLonLat(-71.246, 19.352, 2, duration);
        return;
    }

    await svg.transition()
             .duration(duration)
             .call(zoomBehavior.transform, d3.zoomIdentity)
             .end()
             .catch(() => {});
}

function setControlsLocked(locked) {
    const lockMsg = "Complete narrative steps to unlock this control";

    d3.select("#week-slider").property("disabled", locked).attr("disabled", locked ? "disabled" : null);
    d3.select("#chk-msk").property("disabled", locked).attr("disabled", locked ? "disabled" : null);
    d3.select("#chk-osp").property("disabled", locked).attr("disabled", locked ? "disabled" : null);
    d3.select("#sel-msk").property("disabled", locked).attr("disabled", locked ? "disabled" : null);
    d3.select("#sel-osp").property("disabled", locked).attr("disabled", locked ? "disabled" : null);

    wrapper.classed("controls-locked", locked);

    const slotALabel = getSelectedSpeciesLabel("slotA");
    const slotBLabel = getSelectedSpeciesLabel("slotB");

    d3.select("#week-slider-wrap").attr("title", locked ? lockMsg : "Select observations for a given week");
    d3.select("#chk-msk-wrap").attr("title", locked ? lockMsg : `Toggle ${slotALabel} observations on/off`);
    d3.select("#chk-osp-wrap").attr("title", locked ? lockMsg : `Toggle ${slotBLabel} observations on/off`);
}

function setMapInteractionLocked(locked) {
    isMapInteractionLocked = locked;
    mapInteractionBlocker.style("display", locked ? null : "none");
    if (locked) hideTooltip();
}

function setResetButtonLocked(locked) {
    d3.select("#narr-reset")
      .property("disabled", locked)
      .classed("is-disabled", locked);
}

function setFreeButtonLocked(locked) {
    d3.select("#narr-free").property("disabled", locked);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateMapAnnotation() {
    if (!projection) return Promise.resolve();

    const activeDefs = mapAnnotationDefs.filter(a => activeMapAnnotationIds.includes(a.id));
    const connectorEndScale = 3;

    const annotations = activeDefs.map(a => {
        const [x, y] = projection([a.lon, a.lat]);
        return {
            note: {
                label: a.label,
                title: a.title || undefined,
                wrap: a.wrap ?? 160,
                padding: a.small ? 4 : 10,
                align: a.align ?? "dynamic"
            },
            x, y,
            dx: a.dx, dy: a.dy,
            connector: { end: "dot", endScale: connectorEndScale },
            subject: { radius: 5 }
        };
    });

    const makeAnnotations = d3.annotation()
                              .type(d3.annotationLabel)
                              .annotations(annotations);

    mapAnnotationLayer.selectAll(".annotation-group")
                      .transition().duration(300)
                      .style("opacity", 0)
                      .remove();

    if (!annotations.length) return Promise.resolve();
    const newGroup = mapAnnotationLayer.append("g")
                      .attr("class", "annotation-group")
                      .style("opacity", 0)
                      .call(makeAnnotations);

    // Color-map specific annotation text where requested.
    newGroup.selectAll("g.annotation")
        .each(function(_, i) {
        const color = activeDefs[i]?.textColor;
        if (!color) return;
        d3.select(this)
            .selectAll(".annotation-note-label, .annotation-note-title")
            .style("fill", color);
        });

    mapAnnotationLayer.raise(); // keep annotations above hex grid
    newGroup.transition().duration(300)
            .style("opacity", 1)
            .end()
            .catch(() => {});

}

async function showAnnotationsStaggered(
    { map = activeMapAnnotationIds, sidebar = activeSidebarAnnotationIds } = {},
    delayMs = 250
) {
    activeMapAnnotationIds = map;
    activeSidebarAnnotationIds = sidebar;

    // Sidebar first
    await updateSidebarAnnotation();

    // Then map after delay
    await sleep(delayMs);
    await updateMapAnnotation();
}

function updateSidebarAnnotation() {
    const activeDefs = sidebarAnnotationDefs.filter(a => activeSidebarAnnotationIds.includes(a.id));

    const annotations = activeDefs.map(a => ({
        note: {
            label: a.label,
            title: a.title || undefined,
            wrap: a.wrap ?? 160,
            padding: 10,
            align: "left"
        },
        x: a.x, y: a.y,
        dx: 0, dy: 0
    }));

    const makeAnnotations = d3.annotation()
                              .type(d3.annotationLabel)
                              .disable(["connector", "subject"])
                              .annotations(annotations);

    sidebarAnnotationLayer.selectAll(".annotation-group")
                          .transition().duration(300)
                          .style("opacity", 0)
                          .remove();

    if (!annotations.length) return Promise.resolve();

    const newGroup = sidebarAnnotationLayer.append("g")
                          .attr("class", "annotation-group")
                          .style("opacity", 0)
                          .call(makeAnnotations);

    return newGroup.transition().duration(300)
                   .style("opacity", 1)
                   .end()
                   .catch(() => {});
}

function showAnnotations({ map = activeMapAnnotationIds, sidebar = activeSidebarAnnotationIds } = {}) {
    activeMapAnnotationIds = map;
    activeSidebarAnnotationIds = sidebar;
    return Promise.all([updateMapAnnotation(), updateSidebarAnnotation()]);
}

function hideAnnotations() {
    mapAnnotationLayer.selectAll("*").remove();
    sidebarAnnotationLayer.selectAll("*").remove();
}

// Example step runner: week -> zoom -> annotations
async function runNarrativeStep(step) {
    await animateWeekSlider(step.week, 700);
    await zoomToLonLat(step.lon, step.lat, step.scale, 800);
    await showAnnotationsStaggered({
        sidebar: ["color-scale-note", "hex-presence-note", "hover-note", "agg-info-note"],
        map: ["ex-mississippi-kite", "ex-neither", "ex-osprey", "ex-both", "ex-no-data"]
    }, 2000);
}

function resetVisualization({ keepResetUnlocked = false } = {}) {
    // Reset controls to their initial values.
    selectedWeek = firstWeek;
    d3.select("#week-slider").property("value", selectedWeek);
    d3.select("#week-label").text(`Week ${selectedWeek}`);
    setSpeciesSelection(true, true);
    resetSpeciesSelectsToDefaults();

    const x = d => projection([d.cell_ctr_lon, d.cell_ctr_lat])[0];
    const y = d => projection([d.cell_ctr_lon, d.cell_ctr_lat])[1];
    updateChart(x, y);

    // Reset zoom/pan to identity.
    svg.transition()
       .duration(300)
       .call(zoomBehavior.transform, d3.zoomIdentity);

    // Reset annotations to initial (intro note only, no map annotation).
    showAnnotations({ sidebar: ["intro-note", "guided-int-note"],
                      map: [] });

    d3.select("#narr-forward").text("Start the Tour").property("disabled", false).classed("is-explore", false); // reset button text
    setFreeButtonLocked(false);
    currentStep = 0;

    setControlsLocked(true); // lock out free exploration again
    setMapInteractionLocked(true);
    setResetButtonLocked(!keepResetUnlocked);
}

// Render each species in its own layer so both are visible
function updateChart(x, y) {
    const mskChecked = wrapper.select("#chk-msk").property("checked");
    const ospChecked = wrapper.select("#chk-osp").property("checked");

    const slotA = getSpeciesDataForSlot("slotA");
    const slotB = getSpeciesDataForSlot("slotB");

    const mergedWeek = buildMergedWeekData(slotA, slotB, mskChecked, ospChecked);
    const hexSel = dataLayer.selectAll(".data-hex")
                            .data(mergedWeek, d => d.cell);
    hexSel.exit()
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0)
          .remove();
          // https://d3js.org/d3-ease
    // new circles needed for new data points
    // starting with invisible fill
    const hexEnter = hexSel.enter()
                           .append("path")
                           .attr("class", "data-hex")
                           .attr("d", d => makeHexPath(d.cell_ctr_lon, d.cell_ctr_lat, hexRadiusKm))
                           .attr("stroke", "gainsboro")
                           .attr("stroke-opacity", 0)
                           .attr("fill-opacity", 0);
    // now include circles that were already there AND in new data (so not exited)
    const hexMerged = hexEnter.merge(hexSel)
                              .attr("fill", d => getHexColor(getHexState(d)))
                              .attr("stroke-opacity", d => d.n_checklists > 0 ? 0.3 : 0)
                              .on("pointerenter", (event, d) => showTooltip(event, d))
                              .on("pointermove", (event, d) => showTooltip(event, d))
                              .on("pointerleave", hideTooltip);
    hexMerged.transition()
             .ease(d3.easeCubicOut).duration(150)
             .attr("fill-opacity", d => getHexState(d) === "none" ? 0 : 1)
             .attr("stroke-opacity", d => d.n_checklists > 0 ? 0.3 : 0);
    mapAnnotationLayer.raise(); // keep annotations above hex grid

}

function getHexState(d) {
    const hasSlotA = d.n_detected_slot_a > 0;
    const hasSlotB = d.n_detected_slot_b > 0;

    if (hasSlotA && hasSlotB) return "both";
    if (hasSlotA) return "slotA";
    if (hasSlotB) return "slotB";
    return "none";
}

function getHexColor(state) {
    switch (state) {
        case "slotA": return SLOT_A_COLOR;
        case "slotB": return SLOT_B_COLOR;
        case "both": return BOTH_COLOR;
        default: return "none";
    }
}

function buildMergedWeekData(slotA, slotB, slotAChecked, slotBChecked) {
    const byCell = new Map();

    const sameSpeciesBothSlots = slotA.speciesId === slotB.speciesId;

    function addRows(rows, slotKey, checked, duplicateFromSameSpecies) {
        for (const d of rows) {
        if (!byCell.has(d.cell)) {
            byCell.set(d.cell, {
            cell: d.cell,
            cell_ctr_lat: d.cell_ctr_lat,
            cell_ctr_lon: d.cell_ctr_lon,
            country_code: d.country_code,
            n_detected_slot_a: 0,
            n_detected_slot_b: 0,
            n_checklists: 0,
            n_detected: 0,
            tot_observed: 0
            });
        }
        const row = byCell.get(d.cell);

        const detectedValue = checked ? (d.n_detected || 0) : 0;
        if (slotKey === "slotA") {
            row.n_detected_slot_a = detectedValue;
        } else {
            row.n_detected_slot_b = detectedValue;
        }

        row.n_checklists = Math.max(row.n_checklists, d.n_checklists || 0);
        if (checked && !duplicateFromSameSpecies) {
            row.tot_observed = (row.tot_observed || 0) + (d.tot_observed || 0);
        }

        row.n_detected = Math.max(row.n_detected_slot_a || 0, row.n_detected_slot_b || 0);
        }
    }

    addRows(slotA.weekRows, "slotA", slotAChecked, false);
    addRows(slotB.weekRows, "slotB", slotBChecked, sameSpeciesBothSlots);

    return Array.from(byCell.values());
}

function makeLabels(lat_range, lon_range) {
    labelLayer.selectAll("*").remove();

    const lonValues = d3.range(Math.ceil(lon_range[0] / 10) * 10, lon_range[1] + 1, 10);
    const lonLabels = lonValues.map(lon => {
        const p = projection([lon, lat_range[0]]);
        return p ? { text: `${lon}°`, x: p[0], y: p[1] - lonLabelShift, anchor: "middle" } : null;
    }).filter(Boolean);

    labelLayer.selectAll(".lon-label")
              .data(lonLabels)
              .enter()
              .append("text")
              .attr("class", "graticule-label lon-label")
              .attr("data-x", d => d.x)
              .attr("data-y", d => d.y)
              .attr("text-anchor", "middle")
              .text(d => d.text);

    const latValues = d3.range(Math.ceil(lat_range[0] / 10) * 10, lat_range[1] + 1, 10);
    const latLabels = latValues.map(lat => {
        const p = projection([lon_range[0], lat]);
        return p ? { text: `${lat}°`, x: p[0] + latLabelShift, y: p[1] - 5, anchor: "end" } : null;
    }).filter(Boolean);

    labelLayer.selectAll(".lat-label")
              .data(latLabels)
              .enter()
              .append("text")
              .attr("class", "graticule-label lat-label")
              .attr("data-x", d => d.x)
              .attr("data-y", d => d.y)
              .attr("text-anchor", "end")
              .text(d => d.text);
}

function updateLabelTransform() {
    const k = currentTransform.k || 1;
    labelLayer.selectAll("text")
              .attr("transform", function () {
                  const x = +this.getAttribute("data-x");
                  const y = +this.getAttribute("data-y");
                  return `translate(${currentTransform.applyX(x)}, ${currentTransform.applyY(y)})`;
    });
}

function drawMap(world) {
    mapLayer.append("path")
            .datum(graticule())
            .attr("class", "graticule")
            .attr("d", path);

    const countries = topojson.feature(world, world.objects.countries).features;

    mapLayer.append("g")
            .selectAll("path")
            .data(countries)
            .enter()
            .append("path")
            .attr("class", "map-path")
            .attr("d", path);
}

