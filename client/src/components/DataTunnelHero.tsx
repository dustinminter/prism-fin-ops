import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { useLocation } from "wouter";

// Data source definitions with speed multipliers
const DATA_SOURCES = [
  { id: "usaspending", name: "USAspending.gov", color: "#58a6ff", description: "Federal contract and grant awards", speedMultiplier: 1.5, trailMultiplier: 1.2 },
  { id: "cip", name: "Capital Investment Plan", color: "#3fb950", description: "FY26-FY30 planned investments", speedMultiplier: 0.6, trailMultiplier: 0.8 },
  { id: "cloud", name: "Cloud Billing", color: "#a371f7", description: "AWS/Azure/GCP consumption", speedMultiplier: 1.0, trailMultiplier: 1.0 },
] as const;

type DataSourceId = typeof DATA_SOURCES[number]["id"];

// Configuration optimized for PRISM PRISM Dark theme
const params = {
  // Colors - PRISM Dark theme (transparent background for overlay)
  colorBg: "#0d1117",
  colorLine: "#484f58",
  colorLineHover: "#6e7681",

  // Signal Colors - PRISM accent colors
  colorSignal: "#58a6ff", // Primary accent
  useColor2: true,
  colorSignal2: "#3fb950", // Success/positive
  useColor3: true,
  colorSignal3: "#a371f7", // Purple accent

  // Global Transform
  lineCount: 60,
  globalRotation: 0,
  positionX: 0,
  positionY: 0,

  // Geometry
  spreadHeight: 25,
  spreadDepth: 0,
  curveLength: 50,
  straightLength: 100,
  curvePower: 0.8,

  // Line Animation
  waveSpeed: 2.0,
  waveHeight: 0.18,
  lineOpacity: 0.8,

  // Signals
  signalCount: 100,
  speedGlobal: 0.3,
  trailLength: 5,

  // Visuals (Bloom)
  bloomStrength: 3.5,
  bloomRadius: 0.6,
};

const CONSTANTS = {
  segmentCount: 150,
};

interface DataTunnelHeroProps {
  className?: string;
  onSourceClick?: (sourceId: DataSourceId) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  source: typeof DATA_SOURCES[number] | null;
}

interface ParticleCounts {
  usaspending: number;
  cip: number;
  cloud: number;
}

interface SparklineData {
  usaspending: number[];
  cip: number[];
  cloud: number[];
}

const SPARKLINE_MAX_POINTS = 20;
const SPARKLINE_INTERVAL = 500; // ms between updates

export function DataTunnelHero({ className = "", onSourceClick }: DataTunnelHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const signalMeshesRef = useRef<THREE.Line[]>([]);
  const signalSourcesRef = useRef<Map<THREE.Line, DataSourceId>>(new Map());
  const [, navigate] = useLocation();

  // Particle count tracking
  const [particleCounts, setParticleCounts] = useState<ParticleCounts>({
    usaspending: 0,
    cip: 0,
    cloud: 0,
  });
  const particleCountsRef = useRef<ParticleCounts>({ usaspending: 0, cip: 0, cloud: 0 });

  // Sparkline data for mini-charts
  const [sparklineData, setSparklineData] = useState<SparklineData>({
    usaspending: [],
    cip: [],
    cloud: [],
  });

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    source: null,
  });

  // Handle click navigation to dashboard with source filter
  const handleSourceClick = useCallback((sourceId: DataSourceId) => {
    if (onSourceClick) {
      onSourceClick(sourceId);
    } else {
      navigate(`/dashboard?source=${sourceId}`);
    }
  }, [onSourceClick, navigate]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(params.colorBg);
    scene.fog = new THREE.FogExp2(params.colorBg, 0.002);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 0, 90);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Set up raycaster with larger threshold for line detection
    raycasterRef.current.params.Line = { threshold: 2 };

    // Group for content
    const contentGroup = new THREE.Group();
    params.positionX = (params.curveLength - params.straightLength) / 2;
    contentGroup.position.set(params.positionX, params.positionY, 0);
    scene.add(contentGroup);

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Path calculation
    function getPathPoint(
      t: number,
      lineIndex: number,
      time: number
    ): THREE.Vector3 {
      const totalLen = params.curveLength + params.straightLength;
      const currentX = -params.curveLength + t * totalLen;

      let y = 0;
      const z = 0;
      const spreadFactor = (lineIndex / params.lineCount - 0.5) * 2;

      if (currentX < 0) {
        const ratio = (currentX + params.curveLength) / params.curveLength;
        let shapeFactor = (Math.cos(ratio * Math.PI) + 1) / 2;
        shapeFactor = Math.pow(shapeFactor, params.curvePower);

        y = spreadFactor * params.spreadHeight * shapeFactor;

        const waveFactor = shapeFactor;
        const wave =
          Math.sin(time * params.waveSpeed + currentX * 0.1 + lineIndex) *
          params.waveHeight *
          waveFactor;
        y += wave;
      }

      return new THREE.Vector3(currentX, y, z);
    }

    // Assign data sources to line groups
    function getSourceForLine(lineIndex: number): DataSourceId {
      const third = params.lineCount / 3;
      if (lineIndex < third) return "usaspending";
      if (lineIndex < third * 2) return "cip";
      return "cloud";
    }

    // Materials
    const bgMaterial = new THREE.LineBasicMaterial({
      color: params.colorLine,
      transparent: true,
      opacity: params.lineOpacity,
      depthWrite: false,
    });

    const signalMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const signalColorObj1 = new THREE.Color(params.colorSignal);
    const signalColorObj2 = new THREE.Color(params.colorSignal2);
    const signalColorObj3 = new THREE.Color(params.colorSignal3);

    function pickSignalColor(sourceId: DataSourceId): THREE.Color {
      switch (sourceId) {
        case "usaspending": return signalColorObj1.clone();
        case "cip": return signalColorObj2.clone();
        case "cloud": return signalColorObj3.clone();
        default: return signalColorObj1.clone();
      }
    }

    // Create lines
    const backgroundLines: THREE.Line[] = [];
    for (let i = 0; i < params.lineCount; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(CONSTANTS.segmentCount * 3);
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const line = new THREE.Line(geometry, bgMaterial.clone());
      line.userData = { id: i, sourceId: getSourceForLine(i) };
      line.renderOrder = 0;
      contentGroup.add(line);
      backgroundLines.push(line);
    }

    // Create signals
    interface Signal {
      mesh: THREE.Line;
      laneIndex: number;
      speed: number;
      progress: number;
      history: THREE.Vector3[];
      assignedColor: THREE.Color;
      sourceId: DataSourceId;
      speedMultiplier: number;
      trailMultiplier: number;
    }

    // Get source config for speed/trail multipliers
    function getSourceConfig(sourceId: DataSourceId) {
      return DATA_SOURCES.find(s => s.id === sourceId) || DATA_SOURCES[0];
    }

    const signals: Signal[] = [];
    const maxTrail = 150;
    signalMeshesRef.current = [];
    signalSourcesRef.current.clear();

    for (let i = 0; i < params.signalCount; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(maxTrail * 3);
      const colors = new Float32Array(maxTrail * 3);

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mesh = new THREE.Line(geometry, signalMaterial);
      mesh.frustumCulled = false;
      mesh.renderOrder = 1;
      contentGroup.add(mesh);

      const laneIndex = Math.floor(Math.random() * params.lineCount);
      const sourceId = getSourceForLine(laneIndex);
      const sourceConfig = getSourceConfig(sourceId);

      mesh.userData = { sourceId };
      signalMeshesRef.current.push(mesh);
      signalSourcesRef.current.set(mesh, sourceId);

      signals.push({
        mesh,
        laneIndex,
        speed: 0.2 + Math.random() * 0.5,
        progress: Math.random(),
        history: [],
        assignedColor: pickSignalColor(sourceId),
        sourceId,
        speedMultiplier: sourceConfig.speedMultiplier,
        trailMultiplier: sourceConfig.trailMultiplier,
      });
    }

    // Initialize particle counts
    const countBySource: ParticleCounts = { usaspending: 0, cip: 0, cloud: 0 };
    signals.forEach(sig => {
      countBySource[sig.sourceId]++;
    });
    particleCountsRef.current = { ...countBySource };
    setParticleCounts({ ...countBySource });

    // Animation
    const clock = new THREE.Clock();

    function animate() {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Update lines
      backgroundLines.forEach((line) => {
        const positions = line.geometry.attributes.position
          .array as Float32Array;
        const lineId = line.userData.id as number;
        for (let j = 0; j < CONSTANTS.segmentCount; j++) {
          const t = j / (CONSTANTS.segmentCount - 1);
          const vec = getPathPoint(t, lineId, time);
          positions[j * 3] = vec.x;
          positions[j * 3 + 1] = vec.y;
          positions[j * 3 + 2] = vec.z;
        }
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Update signals with source-specific speeds
      signals.forEach((sig) => {
        // Apply source-specific speed multiplier
        sig.progress += sig.speed * 0.005 * params.speedGlobal * sig.speedMultiplier;

        if (sig.progress > 1.0) {
          sig.progress = 0;
          sig.laneIndex = Math.floor(Math.random() * params.lineCount);
          sig.sourceId = getSourceForLine(sig.laneIndex);
          const sourceConfig = getSourceConfig(sig.sourceId);
          sig.speedMultiplier = sourceConfig.speedMultiplier;
          sig.trailMultiplier = sourceConfig.trailMultiplier;
          sig.history = [];
          sig.assignedColor = pickSignalColor(sig.sourceId);
          sig.mesh.userData.sourceId = sig.sourceId;
          signalSourcesRef.current.set(sig.mesh, sig.sourceId);
        }

        const pos = getPathPoint(sig.progress, sig.laneIndex, time);
        sig.history.push(pos);

        // Apply source-specific trail length multiplier
        const effectiveTrailLength = Math.round(params.trailLength * sig.trailMultiplier);
        if (sig.history.length > effectiveTrailLength + 1) {
          sig.history.shift();
        }

        const positions = sig.mesh.geometry.attributes.position
          .array as Float32Array;
        const colors = sig.mesh.geometry.attributes.color.array as Float32Array;

        const drawCount = Math.max(1, effectiveTrailLength);
        const currentLen = sig.history.length;

        for (let i = 0; i < drawCount; i++) {
          let index = currentLen - 1 - i;
          if (index < 0) index = 0;

          const p = sig.history[index] || new THREE.Vector3();

          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;

          let alpha = 1;
          if (effectiveTrailLength > 0) {
            alpha = Math.max(0, 1 - i / effectiveTrailLength);
          }

          colors[i * 3] = sig.assignedColor.r * alpha;
          colors[i * 3 + 1] = sig.assignedColor.g * alpha;
          colors[i * 3 + 2] = sig.assignedColor.b * alpha;
        }

        sig.mesh.geometry.setDrawRange(0, drawCount);
        sig.mesh.geometry.attributes.position.needsUpdate = true;
        sig.mesh.geometry.attributes.color.needsUpdate = true;
      });

      composer.render();
    }

    animate();

    // Sparkline tracking - update particle counts periodically
    const sparklineInterval = setInterval(() => {
      // Count active particles in each "visible" portion of the tunnel
      const visibleCounts: ParticleCounts = { usaspending: 0, cip: 0, cloud: 0 };
      signals.forEach((sig) => {
        // Count particles that are in the "visible" part (progress 0.2 - 0.9)
        if (sig.progress > 0.2 && sig.progress < 0.9) {
          visibleCounts[sig.sourceId]++;
        }
      });

      particleCountsRef.current = { ...visibleCounts };
      setParticleCounts({ ...visibleCounts });

      // Update sparkline data
      setSparklineData((prev) => {
        const newData: SparklineData = {
          usaspending: [...prev.usaspending, visibleCounts.usaspending].slice(-SPARKLINE_MAX_POINTS),
          cip: [...prev.cip, visibleCounts.cip].slice(-SPARKLINE_MAX_POINTS),
          cloud: [...prev.cloud, visibleCounts.cloud].slice(-SPARKLINE_MAX_POINTS),
        };
        return newData;
      });
    }, SPARKLINE_INTERVAL);

    // Mouse move handler for hover detection
    const handleMouseMove = (event: MouseEvent) => {
      if (!container || !cameraRef.current) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert to normalized device coordinates
      mouseRef.current.x = (x / rect.width) * 2 - 1;
      mouseRef.current.y = -(y / rect.height) * 2 + 1;

      // Raycast against signal meshes
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Check signals first (they're more visible)
      const signalIntersects = raycasterRef.current.intersectObjects(signalMeshesRef.current, false);
      
      if (signalIntersects.length > 0) {
        const hitMesh = signalIntersects[0].object as THREE.Line;
        const sourceId = hitMesh.userData.sourceId as DataSourceId;
        const source = DATA_SOURCES.find(s => s.id === sourceId);
        
        if (source) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left + 15,
            y: event.clientY - rect.top - 10,
            source,
          });
          container.style.cursor = "pointer";
          return;
        }
      }

      // Check background lines
      const lineIntersects = raycasterRef.current.intersectObjects(backgroundLines, false);
      
      if (lineIntersects.length > 0) {
        const hitLine = lineIntersects[0].object as THREE.Line;
        const sourceId = hitLine.userData.sourceId as DataSourceId;
        const source = DATA_SOURCES.find(s => s.id === sourceId);
        
        if (source) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left + 15,
            y: event.clientY - rect.top - 10,
            source,
          });
          container.style.cursor = "pointer";
          
          // Highlight the hovered line
          (hitLine.material as THREE.LineBasicMaterial).color.setStyle(params.colorLineHover);
          (hitLine.material as THREE.LineBasicMaterial).opacity = 1;
          return;
        }
      }

      // Reset if no intersection
      setTooltip(prev => ({ ...prev, visible: false }));
      container.style.cursor = "default";
      
      // Reset line colors
      backgroundLines.forEach(line => {
        (line.material as THREE.LineBasicMaterial).color.setStyle(params.colorLine);
        (line.material as THREE.LineBasicMaterial).opacity = params.lineOpacity;
      });
    };

    const handleMouseLeave = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
      if (container) {
        container.style.cursor = "default";
      }
      // Reset line colors
      backgroundLines.forEach(line => {
        (line.material as THREE.LineBasicMaterial).color.setStyle(params.colorLine);
        (line.material as THREE.LineBasicMaterial).opacity = params.lineOpacity;
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(sparklineInterval);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      // Dispose geometries and materials
      backgroundLines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      signals.forEach((sig) => {
        sig.mesh.geometry.dispose();
      });
      bgMaterial.dispose();
      signalMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${className}`}
      style={{ minHeight: "400px" }}
    >
      {/* Tooltip */}
      {tooltip.visible && tooltip.source && (
        <div
          className="absolute pointer-events-none z-50 animate-in fade-in duration-150"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateY(-100%)",
          }}
        >
          <div 
            className="px-3 py-2 rounded-lg shadow-xl border backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(22, 27, 34, 0.95)",
              borderColor: tooltip.source.color,
              borderWidth: "1px",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: tooltip.source.color }}
              />
              <span 
                className="font-semibold text-sm"
                style={{ color: tooltip.source.color }}
              >
                {tooltip.source.name}
              </span>
            </div>
            <p className="text-xs text-gray-400 max-w-[200px]">
              {tooltip.source.description}
            </p>
          </div>
          {/* Arrow */}
          <div 
            className="absolute left-4 bottom-0 w-0 h-0 transform translate-y-full"
            style={{
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `6px solid ${tooltip.source.color}`,
            }}
          />
        </div>
      )}

      {/* Enhanced Legend with Particle Counts, Sparklines, and Click Navigation */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        {DATA_SOURCES.map((source) => {
          const count = particleCounts[source.id];
          const sparkData = sparklineData[source.id];
          const maxSparkValue = Math.max(...sparkData, 1);

          return (
            <button
              key={source.id}
              onClick={() => handleSourceClick(source.id)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer group"
              style={{
                backgroundColor: "rgba(22, 27, 34, 0.85)",
                border: `1px solid ${source.color}40`,
              }}
              title={`Click to filter dashboard by ${source.name}`}
            >
              {/* Color indicator with pulse animation */}
              <div className="relative">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                {count > 0 && (
                  <div
                    className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-50"
                    style={{ backgroundColor: source.color }}
                  />
                )}
              </div>

              {/* Source name */}
              <span className="text-gray-300 group-hover:text-white transition-colors min-w-[100px] text-left">
                {source.name}
              </span>

              {/* Mini sparkline chart */}
              <div className="w-16 h-4 flex items-end gap-px">
                {sparkData.length > 0 ? (
                  sparkData.map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${Math.max(2, (value / maxSparkValue) * 100)}%`,
                        backgroundColor: i === sparkData.length - 1
                          ? source.color
                          : `${source.color}60`,
                        opacity: 0.3 + (i / sparkData.length) * 0.7,
                      }}
                    />
                  ))
                ) : (
                  // Placeholder bars while loading
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: "30%",
                        backgroundColor: `${source.color}30`,
                      }}
                    />
                  ))
                )}
              </div>

              {/* Particle count badge */}
              <div
                className="min-w-[28px] text-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                style={{
                  backgroundColor: `${source.color}20`,
                  color: source.color,
                }}
              >
                {count}
              </div>

              {/* Click indicator arrow */}
              <svg
                className="w-3 h-3 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}

        {/* Total signals indicator */}
        <div
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] mt-1"
          style={{ backgroundColor: "rgba(22, 27, 34, 0.6)" }}
        >
          <span className="text-gray-500">Total Active:</span>
          <span className="font-mono text-gray-300">
            {particleCounts.usaspending + particleCounts.cip + particleCounts.cloud}
          </span>
          <span className="text-gray-500">signals</span>
        </div>
      </div>
    </div>
  );
}

export default DataTunnelHero;
