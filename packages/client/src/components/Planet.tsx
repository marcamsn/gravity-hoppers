import React, { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Tree } from './Tree';
import { Rock } from './Rock';
import * as THREE from 'three';

interface PlanetProps {
  position?: [number, number, number];
  radius?: number;
  seed?: number;
}

// Density per unit of surface area (4 * PI * r^2)
const TREE_DENSITY = 0.0075;
const ROCK_DENSITY = 0.012;

// Soft candy pastel palettes - dreamy and cute like the reference image
const PASTEL_PALETTES = [
  { ground: '#ffb6c1', trunk: '#dda0a0', foliage: '#ffd1dc', foliageDark: '#ffaec9', rock: '#ffe4e8' }, // Baby pink
  { ground: '#b5e8f7', trunk: '#8cc8d8', foliage: '#d4f1f9', foliageDark: '#a8e0f0', rock: '#e8f7fb' }, // Baby blue
  { ground: '#fff0b3', trunk: '#e8d898', foliage: '#fff8d4', foliageDark: '#ffe8a0', rock: '#fffbe8' }, // Butter cream
  { ground: '#dcc6e8', trunk: '#baa0c8', foliage: '#ead8f0', foliageDark: '#d0b8e0', rock: '#f0e4f5' }, // Soft lavender
  { ground: '#b8e8c8', trunk: '#90c8a8', foliage: '#d0f0dc', foliageDark: '#a8e0bc', rock: '#e4f5ec' }, // Mint cream
  { ground: '#ffd4b8', trunk: '#e8b898', foliage: '#ffe4d0', foliageDark: '#ffc8a8', rock: '#fff0e8' }, // Peach cream
  { ground: '#c8e0f8', trunk: '#a0c0d8', foliage: '#dceeff', foliageDark: '#b8d8f0', rock: '#ecf5ff' }, // Powder blue
  { ground: '#f8d0d8', trunk: '#d8a8b0', foliage: '#ffe0e8', foliageDark: '#f0c0cc', rock: '#fff0f4' }, // Rose quartz
  { ground: '#e8d8c8', trunk: '#c8b8a0', foliage: '#f4ece0', foliageDark: '#e0d0bc', rock: '#f9f5f0' }, // Cream beige
  { ground: '#d8f0d8', trunk: '#b0d0b0', foliage: '#e8f8e8', foliageDark: '#c8e8c8', rock: '#f4fbf4' }, // Soft mint
];

// Seeded random for consistent colors per planet
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

// Export function to get palette by seed for use in minimap
export const getPlanetPalette = (seed: number) => {
  const index = Math.floor(seededRandom(seed) * PASTEL_PALETTES.length);
  return PASTEL_PALETTES[index];
};

export const Planet: React.FC<PlanetProps> = ({ position = [0, 0, 0], radius = 10, seed = 0 }) => {
  const palette = useMemo(() => {
    const index = Math.floor(seededRandom(seed) * PASTEL_PALETTES.length);
    return PASTEL_PALETTES[index];
  }, [seed]);

  const { trees, rocks } = useMemo(() => {
    const trees = [];
    const rocks = [];

    // Surface area = 4 * PI * r^2, count proportional to surface area
    const surfaceArea = 4 * Math.PI * radius * radius;
    const treeCount = Math.floor(surfaceArea * TREE_DENSITY);
    const rockCount = Math.floor(surfaceArea * ROCK_DENSITY);

    // Scale objects based on planet size
    const baseScale = Math.max(0.3, Math.min(1.5, radius / 10));

    const generateItem = (baseScale: number) => {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        const pos: [number, number, number] = [x, y, z];

        const normal = new THREE.Vector3(x, y, z).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        // Calculate random scale here so it's stable across re-renders
        const scale = baseScale * (0.5 + Math.random() * 0.5);

        return { position: pos, quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w] as [number, number, number, number], scale };
    };

    for (let i = 0; i < treeCount; i++) trees.push(generateItem(baseScale));
    for (let i = 0; i < rockCount; i++) rocks.push(generateItem(baseScale));

    return { trees, rocks };
  }, [radius]);

  // Create glow material for atmosphere effect - soft gradient
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(palette.ground) },
        viewVector: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          // Fresnel effect for soft edge glow
          float fresnel = 1.0 - abs(dot(vNormal, vPositionNormal));
          // Smooth falloff with pow for softer gradient
          float intensity = pow(fresnel, 3.0) * 0.6;
          // Fade out towards edges smoothly
          intensity *= smoothstep(0.0, 0.5, fresnel);
          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }, [palette.ground]);

  return (
    <group position={position}>
        {/* Outer glow/atmosphere - soft gradient */}
        <mesh scale={1.25} material={glowMaterial}>
          <sphereGeometry args={[radius, 32, 32]} />
        </mesh>

        <RigidBody type="fixed" colliders="trimesh" userData={{ type: 'ground' }}>
        <mesh>
            <icosahedronGeometry args={[radius, 5]} />
            <meshBasicMaterial color={palette.ground} />
        </mesh>
        </RigidBody>

        {trees.map((t, i) => <Tree key={`tree-${i}`} position={t.position} quaternion={t.quaternion} scale={t.scale} trunkColor={palette.trunk} foliageColor={palette.foliage} foliageDarkColor={palette.foliageDark} />)}
        {rocks.map((r, i) => <Rock key={`rock-${i}`} position={r.position} quaternion={r.quaternion} scale={r.scale} color={palette.rock} />)}
    </group>
  );
};
