import React, { useMemo } from 'react';
import { Planet } from './Planet';
import * as THREE from 'three';

interface PlanetConfig {
  id: string;
  position: [number, number, number];
  radius: number;
  mass: number;
  seed: number;
}

// Shared configuration for planet generation
const PLANET_CONFIG = {
  seed: 12345,
  // Small planets (moons) - close range
  small: { count: 12, minDist: 20, maxDist: 80, minRadius: 2, maxRadius: 5 },
  // Medium planets - mid range
  medium: { count: 8, minDist: 80, maxDist: 200, minRadius: 6, maxRadius: 15 },
  // Large planets - far range
  large: { count: 5, minDist: 200, maxDist: 400, minRadius: 18, maxRadius: 35 },
  // Giant planets - very far
  giant: { count: 3, minDist: 400, maxDist: 700, minRadius: 40, maxRadius: 60 },
};

// Seeded random generator
const createRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

export const PlanetSystem: React.FC = () => {
  const planets = useMemo(() => {
    const planetConfigs: PlanetConfig[] = [];
    const random = createRandom(PLANET_CONFIG.seed);

    const generatePlanets = (
      config: { count: number; minDist: number; maxDist: number; minRadius: number; maxRadius: number },
      startId: number
    ) => {
      for (let i = 0; i < config.count; i++) {
        const distance = config.minDist + random() * (config.maxDist - config.minDist);
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);

        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);

        const radius = config.minRadius + random() * (config.maxRadius - config.minRadius);
        const mass = radius * radius;

        planetConfigs.push({
          id: `planet-${startId + i}`,
          position: [x, y, z],
          radius,
          mass,
          seed: startId + i,
        });
      }
    };

    generatePlanets(PLANET_CONFIG.small, 0);
    generatePlanets(PLANET_CONFIG.medium, 100);
    generatePlanets(PLANET_CONFIG.large, 200);
    generatePlanets(PLANET_CONFIG.giant, 300);

    return planetConfigs;
  }, []);

  return (
    <>
      {planets.map((planet) => (
        <Planet
          key={planet.id}
          position={planet.position}
          radius={planet.radius}
          seed={planet.seed}
        />
      ))}
    </>
  );
};

// Export planet configurations for use in Player gravity calculations and minimap
export const usePlanetConfigs = (): Array<{ position: THREE.Vector3; radius: number; mass: number; seed: number }> => {
  return useMemo(() => {
    const planetConfigs: Array<{ position: THREE.Vector3; radius: number; mass: number; seed: number }> = [];
    const random = createRandom(PLANET_CONFIG.seed);

    const generatePlanets = (
      config: { count: number; minDist: number; maxDist: number; minRadius: number; maxRadius: number },
      startId: number
    ) => {
      for (let i = 0; i < config.count; i++) {
        const distance = config.minDist + random() * (config.maxDist - config.minDist);
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);

        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);

        const radius = config.minRadius + random() * (config.maxRadius - config.minRadius);
        const mass = radius * radius;

        planetConfigs.push({
          position: new THREE.Vector3(x, y, z),
          radius,
          mass,
          seed: startId + i,
        });
      }
    };

    generatePlanets(PLANET_CONFIG.small, 0);
    generatePlanets(PLANET_CONFIG.medium, 100);
    generatePlanets(PLANET_CONFIG.large, 200);
    generatePlanets(PLANET_CONFIG.giant, 300);

    return planetConfigs;
  }, []);
};
