import React, { useMemo } from 'react';
import { Group } from 'three';

export const Tree: React.FC<{ position: [number, number, number], quaternion: [number, number, number, number], scale?: number }> = ({ position, quaternion, scale = 1 }) => {
  const randomRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1, 6]} />
        <meshToonMaterial color="#8B4513" />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 1.5, 0]} rotation={[0, randomRotation, 0]}>
        <coneGeometry args={[1, 2, 6]} />
        <meshToonMaterial color="#4caf50" />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, randomRotation + 1, 0]}>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshToonMaterial color="#66bb6a" />
      </mesh>
    </group>
  );
};
