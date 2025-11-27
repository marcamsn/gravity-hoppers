import React, { useMemo } from 'react';
import { Planet } from './Planet';
import * as THREE from 'three';

interface PlanetConfig {
  id: string;
  position: [number, number, number];
  radius: number;
  mass: number;
}

export const PlanetSystem: React.FC = () => {
  const planets = useMemo(() => {
    const planetConfigs: PlanetConfig[] = [];
    const planetCount = 7;
    const minDistance = 30;
    const maxDistance = 150;
    const minRadius = 5;
    const maxRadius = 15;

    // Seeded random for reproducibility
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < planetCount; i++) {
      // Random position in 3D space
      const distance = minDistance + random() * (maxDistance - minDistance);
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      const x = distance * Math.sin(phi) * Math.cos(theta);
      const y = distance * Math.sin(phi) * Math.sin(theta);
      const z = distance * Math.cos(phi);

      const radius = minRadius + random() * (maxRadius - minRadius);
      const mass = radius * radius; // Mass proportional to radius squared

      planetConfigs.push({
        id: `planet-${i}`,
        position: [x, y, z],
        radius,
        mass,
      });
    }

    return planetConfigs;
  }, []);

  return (
    <>
      {planets.map((planet) => (
        <Planet
          key={planet.id}
          position={planet.position}
          radius={planet.radius}
        />
      ))}
    </>
  );
};

// Export planet configurations for use in Player gravity calculations
export const usePlanetConfigs = (): Array<{ position: THREE.Vector3; radius: number; mass: number }> => {
  return useMemo(() => {
    const planetConfigs: Array<{ position: THREE.Vector3; radius: number; mass: number }> = [];
    const planetCount = 7;
    const minDistance = 30;
    const maxDistance = 150;
    const minRadius = 5;
    const maxRadius = 15;

    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < planetCount; i++) {
      const distance = minDistance + random() * (maxDistance - minDistance);
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      const x = distance * Math.sin(phi) * Math.cos(theta);
      const y = distance * Math.sin(phi) * Math.sin(theta);
      const z = distance * Math.cos(phi);

      const radius = minRadius + random() * (maxRadius - minRadius);
      const mass = radius * radius;

      planetConfigs.push({
        position: new THREE.Vector3(x, y, z),
        radius,
        mass,
      });
    }

    return planetConfigs;
  }, []);
};
