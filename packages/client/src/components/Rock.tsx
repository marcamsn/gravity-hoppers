import React, { useMemo } from 'react';

interface RockProps {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale?: number;
  color?: string;
}

export const Rock: React.FC<RockProps> = ({
  position,
  quaternion,
  scale = 1,
  color = '#9e9e9e',
}) => {
  const randomRotation = useMemo(() => [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI], []);

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      <mesh rotation={[randomRotation[0], randomRotation[1], randomRotation[2] as number]}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};
