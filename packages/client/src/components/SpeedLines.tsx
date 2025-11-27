import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpeedLinesProps {
  intensity: number; // 0 to 1 (thrust intensity)
}

const LINE_COUNT = 150;
const MIN_LINE_LENGTH = 0.3;
const MAX_LINE_LENGTH = 12;
const SPREAD_MIN = 1.5;
const SPREAD_MAX = 5;
const ANIMATION_SPEED = 80;

export const SpeedLines: React.FC<SpeedLinesProps> = ({ intensity }) => {
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(LINE_COUNT * 6);
    const velocities = new Float32Array(LINE_COUNT);

    for (let i = 0; i < LINE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = SPREAD_MIN + Math.random() * (SPREAD_MAX - SPREAD_MIN);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = -Math.random() * 40 - 5;

      const idx = i * 6;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      positions[idx + 3] = x;
      positions[idx + 4] = y;
      positions[idx + 5] = z + MIN_LINE_LENGTH;

      velocities[i] = 0.5 + Math.random() * 0.5;
    }

    return { positions, velocities };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state, delta) => {
    if (!linesRef.current || intensity < 0.05) return;

    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    // Line length grows dramatically with thrust - use exponential curve for clear difference
    const lineLength = MIN_LINE_LENGTH + (MAX_LINE_LENGTH - MIN_LINE_LENGTH) * intensity * intensity;

    // Lines converge toward center at higher thrust
    const spreadMultiplier = 1 - intensity * 0.4;

    for (let i = 0; i < LINE_COUNT; i++) {
      const idx = i * 6;
      const vel = velocities[i] * ANIMATION_SPEED * delta * intensity;

      // Move lines toward camera
      posArray[idx + 2] += vel;

      // Keep line length consistent - end point trails behind start
      posArray[idx + 5] = posArray[idx + 2] + lineLength;

      // Reset line if it passes the camera
      if (posArray[idx + 2] > 3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = (SPREAD_MIN + Math.random() * (SPREAD_MAX - SPREAD_MIN)) * spreadMultiplier;
        posArray[idx] = Math.cos(angle) * radius;
        posArray[idx + 1] = Math.sin(angle) * radius;
        posArray[idx + 2] = -40 - Math.random() * 20;
        posArray[idx + 3] = posArray[idx];
        posArray[idx + 4] = posArray[idx + 1];
        posArray[idx + 5] = posArray[idx + 2] + lineLength;
      }
    }

    posAttr.needsUpdate = true;

    // Opacity increases clearly with thrust
    const material = linesRef.current.material as THREE.LineBasicMaterial;
    material.opacity = 0.3 + intensity * 0.7;

    // Color shifts blue -> cyan -> white with intensity
    material.color.setRGB(
      0.4 + intensity * 0.6,
      0.7 + intensity * 0.3,
      1.0
    );
  });

  if (intensity < 0.05) return null;

  return (
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#88ccff"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};
