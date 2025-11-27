# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gravity Hoppers is a multiplayer 3D space game where players navigate between planets using jetpack thrust. The game features a multi-planet system with dynamic gravity that pulls players toward nearby celestial bodies, with player orientation automatically adjusting to align with the nearest planet's surface normal.

## Development Commands

```bash
# Start client (Vite dev server on default port)
npm run dev:client

# Start server (Colyseus game server on port 2567)
npm run dev:server

# Build all packages
npm run build
```

Both client and server should be running simultaneously for multiplayer functionality.

## Architecture

### Monorepo Structure

- `packages/client` - React Three Fiber frontend with Rapier physics
- `packages/server` - Colyseus multiplayer game server
- `packages/common` - Shared constants (currently minimal)

### Client Architecture

Built with React Three Fiber (@react-three/fiber) and Rapier physics (@react-three/rapier).

**Core Flow:**
1. `App.tsx` sets up Canvas, Physics context (zero gravity), and NetworkManager
2. `PlanetSystem.tsx` generates 7 planets with seeded random positions; exports `usePlanetConfigs()` hook for gravity calculations
3. `Player.tsx` implements the physics loop:
   - Calculates combined gravitational force from all planets using inverse-square law
   - Applies thrust forces based on camera direction (keyboard/mouse input)
   - Aligns player orientation to nearest planet's surface normal via quaternion slerp
   - Camera follows player with planet-relative "up" vector
4. `NetworkManager.tsx` manages Colyseus connection and renders `RemotePlayer` components for other players

**Key Physics Constants (Player.tsx):**
- `BASE_GRAVITY_FORCE = 20` - gravity multiplier
- `THRUST_FORCE_MAX = 30` - maximum jetpack thrust
- `THRUST_RAMP_SPEED = 2.0` - thrust acceleration rate

### Server Architecture

Colyseus-based multiplayer server with Express.

- `GameRoom.ts` - Main room handling player join/leave and position updates
- `GameState.ts` - Schema definitions using @colyseus/schema for automatic state synchronization

Players send "updatePosition" messages with position (x,y,z) and rotation quaternion (qx,qy,qz,qw).

### Controls

- Mouse look via PointerLockControls
- Space / Left Click: Forward thrust (camera direction)
- S / Right Click: Reverse thrust
