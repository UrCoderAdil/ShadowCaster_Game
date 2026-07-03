/* ═══════════════════════════════════════════════════════
   L-System — String-based generator for procedural plant structures
   ═══════════════════════════════════════════════════════ */

/**
 * An L-System rule set definition.
 * @typedef {Object} LSystemDef
 * @property {string} axiom - Starting string
 * @property {Object<string, string|string[]>} rules - Production rules. If array, random choice.
 * @property {number} angle - Default turning angle in degrees
 * @property {number} [iterations=4] - How many times to apply rules
 */

/**
 * Generate an L-System string by applying production rules.
 * @param {LSystemDef} def
 * @returns {string}
 */
export function generateLSystem(def) {
  let current = def.axiom;
  const iterations = def.iterations ?? 4;

  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const char of current) {
      if (def.rules[char]) {
        const rule = def.rules[char];
        if (Array.isArray(rule)) {
          // Stochastic: pick a random rule
          next += rule[Math.floor(Math.random() * rule.length)];
        } else {
          next += rule;
        }
      } else {
        next += char;
      }
    }
    current = next;
  }

  return current;
}

/**
 * Interpret an L-System string into drawing commands.
 *
 * Characters:
 * - F : draw forward
 * - f : move forward without drawing
 * - + : turn right by angle
 * - - : turn left by angle
 * - [ : push state (branch start)
 * - ] : pop state (branch end)
 * - L : draw leaf
 * - W : draw flower
 * - > : decrease line width
 * - < : increase line width
 *
 * @param {string} str - L-system string
 * @param {number} stepSize - Length of each F step
 * @param {number} angle - Turning angle in degrees
 * @returns {Array} Array of command objects
 */
export function interpretLSystem(str, stepSize, angle) {
  const commands = [];
  const angleRad = (angle * Math.PI) / 180;

  for (const char of str) {
    switch (char) {
      case 'F':
        commands.push({ type: 'draw', length: stepSize });
        break;
      case 'f':
        commands.push({ type: 'move', length: stepSize });
        break;
      case '+':
        commands.push({ type: 'turn', angle: angleRad });
        break;
      case '-':
        commands.push({ type: 'turn', angle: -angleRad });
        break;
      case '[':
        commands.push({ type: 'push' });
        break;
      case ']':
        commands.push({ type: 'pop' });
        break;
      case 'L':
        commands.push({ type: 'leaf' });
        break;
      case 'W':
        commands.push({ type: 'flower' });
        break;
      case '>':
        commands.push({ type: 'thin' });
        break;
      case '<':
        commands.push({ type: 'thicken' });
        break;
    }
  }

  return commands;
}

// ─── Pre-defined plant L-System definitions ───

export const PLANT_LSYSTEMS = {
  // Simple flower / herb
  daisy: {
    axiom: 'F',
    rules: {
      'F': 'F[+FL][-FL]F',
    },
    angle: 25,
    iterations: 3,
  },

  tulip: {
    axiom: 'F',
    rules: {
      'F': 'FF[+F>FL][-F>FL]',
    },
    angle: 30,
    iterations: 3,
  },

  sunflower: {
    axiom: 'F',
    rules: {
      'F': 'FF',
      'X': 'F[+X]F[-X]+X',
    },
    angle: 20,
    iterations: 4,
  },

  // Trees
  oak: {
    axiom: 'X',
    rules: {
      'X': ['F[+X>L][-X>L]FX', 'F[+X]F[-X>L]+X', 'F[-X>L]F[+X]FX'],
      'F': 'FF',
    },
    angle: 22,
    iterations: 4,
  },

  // Fern (classic)
  fern: {
    axiom: 'X',
    rules: {
      'X': 'F+[[X]-X]-F[-FX]+X',
      'F': 'FF',
    },
    angle: 25,
    iterations: 4,
  },

  // Mushroom (short with cap represented by flower)
  mushroom: {
    axiom: 'FW',
    rules: {
      'F': 'F>F',
    },
    angle: 5,
    iterations: 2,
  },

  // Vine (long winding)
  vine: {
    axiom: 'F',
    rules: {
      'F': 'F[+F>L]F[-F>L]F',
    },
    angle: 15,
    iterations: 3,
  },

  // Cactus
  cactus: {
    axiom: 'F',
    rules: {
      'F': 'FF[+F][-F]',
    },
    angle: 90,
    iterations: 2,
  },

  // Coral (branching, organic)
  coral: {
    axiom: 'F',
    rules: {
      'F': ['F[+F]F[-F]F', 'F[+F][-F]F', 'FF[+F][-F]'],
    },
    angle: 25,
    iterations: 3,
  },

  // Crystal shard (geometric)
  crystal_shard: {
    axiom: 'F',
    rules: {
      'F': 'F[+F][-F]',
    },
    angle: 45,
    iterations: 3,
  },

  // Kelp (tall wavy)
  kelp: {
    axiom: 'F',
    rules: {
      'F': 'F[+FL]F[-FL]F',
    },
    angle: 12,
    iterations: 4,
  },

  // Default fallback
  default: {
    axiom: 'F',
    rules: {
      'F': 'F[+F][-F]F',
    },
    angle: 25,
    iterations: 3,
  },
};

/**
 * Get the L-system definition for a plant species.
 */
export function getPlantLSystem(speciesId) {
  return PLANT_LSYSTEMS[speciesId] || PLANT_LSYSTEMS.default;
}
