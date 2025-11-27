import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useMouseControls } from '../hooks/useMouseControls';

const GRAVITY_FORCE = 20;
const THRUST_FORCE_MAX = 30;
const THRUST_RAMP_SPEED = 2.0; // How fast thrust ramps up (0 to max)

interface PlayerProps {
    onPositionUpdate?: (data: { x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number }) => void;
}

export const Player: React.FC<PlayerProps> = ({ onPositionUpdate }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const controls = useKeyboardControls();
  const mouseControls = useMouseControls();
  
  const [currentThrustForward, setCurrentThrustForward] = useState(0);
  const [currentThrustReverse, setCurrentThrustReverse] = useState(0);

  // Temporary vectors to avoid garbage collection
  const playerPos = new THREE.Vector3();
  const planetCenter = new THREE.Vector3(0, 0, 0);
  const upVector = new THREE.Vector3();
  const thrustDirection = new THREE.Vector3();

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    // 1. Get current position
    const translation = rigidBodyRef.current.translation();
    playerPos.set(translation.x, translation.y, translation.z);

    // 2. Calculate "Up" vector (normal to planet surface)
    upVector.copy(playerPos).sub(planetCenter).normalize();

    // 3. Apply Spherical Gravity
    const gravityDirection = upVector.clone().negate();
    rigidBodyRef.current.applyImpulse(gravityDirection.multiplyScalar(GRAVITY_FORCE * delta * rigidBodyRef.current.mass()), true);

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
        onPositionUpdate({
            x: t.x, y: t.y, z: t.z,
            qx: r.x, qy: r.y, qz: r.z, qw: r.w
        });
    }
    
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      colliders={false} 
      mass={1} 
      position={[0, 12, 0]} 
      enabledRotations={[false, false, false]} 
      linearDamping={0.3}
      angularDamping={0.5}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
};
