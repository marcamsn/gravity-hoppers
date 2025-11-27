import React, { useRef, useMemo } from 'react';
import { createPortal } from '@react-three/fiber';
import { OrthographicCamera, useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { usePlanetConfigs } from './PlanetSystem';
import { getPlanetPalette } from './Planet';

interface MinimapProps {
  playerPosition: THREE.Vector3;
  remotePlayers: Array<{ x: number; y: number; z: number }>;
}

const MINIMAP_SCALE = 0.002; // Scale down the world
const MINIMAP_RANGE = 800; // How far to show

export const Minimap: React.FC<MinimapProps> = ({ playerPosition, remotePlayers }) => {
  const planets = usePlanetConfigs();

  // Create a scene for the minimap
  const minimapScene = useMemo(() => new THREE.Scene(), []);
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  // Render target for minimap
  const renderTarget = useFBO(200, 200, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  // Planet markers (scaled spheres)
  const planetMarkers = useMemo(() => {
    return planets.map((planet, i) => {
      const color = new THREE.Color();
      // Color based on size
      if (planet.radius < 6) color.setHex(0x88ff88); // Small - light green
      else if (planet.radius < 20) color.setHex(0x44aa44); // Medium - green
      else if (planet.radius < 40) color.setHex(0x228822); // Large - dark green
      else color.setHex(0x116611); // Giant - very dark green

      return {
        position: planet.position,
        radius: Math.max(2, planet.radius * MINIMAP_SCALE * 50),
        color,
        key: `planet-${i}`,
      };
    });
  }, [planets]);

  return (
    <>
      {/* Minimap render scene */}
      {createPortal(
        <>
          {/* Background */}
          <color attach="background" args={['#0a0a1a']} />

          {/* Grid for reference */}
          <gridHelper
            args={[MINIMAP_RANGE * MINIMAP_SCALE * 2, 20, '#333355', '#222233']}
            rotation={[0, 0, 0]}
          />

          {/* Planets */}
          {planetMarkers.map((marker) => (
            <mesh
              key={marker.key}
              position={[
                marker.position.x * MINIMAP_SCALE,
                marker.position.z * MINIMAP_SCALE, // Swap Y/Z for top-down view
                -marker.position.y * MINIMAP_SCALE,
              ]}
            >
              <sphereGeometry args={[marker.radius * MINIMAP_SCALE, 8, 8]} />
              <meshBasicMaterial color={marker.color} />
            </mesh>
          ))}

          {/* Local player (bright cyan) */}
          <mesh
            position={[
              playerPosition.x * MINIMAP_SCALE,
              playerPosition.z * MINIMAP_SCALE,
              -playerPosition.y * MINIMAP_SCALE,
            ]}
          >
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>

          {/* Player direction indicator */}
          <mesh
            position={[
              playerPosition.x * MINIMAP_SCALE,
              playerPosition.z * MINIMAP_SCALE + 0.1,
              -playerPosition.y * MINIMAP_SCALE,
            ]}
          >
            <coneGeometry args={[0.05, 0.1, 4]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>

          {/* Remote players (yellow) */}
          {remotePlayers.map((player, i) => (
            <mesh
              key={`remote-${i}`}
              position={[
                player.x * MINIMAP_SCALE,
                player.z * MINIMAP_SCALE,
                -player.y * MINIMAP_SCALE,
              ]}
            >
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#ffff00" />
            </mesh>
          ))}

          {/* Range circle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[MINIMAP_RANGE * MINIMAP_SCALE * 0.95, MINIMAP_RANGE * MINIMAP_SCALE, 64]} />
            <meshBasicMaterial color="#334455" side={THREE.DoubleSide} transparent opacity={0.5} />
          </mesh>

          {/* Camera */}
          <OrthographicCamera
            ref={cameraRef}
            makeDefault={false}
            position={[0, 5, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            zoom={1}
            near={0.1}
            far={100}
            left={-2}
            right={2}
            top={2}
            bottom={-2}
          />
        </>,
        minimapScene
      )}
    </>
  );
};

// Simple HTML overlay minimap using CSS
export const MinimapOverlay: React.FC<{
  playerPosition: THREE.Vector3;
  cameraForward: THREE.Vector3;
  cameraUp: THREE.Vector3;
  remotePlayers: Array<{ x: number; y: number; z: number }>;
}> = ({ playerPosition, cameraForward, cameraUp, remotePlayers }) => {
  const planets = usePlanetConfigs();
  const size = 180;
  const range = 800;
  const scale = size / (range * 2);

  // Calculate camera right vector for 3D projection
  const cameraRight = useMemo(() => {
    return new THREE.Vector3().crossVectors(cameraForward, cameraUp).normalize();
  }, [cameraForward, cameraUp]);

  // Transform world coordinates to radar-relative (projected onto camera plane)
  const toRotatedMapCoords = (worldX: number, worldY: number, worldZ: number) => {
    // Get position relative to player
    const dx = worldX - playerPosition.x;
    const dy = worldY - playerPosition.y;
    const dz = worldZ - playerPosition.z;

    // Project onto camera's local coordinate system
    // Right = X on radar, Forward = -Y on radar (up on screen)
    const relativePos = new THREE.Vector3(dx, dy, dz);
    const projectedX = relativePos.dot(cameraRight);
    const projectedY = relativePos.dot(cameraForward); // Forward = up on radar

    return {
      left: size / 2 + projectedX * scale,
      top: size / 2 - projectedY * scale, // Negative because forward should be up
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: size,
        height: size,
        background: 'radial-gradient(circle, rgba(255,220,240,0.9) 0%, rgba(200,220,255,0.85) 50%, rgba(230,200,255,0.8) 100%)',
        border: '2px solid rgba(255,180,200,0.6)',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(255,180,220,0.4), inset 0 0 30px rgba(255,255,255,0.3)',
      }}
    >
      {/* Grid lines */}
      <svg
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle cx={size/2} cy={size/2} r={size/2 - 2} fill="none" stroke="rgba(200,150,180,0.4)" strokeWidth="1" />
        <circle cx={size/2} cy={size/2} r={size/3} fill="none" stroke="rgba(180,150,200,0.3)" strokeWidth="1" />
        <circle cx={size/2} cy={size/2} r={size/6} fill="none" stroke="rgba(180,150,200,0.3)" strokeWidth="1" />
        <line x1={size/2} y1={0} x2={size/2} y2={size} stroke="rgba(180,150,200,0.25)" strokeWidth="1" />
        <line x1={0} y1={size/2} x2={size} y2={size/2} stroke="rgba(180,150,200,0.25)" strokeWidth="1" />
      </svg>

      {/* Planets */}
      {planets.map((planet, i) => {
        const pos = toRotatedMapCoords(planet.position.x, planet.position.y, planet.position.z);
        const dotSize = Math.max(3, Math.min(12, planet.radius * 0.3));
        const palette = getPlanetPalette(planet.seed);

        // Check if within radar range (3D distance)
        const dx = planet.position.x - playerPosition.x;
        const dy = planet.position.y - playerPosition.y;
        const dz = planet.position.z - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > range) return null;

        return (
          <div
            key={`planet-${i}`}
            style={{
              position: 'absolute',
              left: pos.left - dotSize / 2,
              top: pos.top - dotSize / 2,
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              background: palette.ground,
              boxShadow: `0 0 ${dotSize/2}px ${palette.ground}`,
            }}
          />
        );
      })}

      {/* Remote players */}
      {remotePlayers.map((player, i) => {
        const dx = player.x - playerPosition.x;
        const dy = player.y - playerPosition.y;
        const dz = player.z - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const pos = toRotatedMapCoords(player.x, player.y, player.z);

        // Check if outside radar bounds
        const isOffScreen = pos.left < 0 || pos.left > size || pos.top < 0 || pos.top > size || dist > range * 0.9;

        if (isOffScreen) {
          // Show as arrow on edge pointing to player (using projected coordinates)
          const relativePos = new THREE.Vector3(dx, dy, dz);
          const projectedX = relativePos.dot(cameraRight);
          const projectedY = relativePos.dot(cameraForward);
          const arrowAngle = Math.atan2(projectedX, projectedY);
          const edgeRadius = size / 2 - 12;

          return (
            <div
              key={`remote-${i}`}
              style={{
                position: 'absolute',
                left: size / 2 + Math.sin(arrowAngle) * edgeRadius - 6,
                top: size / 2 - Math.cos(arrowAngle) * edgeRadius - 6,
                width: 12,
                height: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `rotate(${arrowAngle * (180 / Math.PI)}deg)`,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '10px solid #ffcc00',
                  filter: 'drop-shadow(0 0 3px #ffcc00)',
                }}
              />
            </div>
          );
        }

        // Remote player as triangle
        return (
          <div
            key={`remote-${i}`}
            style={{
              position: 'absolute',
              left: pos.left - 6,
              top: pos.top - 6,
              width: 12,
              height: 12,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 0 L12 12 L0 12 Z"
                fill="#ffcc00"
                filter="drop-shadow(0 0 3px #ffcc00)"
              />
            </svg>
          </div>
        );
      })}

      {/* Local player - triangle pointing up (direction of view) */}
      <div
        style={{
          position: 'absolute',
          left: size / 2 - 8,
          top: size / 2 - 8,
          width: 16,
          height: 16,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path
            d="M8 0 L16 16 L0 16 Z"
            fill="#ff69b4"
            stroke="#ffffff"
            strokeWidth="1"
            filter="drop-shadow(0 0 4px #ff69b4)"
          />
        </svg>
      </div>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(180,120,160,0.8)',
          fontSize: 10,
          fontFamily: 'monospace',
          textShadow: '0 0 4px rgba(255,255,255,0.5)',
        }}
      >
        RADAR
      </div>
    </div>
  );
};
