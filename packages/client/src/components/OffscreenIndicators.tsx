import React, { useMemo } from 'react';
import * as THREE from 'three';

interface OffscreenIndicatorsProps {
  playerPosition: THREE.Vector3;
  cameraForward: THREE.Vector3;
  cameraUp: THREE.Vector3;
  remotePlayers: Array<{ x: number; y: number; z: number }>;
}

const EDGE_PADDING = 60;
const INDICATOR_SIZE = 20;

export const OffscreenIndicators: React.FC<OffscreenIndicatorsProps> = ({
  playerPosition,
  cameraForward,
  cameraUp,
  remotePlayers,
}) => {
  const cameraRight = useMemo(() => {
    return new THREE.Vector3().crossVectors(cameraForward, cameraUp).normalize();
  }, [cameraForward, cameraUp]);

  const indicators = useMemo(() => {
    return remotePlayers.map((player, i) => {
      const dx = player.x - playerPosition.x;
      const dy = player.y - playerPosition.y;
      const dz = player.z - playerPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const relativePos = new THREE.Vector3(dx, dy, dz);

      // Project onto camera plane
      const projectedX = relativePos.dot(cameraRight);
      const projectedY = relativePos.dot(cameraUp);
      const projectedZ = relativePos.dot(cameraForward); // Depth (forward)

      // If player is behind us, flip the indicator direction
      const isBehind = projectedZ < 0;

      // Calculate angle from center of screen
      const angle = Math.atan2(projectedX, isBehind ? -projectedY : projectedY);

      // Normalize to screen coordinates (-1 to 1)
      const screenX = projectedX / Math.max(Math.abs(projectedX), Math.abs(projectedY), 0.01);
      const screenY = projectedY / Math.max(Math.abs(projectedX), Math.abs(projectedY), 0.01);

      // If in front and within a reasonable FOV, player might be visible
      const inFrontAndVisible = projectedZ > 0 && Math.abs(projectedX) < projectedZ && Math.abs(projectedY) < projectedZ;
      if (inFrontAndVisible) {
        return null; // Don't show indicator for visible players
      }

      return {
        key: `indicator-${i}`,
        angle,
        screenX,
        screenY,
        distance,
        isBehind,
      };
    }).filter(Boolean);
  }, [remotePlayers, playerPosition, cameraForward, cameraUp, cameraRight]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {indicators.map((indicator) => {
        if (!indicator) return null;

        const { key, screenX, screenY, distance, isBehind } = indicator;

        // Calculate position on screen edge
        const halfWidth = window.innerWidth / 2;
        const halfHeight = window.innerHeight / 2;

        // Determine which edge the indicator should be on
        let x = halfWidth + screenX * (halfWidth - EDGE_PADDING);
        let y = halfHeight - screenY * (halfHeight - EDGE_PADDING);

        // Clamp to edges
        x = Math.max(EDGE_PADDING, Math.min(window.innerWidth - EDGE_PADDING, x));
        y = Math.max(EDGE_PADDING, Math.min(window.innerHeight - EDGE_PADDING, y));

        // Calculate rotation for the arrow
        const arrowAngle = Math.atan2(screenX, screenY) * (180 / Math.PI);

        // Format distance
        const distanceText = distance < 100 ? Math.round(distance) + 'm' : Math.round(distance / 10) * 10 + 'm';

        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: x - INDICATOR_SIZE / 2,
              top: y - INDICATOR_SIZE / 2,
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Arrow */}
            <svg
              width={INDICATOR_SIZE}
              height={INDICATOR_SIZE}
              viewBox="0 0 20 20"
              style={{
                transform: `rotate(${-arrowAngle}deg)`,
                filter: 'drop-shadow(0 0 4px #ffcc00)',
              }}
            >
              <path
                d="M10 2 L18 18 L10 14 L2 18 Z"
                fill={isBehind ? '#ff6600' : '#ffcc00'}
                stroke="#ffffff"
                strokeWidth="1"
              />
            </svg>
            {/* Distance label */}
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                fontFamily: 'monospace',
                color: isBehind ? '#ff6600' : '#ffcc00',
                textShadow: '0 0 4px black, 0 0 4px black',
                whiteSpace: 'nowrap',
              }}
            >
              {distanceText}
            </div>
          </div>
        );
      })}
    </div>
  );
};
