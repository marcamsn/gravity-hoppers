import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SkyGradient: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#ffd1dc') },      // Soft pink
        colorMiddle: { value: new THREE.Color('#bae1ff') },   // Soft blue
        colorBottom: { value: new THREE.Color('#e2c6ff') },   // Soft lavender
        colorAccent1: { value: new THREE.Color('#ffb7d5') },  // Pink accent
        colorAccent2: { value: new THREE.Color('#ffd4a3') },  // Peach accent
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorMiddle;
        uniform vec3 colorBottom;
        uniform vec3 colorAccent1;
        uniform vec3 colorAccent2;
        varying vec3 vPosition;

        // Simplex noise functions for cloud effect
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vec3 dir = normalize(vPosition);

          // Base vertical gradient (0 to 1)
          float t = dir.y * 0.5 + 0.5;

          // Smoother three-color gradient
          vec3 baseColor;
          if (t < 0.4) {
            baseColor = mix(colorBottom, colorMiddle, t / 0.4);
          } else if (t < 0.6) {
            baseColor = colorMiddle;
          } else {
            baseColor = mix(colorMiddle, colorTop, (t - 0.6) / 0.4);
          }

          // Add cloud-like noise layers
          float scale1 = 2.0;
          float scale2 = 4.0;
          float scale3 = 8.0;

          float noise1 = snoise(dir * scale1) * 0.5 + 0.5;
          float noise2 = snoise(dir * scale2) * 0.5 + 0.5;
          float noise3 = snoise(dir * scale3) * 0.5 + 0.5;

          // Combine noise for fluffy cloud effect
          float cloudNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;

          // Add pink/peach accent clouds (reduced intensity)
          vec3 cloudColor1 = mix(baseColor, colorAccent1, cloudNoise * 0.2);

          // Add another layer of accent (reduced)
          float accentNoise = snoise(dir * 3.0 + vec3(10.0, 0.0, 0.0)) * 0.5 + 0.5;
          vec3 finalColor = mix(cloudColor1, colorAccent2, accentNoise * 0.15);

          // Slightly darken overall for softer look
          finalColor = finalColor * 0.85;

          // Add subtle sparkles (less intense)
          float sparkle = fract(sin(dot(dir.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (sparkle > 0.998) {
            finalColor += vec3(0.15);
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  // Make skybox follow camera
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[5000, 64, 64]} />
    </mesh>
  );
};
