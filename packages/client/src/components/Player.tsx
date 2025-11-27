import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

const GRAVITY_FORCE = 20;
const WALK_SPEED = 5;
const JUMP_FORCE_MIN = 5;
const JUMP_FORCE_MAX = 20;
const JUMP_CHARGE_TIME = 1000; // ms to reach max charge

interface PlayerProps {
    onPositionUpdate?: (data: { x: number, y: number, z: number, qx: number, qy: number, qz: number, qw: number }) => void;
}

export const Player: React.FC<PlayerProps> = ({ onPositionUpdate }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  const controls = useKeyboardControls();
  
  const [jumpStartTime, setJumpStartTime] = useState<number | null>(null);

  // Temporary vectors to avoid garbage collection
  const playerPos = new THREE.Vector3();
  const planetCenter = new THREE.Vector3(0, 0, 0); // Assuming planet is at 0,0,0 for now
  const upVector = new THREE.Vector3();
  const forwardVector = new THREE.Vector3();
  const rightVector = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  const lookQuaternion = new THREE.Quaternion();
  const rotationMatrix = new THREE.Matrix4();
  const targetQuaternion = new THREE.Quaternion();

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    // 1. Get current position
    const translation = rigidBodyRef.current.translation();
    playerPos.set(translation.x, translation.y, translation.z);

    // 2. Calculate "Up" vector (normal to planet surface)
    upVector.copy(playerPos).sub(planetCenter).normalize();

    // 3. Apply Spherical Gravity
    // Apply a force towards the center of the planet
    const gravityDirection = upVector.clone().negate();
    rigidBodyRef.current.applyImpulse(gravityDirection.multiplyScalar(GRAVITY_FORCE * delta * rigidBodyRef.current.mass()), true);

    // 4. Align Player Rotation to Surface
    // We want the player's local Y to match the upVector
    // We keep the current forward direction as much as possible
    const currentRotation = rigidBodyRef.current.rotation();
    const currentQuaternion = new THREE.Quaternion(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w);
    
    // Create a rotation that aligns the positive Y axis with upVector
    rotationMatrix.lookAt(playerPos, planetCenter, new THREE.Vector3(0, 0, 1)); // This might be wrong, lookAt expects target. 
    // Let's use setFromUnitVectors instead for alignment
    const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upVector);
    
    // We need to preserve the "yaw" (rotation around the up vector) based on camera/input? 
    // For a simple prototype, let's just align the body up.
    // Actually, for a FPS, the body usually just handles position, and we rotate the camera?
    // Or we rotate the whole body. Let's rotate the body to align with gravity, but allow Yaw.
    
    // For now, just hard align up.
    // rigidBodyRef.current.setRotation(alignQuaternion, true); 
    // NOTE: Setting rotation directly interferes with physics angular velocity. 
    // Ideally we use angular impulses or a joint, but for a character controller, direct rotation is often smoother.
    // Let's try to just correct the tilt.

    // 5. Movement Logic
    // Calculate movement vectors relative to the surface
    // We need a "forward" that is tangent to the sphere
    
    // Get camera forward direction (in world space)
    camera.getWorldDirection(forwardVector);
    
    // Project forward vector onto the tangent plane
    // forward = forward - (forward . up) * up
    forwardVector.sub(upVector.clone().multiplyScalar(forwardVector.dot(upVector))).normalize();
    
    // Calculate right vector
    rightVector.crossVectors(forwardVector, upVector).normalize();

    moveDirection.set(0, 0, 0);
    if (controls.forward) moveDirection.add(forwardVector);
    if (controls.backward) moveDirection.sub(forwardVector);
    if (controls.right) moveDirection.add(rightVector);
    if (controls.left) moveDirection.sub(rightVector);

    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize().multiplyScalar(WALK_SPEED * delta * 50); // Scale for force
      
      // Apply movement force
      // We want to set velocity, but preserving vertical velocity (gravity/jump) is hard with setLinVel
      // So we apply impulse or force.
      // For a crisp movement, we might want to manually set velocity components tangent to sphere.
      
      rigidBodyRef.current.applyImpulse(moveDirection, true);
    }

    // Dampen horizontal velocity (friction)
    const vel = rigidBodyRef.current.linvel();
    const velVector = new THREE.Vector3(vel.x, vel.y, vel.z);
    // Remove the component along the up vector (vertical velocity)
    const verticalVel = upVector.clone().multiplyScalar(velVector.dot(upVector));
    const horizontalVel = velVector.clone().sub(verticalVel);
    
    // Apply opposing force to horizontal velocity
    rigidBodyRef.current.applyImpulse(horizontalVel.clone().negate().multiplyScalar(0.1), true);


    // 6. Jump Logic
    if (controls.jump) {
      if (jumpStartTime === null) {
        setJumpStartTime(Date.now());
      }
    } else {
      if (jumpStartTime !== null) {
        // Released space
        const holdDuration = Date.now() - jumpStartTime;
        const chargeRatio = Math.min(holdDuration / JUMP_CHARGE_TIME, 1);
        const jumpForce = JUMP_FORCE_MIN + (JUMP_FORCE_MAX - JUMP_FORCE_MIN) * chargeRatio;
        
        // Check if grounded (raycast down)
        const rayOrigin = playerPos.clone().add(upVector.clone().multiplyScalar(1.1)); // Start slightly inside/above
        const rayDir = upVector.clone().negate();
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 2.0, true); // Max toi
        
        // Simple ground check: if we are close to the planet radius (10)
        // Or use the raycast result
        if (hit && (hit as any).toi < 1.5) {
             rigidBodyRef.current.applyImpulse(upVector.clone().multiplyScalar(jumpForce * rigidBodyRef.current.mass()), true);
        }

        setJumpStartTime(null);
      }
    }

    // 7. Camera Follow
    const cameraPos = playerPos.clone().add(upVector.clone().multiplyScalar(1.5));
    camera.position.lerp(cameraPos, 0.2);
    camera.up.copy(upVector);

    // 8. Network Update
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
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
};
