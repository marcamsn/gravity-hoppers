import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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

const TRAIL_LENGTH = 50;
const TRAIL_FADE_SPEED = 2;

export const RemotePlayer: React.FC<RemotePlayerProps> = ({ player }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetRot = useRef(new THREE.Quaternion());
  const lastPosition = useRef(new THREE.Vector3());
  const trailData = useRef({
    positions: new Float32Array(TRAIL_LENGTH * 3),
    alphas: new Float32Array(TRAIL_LENGTH),
    sizes: new Float32Array(TRAIL_LENGTH),
    head: 0,
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

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Interpolation
    targetPos.current.set(player.x, player.y, player.z);
    targetRot.current.set(player.qx, player.qy, player.qz, player.qw);

    meshRef.current.position.lerp(targetPos.current, 0.2);
    meshRef.current.quaternion.slerp(targetRot.current, 0.2);

    // Trail logic - emit particles when moving
    const data = trailData.current;
    const currentPos = meshRef.current.position;
    const distance = currentPos.distanceTo(lastPosition.current);

    data.timer += delta;

    // Add particle if moving fast enough (indicates thrusting)
    if (data.timer > 0.02 && distance > 0.15) {
      const idx = data.head * 3;
      data.positions[idx] = currentPos.x;
      data.positions[idx + 1] = currentPos.y;
      data.positions[idx + 2] = currentPos.z;
      data.alphas[data.head] = 1.0;
      data.sizes[data.head] = 0.3 + Math.random() * 0.2;

      data.head = (data.head + 1) % TRAIL_LENGTH;
      lastPosition.current.copy(currentPos);
      data.timer = 0;
    }

    // Fade all particles
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      if (data.alphas[i] > 0) {
        data.alphas[i] = Math.max(0, data.alphas[i] - delta * TRAIL_FADE_SPEED);
        data.sizes[i] *= 0.98;
      }
    }

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const alphaAttr = pointsRef.current.geometry.attributes.alpha as THREE.BufferAttribute;
      const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="cyan" />
      </mesh>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    </>
  );
};
