import { motion } from "framer-motion";

/**
 * SignalFlowHero - A metaphorical visual component showing continuous signal flow
 * 
 * Purpose: Communicate "always-on intelligence" and "federated signals converging"
 * Behavior: Slow, constant motion - no interaction, no metrics, no labels
 * Placement: Homepage hero, Intelligence Hub overview
 */
export default function SignalFlowHero() {
  return (
    <div className="relative w-full h-[400px] overflow-hidden bg-gradient-to-b from-[#0d1117] to-[#161b22] rounded-xl border border-[#21262d]">
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #58a6ff 1px, transparent 1px),
            linear-gradient(to bottom, #58a6ff 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Animated signal paths */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Gradient for signal lines */}
          <linearGradient id="signalGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity="0" />
            <stop offset="50%" stopColor="#58a6ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="signalGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3fb950" stopOpacity="0" />
            <stop offset="50%" stopColor="#3fb950" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3fb950" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="signalGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a371f7" stopOpacity="0" />
            <stop offset="50%" stopColor="#a371f7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a371f7" stopOpacity="0" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Signal path 1 - Top curve */}
        <motion.path
          d="M -100 80 Q 200 120 400 100 T 900 80"
          fill="none"
          stroke="url(#signalGradient1)"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.4, 0.6, 1],
          }}
        />

        {/* Signal path 2 - Middle wave */}
        <motion.path
          d="M -100 200 Q 150 160 300 200 T 500 180 T 700 200 T 900 180"
          fill="none"
          stroke="url(#signalGradient2)"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 0.5, 0.5, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.4, 0.6, 1],
            delay: 2,
          }}
        />

        {/* Signal path 3 - Bottom curve */}
        <motion.path
          d="M -100 320 Q 250 280 400 300 T 900 320"
          fill="none"
          stroke="url(#signalGradient3)"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 0.4, 0.4, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.4, 0.6, 1],
            delay: 4,
          }}
        />

        {/* Convergence point - center glow */}
        <motion.circle
          cx="400"
          cy="200"
          r="60"
          fill="none"
          stroke="#58a6ff"
          strokeWidth="1"
          opacity="0.1"
          animate={{
            r: [50, 70, 50],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="400"
          cy="200"
          r="30"
          fill="none"
          stroke="#58a6ff"
          strokeWidth="1"
          opacity="0.2"
          animate={{
            r: [25, 40, 25],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Floating data nodes */}
        {[
          { cx: 120, cy: 100, delay: 0 },
          { cx: 680, cy: 90, delay: 3 },
          { cx: 200, cy: 280, delay: 1.5 },
          { cx: 600, cy: 300, delay: 4.5 },
          { cx: 350, cy: 150, delay: 2 },
          { cx: 450, cy: 250, delay: 5 },
        ].map((node, i) => (
          <motion.circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r="4"
            fill="#58a6ff"
            opacity="0.3"
            animate={{
              opacity: [0.1, 0.4, 0.1],
              r: [3, 5, 3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: node.delay,
            }}
          />
        ))}
      </svg>

      {/* Anchoring copy */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-transparent">
        <motion.p 
          className="text-sm text-[#8b949e] text-center max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Continuous signal flow across federated sources, governed and interpreted in real time.
        </motion.p>
      </div>

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0d1117]/50 via-transparent to-[#0d1117]/50" />
    </div>
  );
}
