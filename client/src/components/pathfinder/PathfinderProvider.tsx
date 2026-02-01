import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { spotlightTourSteps } from "../../lib/pathfinder-config";

const STORAGE_KEY = "prism-pathfinder-completed";

interface PathfinderContextValue {
  tourCompleted: boolean;
  startTour: () => void;
}

const PathfinderContext = createContext<PathfinderContextValue>({
  tourCompleted: false,
  startTour: () => {},
});

export function PathfinderProvider({ children }: { children: ReactNode }) {
  const [tourCompleted, setTourCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const startTour = useCallback(() => {
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.75)",
      stagePadding: 8,
      stageRadius: 10,
      popoverOffset: 12,
      steps: spotlightTourSteps,
      onDestroyStarted: () => {
        driverInstance.destroy();
        setTourCompleted(true);
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // localStorage unavailable
        }
      },
    });

    driverInstance.drive();
  }, []);

  // Auto-start tour on first visit
  useEffect(() => {
    if (tourCompleted) return;

    const timer = setTimeout(() => {
      startTour();
    }, 500);

    return () => clearTimeout(timer);
  }, [tourCompleted, startTour]);

  return (
    <PathfinderContext.Provider value={{ tourCompleted, startTour }}>
      {children}
    </PathfinderContext.Provider>
  );
}

export function usePathfinder(): PathfinderContextValue {
  return useContext(PathfinderContext);
}
