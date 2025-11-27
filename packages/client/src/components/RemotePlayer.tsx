import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Quaternion, Vector3 } from 'three';

interface RemotePlayerProps {
  player: {
    x: number;
    y: number;
    z: number;
    qx: number;
    qy: number;
    qz: number;
    qw: number;
  };
}

export const RemotePlayer: React.FC<RemotePlayerProps> = ({ player }) => {
  const meshRef = useRef<Mesh>(null);
  const targetPos = new Vector3();
  const targetRot = new Quaternion();

  useFrame(() => {
    if (!meshRef.current) return;

    // Interpolation
    targetPos.set(player.x, player.y, player.z);
    targetRot.set(player.qx, player.qy, player.qz, player.qw);

    meshRef.current.position.lerp(targetPos, 0.2);
    meshRef.current.quaternion.slerp(targetRot, 0.2);
  });

  return (
    <mesh ref={meshRef}>
      <capsuleGeometry args={[0.5, 1, 4, 8]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
};
