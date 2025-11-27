import React, { useMemo } from 'react';

interface TreeProps {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale?: number;
  trunkColor?: string;
  foliageColor?: string;
  foliageDarkColor?: string;
}

export const Tree: React.FC<TreeProps> = ({
  position,
  quaternion,
  scale = 1,
  trunkColor = '#8B4513',
  foliageColor = '#66bb6a',
  foliageDarkColor = '#4caf50',
}) => {
  const randomRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1, 6]} />
        <meshBasicMaterial color={trunkColor} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 1.5, 0]} rotation={[0, randomRotation, 0]}>
        <coneGeometry args={[1, 2, 6]} />
        <meshBasicMaterial color={foliageDarkColor} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, randomRotation + 1, 0]}>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshBasicMaterial color={foliageColor} />
      </mesh>
    </group>
  );
};
