# 🐦 PSO Visual Guide

**An interactive, beginner-friendly website for learning Particle Swarm Optimization (PSO)**

Built for the Soft Computing Lab — inspired by Kennedy & Eberhart (1995).

---

## 🌐 How to Run

> **No installation, no build step, no server required.**

1. Clone or download this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

```bash
# Clone
git clone https://github.com/your-username/soft-computing.git
cd soft-computing
```

---

## 📁 File Structure

```
soft-computing/
│
├── index.html          ← Main single-page PSO website
│
├── css/
│   └── pso-site.css    ← Full design system (dark theme, layout, components)
│
├── js/
│   ├── pso.js          ← Hero canvas · PSO engine · Live calc · Quiz
│   ├── math-parser.js  ← Safe math expression compiler (for custom formulas)
│   └── quiz.js         ← Reusable quiz runner (optional helper)
│
└── README.md
```

---

## 🎯 Features

### Five-Section Single-Page Layout

| Section | Content |
|---------|---------|
| **Hero** | Full-screen live PSO swarm chasing your cursor, animated particle trails, real-time stats |
| **01 · Concept** | Bird-to-math analogy, 3 animated concept cards (Inertia, Memory, Social), vs Gradient Descent |
| **02 · Equation** | Colour-coded velocity equation with hover tooltips; live slider-based calculation demo |
| **03 · Algorithm** | Pseudocode + 6-step plain-English walkthrough; stopping criteria cards |
| **04 · Playground** | Full interactive PSO visualizer (see below) |
| **05 · Quiz** | 7 concept-check questions with instant feedback and explanations |

### Interactive Playground Controls

**Benchmark Functions (8 total):**
- 🔵 Sphere — `x² + y²` (unimodal, easy)
- 🌊 Rastrigin — multimodal with ~100 local minima
- 🌪 Ackley — steep central funnel
- 🍌 Rosenbrock — curved "banana valley"
- 📍 Booth — simple, verifiable by hand: min at (1,3)
- 🏔 Himmelblau — 4 symmetric global minima
- ❄️ Schwefel — highly deceptive traps
- ✏️ **Custom Formula** — enter any `f(x, y)` with custom domain

**Parameter Tuning:**
| Control | Range | Effect |
|---------|-------|--------|
| Swarm Size N | 3 – 60 | Number of particles |
| Inertia w | 0 – 1.4 | Exploration vs exploitation |
| Cognitive c₁ | 0 – 3 | Personal best attraction |
| Social c₂ | 0 – 3 | Global best attraction |
| Max Iterations | 10 – 200 | When to stop |
| Speed | 1× – 10× | Animation playback speed |

**Preset Configurations:**
- 🗺 Explorer — high w, balanced social (wide area search)
- 🏃 Greedy — low w, strong social (fast convergence)
- ⚖ Balanced — Clerc-Kennedy constriction values (w=0.72, c₁=c₂=1.49)
- 🧍 Loner — c₂=0 (pure personal, no social influence)

**Visualization Tabs:**
- **Contour Map** — colour heatmap (blue=low, red=high) with particle trails, velocity arrows, pBest markers, gBest star + shockwave
- **Convergence Chart** — gBest fitness over iterations
- **Particle Table** — full position, velocity, and fitness data for every particle

**Playback:**
- ▶ Play — continuous animation
- ⏸ Pause — freeze at current state
- ⏭ Step — advance exactly one sub-step (Eval → pBest → gBest → Velocity → Position)
- ↺ Reset — reinitialise swarm with current parameters
- Click anywhere on the canvas to **spawn an extra particle**

**Boundary Modes:**
- Clamp — stop at boundary
- Bounce — reflect velocity at boundary
- Wrap — periodic / torus topology

**Optimization Direction:** Minimize or Maximize any function.

---

## 🧮 Algorithm Reference

### PSO Velocity Update (Standard)

```
v(t+1) = w·v(t)                    ← Inertia
         + c1·r1·(pbest - x(t))    ← Cognitive
         + c2·r2·(gbest - x(t))    ← Social

x(t+1) = x(t) + v(t+1)            ← Position update
```

| Symbol | Meaning | Typical value |
|--------|---------|---------------|
| w | Inertia weight | 0.4 – 0.9 |
| c₁ | Cognitive coefficient | 1.5 – 2.0 |
| c₂ | Social coefficient | 1.5 – 2.0 |
| r₁, r₂ | Uniform random in [0,1] | redrawn each iteration |
| pbest | Particle's personal best position | stored per particle |
| gbest | Best position found by any particle | shared across swarm |

### Hand-Check Example (Booth Function)

Booth: `f(x,y) = (x+2y-7)² + (2x+y-5)²`  
Known global minimum: **f(1, 3) = 0**

After running the playground with the Booth preset, `statGBestPos` should converge to approximately `(1.000, 3.000)` and `statGBestVal ≈ 0.000`.

---

## 🛠 Custom Formula Syntax

Supported operators and functions in the custom formula input:

```
Operators : + - * / ^ (power)
Functions : sin, cos, tan, sqrt, abs, exp, log, log2, log10
Constants : pi, e
Variables : x, y
```

**Examples:**
```
sin(x) * cos(y)
x^4 - 16*x^2 + 5*x
(x^2 + y - 11)^2 + (x + y^2 - 5)^2
sqrt(abs(x+y)) - sqrt(abs(x-y))
```

---

## 📚 Background & References

- Kennedy, J. & Eberhart, R. (1995). *Particle swarm optimization*. Proceedings of ICNN.
- Clerc, M. & Kennedy, J. (2002). *The particle swarm — explosion, stability, and convergence in a multidimensional complex space*. IEEE TEC, 6(1).
- Benchmark functions reference: Molga, M. & Smutnicki, C. (2005). *Test functions for optimization needs*.

---

## 📄 License

MIT License — free to use, modify, and distribute with attribution.
