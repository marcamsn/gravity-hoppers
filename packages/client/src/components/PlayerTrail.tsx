import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerTrailProps {
  playerPosition: THREE.Vector3;
  isThrusting: boolean;
}

const TRAIL_LENGTH = 50;
const TRAIL_FADE_SPEED = 2;

export const PlayerTrail: React.FC<PlayerTrailProps> = ({ playerPosition, isThrusting }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const trailData = useRef({
    positions: new Float32Array(TRAIL_LENGTH * 3),
    alphas: new Float32Array(TRAIL_LENGTH),
    sizes: new Float32Array(TRAIL_LENGTH),
    head: 0,
    lastPosition: new THREE.Vector3(),
    timer: 0,
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(trailData.current.positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(trailData.current.alphas, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(trailData.current.sizes, 1));
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#ff6600') },
      },
      vertexShader: `
        attribute float alpha;
        attribute float size;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float strength = 1.0 - (dist * 2.0);
          gl_FragColor = vec4(color, vAlpha * strength);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const data = trailData.current;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const alphaAttr = pointsRef.current.geometry.attributes.alpha as THREE.BufferAttribute;
    const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;

    // Add new particle if thrusting and moved enough
    data.timer += delta;
    const distance = playerPosition.distanceTo(data.lastPosition);

    if (isThrusting && data.timer > 0.02 && distance > 0.1) {
      const idx = data.head * 3;
      data.positions[idx] = playerPosition.x;
      data.positions[idx + 1] = playerPosition.y;
      data.positions[idx + 2] = playerPosition.z;
      data.alphas[data.head] = 1.0;
      data.sizes[data.head] = 0.3 + Math.random() * 0.2;

      data.head = (data.head + 1) % TRAIL_LENGTH;
      data.lastPosition.copy(playerPosition);
      data.timer = 0;
    }

    // Fade all particles
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      if (data.alphas[i] > 0) {
        data.alphas[i] = Math.max(0, data.alphas[i] - delta * TRAIL_FADE_SPEED);
        // Shrink as it fades
        data.sizes[i] *= 0.98;
      }
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
};
