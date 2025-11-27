import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useMouseControls } from '../hooks/useMouseControls';
import { usePlanetConfigs } from './PlanetSystem';
import { SpeedLines } from './SpeedLines';

const BASE_GRAVITY_FORCE = 20;
const THRUST_FORCE_MAX = 30;
const THRUST_RAMP_SPEED = 2.0;

type PlanetConfig = { position: THREE.Vector3; radius: number; mass: number };

interface PlayerProps {
    onPositionUpdate?: (data: { x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number, cameraYaw: number }) => void;
}

export const Player: React.FC<PlayerProps> = ({ onPositionUpdate }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const controls = useKeyboardControls();
  const mouseControls = useMouseControls();
  const planets = usePlanetConfigs();

  const [currentThrustForward, setCurrentThrustForward] = useState(0);
  const [currentThrustReverse, setCurrentThrustReverse] = useState(0);

  const playerPos = new THREE.Vector3();
  const upVector = new THREE.Vector3();
  const thrustDirection = new THREE.Vector3();
  const gravityForce = new THREE.Vector3();
  const targetQuaternion = new THREE.Quaternion();
  const currentQuaternion = new THREE.Quaternion();

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const translation = rigidBodyRef.current.translation();
    playerPos.set(translation.x, translation.y, translation.z);

    // Calculate combined gravity from all planets
    gravityForce.set(0, 0, 0);
    let nearestPlanet: PlanetConfig | undefined;
    let nearestDistance = Infinity;

    for (const planet of planets) {
      const toPlanet = planet.position.clone().sub(playerPos);
      const distance = toPlanet.length();

      // Track nearest planet for "up" vector
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlanet = planet;
      }

      // Calculate gravity force with distance falloff
      // F = G * m1 * m2 / r^2, simplified to: force = mass / distance^2
      const gravityStrength = (planet.mass * BASE_GRAVITY_FORCE) / (distance * distance);
      const gravityDir = toPlanet.normalize();
      gravityForce.add(gravityDir.multiplyScalar(gravityStrength));
    }

    // Apply combined gravity
    rigidBodyRef.current.applyImpulse(
      gravityForce.multiplyScalar(delta * rigidBodyRef.current.mass()),
      true
    );

    // Calculate "up" vector from nearest planet and align rotation
    if (nearestPlanet) {
      upVector.copy(playerPos).sub(nearestPlanet.position).normalize();
      
      // Create a quaternion that aligns the player's up (Y-axis) with the planet's normal
      targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upVector);
      
      // Get current rotation and smoothly interpolate
      const currentRot = rigidBodyRef.current.rotation();
      currentQuaternion.set(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
      currentQuaternion.slerp(targetQuaternion, 0.1);
      
      // Apply the smoothed rotation
      rigidBodyRef.current.setRotation(currentQuaternion, true);
    } else {
      upVector.set(0, 1, 0); // Default up if no planets nearby
    }

    // 4. Jetpack Thrust System
    // Get camera forward direction (mouse look direction)
    camera.getWorldDirection(thrustDirection);
    thrustDirection.normalize();

    // Determine if thrust is active
    const isThrustingForward = controls.thrustForward || mouseControls.left;
    const isThrustingReverse = controls.thrustReverse || mouseControls.right;

    // Smooth ramp-up/down of thrust force
    if (isThrustingForward) {
      setCurrentThrustForward(prev => Math.min(prev + THRUST_RAMP_SPEED * delta, 1.0));
    } else {
      setCurrentThrustForward(prev => Math.max(prev - THRUST_RAMP_SPEED * delta * 2, 0)); // Ramp down faster
    }

    if (isThrustingReverse) {
      setCurrentThrustReverse(prev => Math.min(prev + THRUST_RAMP_SPEED * delta, 1.0));
    } else {
      setCurrentThrustReverse(prev => Math.max(prev - THRUST_RAMP_SPEED * delta * 2, 0));
    }

    // Apply forward thrust
    if (currentThrustForward > 0) {
      const forwardForce = thrustDirection.clone().multiplyScalar(
        THRUST_FORCE_MAX * currentThrustForward * rigidBodyRef.current.mass() * delta
      );
      rigidBodyRef.current.applyImpulse(forwardForce, true);
    }

    // Apply reverse thrust (opposite direction)
    if (currentThrustReverse > 0) {
      const reverseForce = thrustDirection.clone().negate().multiplyScalar(
        THRUST_FORCE_MAX * currentThrustReverse * rigidBodyRef.current.mass() * delta
      );
      rigidBodyRef.current.applyImpulse(reverseForce, true);
    }

    // 5. Camera Follow
    const cameraPos = playerPos.clone().add(upVector.clone().multiplyScalar(1.5));
    camera.position.lerp(cameraPos, 0.2);
    camera.up.copy(upVector);

    // 6. Network Update
    if (onPositionUpdate && rigidBodyRef.current) {
        const t = rigidBodyRef.current.translation();
        const r = rigidBodyRef.current.rotation();
        // Get camera yaw (Y-axis rotation) for minimap direction indicator
        const cameraYaw = Math.atan2(thrustDirection.x, thrustDirection.z);
        onPositionUpdate({
            x: t.x, y: t.y, z: t.z,
            qx: r.x, qy: r.y, qz: r.z, qw: r.w,
            cameraYaw
        });
    }

  });

  const thrustIntensity = Math.max(currentThrustForward, currentThrustReverse);

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        mass={1}
        position={[0, 12, 0]}
        enabledRotations={[true, true, true]}
        linearDamping={0.3}
        angularDamping={0.5}
      >
        <CapsuleCollider args={[0.5, 0.5]} />
        <mesh visible={false}>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </RigidBody>

      {/* Speed lines effect attached to camera */}
      <primitive object={camera}>
        <SpeedLines intensity={thrustIntensity} />
      </primitive>
    </>
  );
};
