import React, { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Tree } from './Tree';
import { Rock } from './Rock';
import * as THREE from 'three';

interface PlanetProps {
  position?: [number, number, number];
  radius?: number;
}

export const Planet: React.FC<PlanetProps> = ({ position = [0, 0, 0], radius = 10 }) => {
  const { trees, rocks } = useMemo(() => {
    const trees = [];
    const rocks = [];
    const treeCount = 20;
    const rockCount = 15;

    const generateItem = () => {
        // Random point on sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        const pos: [number, number, number] = [x, y, z];
        
        // Align rotation to surface normal
        const normal = new THREE.Vector3(x, y, z).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        
        return { position: pos, quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w] as [number, number, number, number] };
    };

    for (let i = 0; i < treeCount; i++) trees.push(generateItem());
    for (let i = 0; i < rockCount; i++) rocks.push(generateItem());

    return { trees, rocks };
  }, [radius]);

  return (
    <group position={position}>
        <RigidBody type="fixed" colliders="trimesh" userData={{ type: 'ground' }}>
        <mesh>
            <icosahedronGeometry args={[radius, 5]} />
            <meshToonMaterial color="#8bc34a" />
        </mesh>
        </RigidBody>
        
        {trees.map((t, i) => <Tree key={`tree-${i}`} position={t.position} quaternion={t.quaternion} scale={0.5 + Math.random() * 0.5} />)}
        {rocks.map((r, i) => <Rock key={`rock-${i}`} position={r.position} quaternion={r.quaternion} scale={0.5 + Math.random() * 0.5} />)}
    </group>
  );
};
