import { Command } from '@colyseus/command';
import { Client, Room } from 'colyseus';
import { GameRoom } from '../GameRoom';
import { Projectile } from '../schema/GameRoomState';

export class CmdStartMove extends Command<GameRoom, {
  client: Client;
  direction: number; // -1 for left, 1 for right
}> {
  // Implement Game Logic
  validate(payload: this['payload']): boolean {
    if (payload.direction !== -1 && payload.direction !== 1) return false;
    let playerIndex = this.state.players.findIndex(p => p.sessionId === payload.client.sessionId);
    if (playerIndex !== this.state.currTurn) return false;
    return true;
  }

  execute(payload: this['payload']): void | Command<Room<any, any>, unknown> | Command<Room<any, any>, unknown>[] | Promise<Command<Room<any, any>, unknown>[]> | Promise<Command<Room<any, any>, unknown>> | Promise<unknown> {
    let player = this.state.players.find(p => p.sessionId === payload.client.sessionId);

    player.faceDirection = payload.direction;
    player.isMoving = true;
  }
}


export class CmdStopMove extends Command<GameRoom, {
  client: Client;
}> {
  // Implement Game Logic
  validate(payload: this['payload']): boolean {
    let playerIndex = this.state.players.findIndex(p => p.sessionId === payload.client.sessionId);
    if (playerIndex !== this.state.currTurn) return false;
    return true;
  }

  execute(payload: this['payload']): void | Command<Room<any, any>, unknown> | Command<Room<any, any>, unknown>[] | Promise<Command<Room<any, any>, unknown>[]> | Promise<Command<Room<any, any>, unknown>> | Promise<unknown> {
    let player = this.state.players.find(p => p.sessionId === payload.client.sessionId);
    player.isMoving = false;
  }
}

export class CmdFire extends Command<GameRoom, {
  client: Client;
  degAngle: number;
  powerRatio: number;
}> {
  // Implement Game Logic
  validate(payload: this['payload']): boolean {
    if (isNaN(payload.degAngle) || isNaN(payload.powerRatio)) return false;
    if (this.state.projectile !== null) return false;

    let playerIndex = this.state.players.findIndex(p => p.sessionId === payload.client.sessionId);
    if (playerIndex !== this.state.currTurn) return false;

    return true;
  }

  execute(payload: this['payload']): void | Command<Room<any, any>, unknown> | Command<Room<any, any>, unknown>[] | Promise<Command<Room<any, any>, unknown>[]> | Promise<Command<Room<any, any>, unknown>> | Promise<unknown> {
    let player = this.state.players.find(p => p.sessionId === payload.client.sessionId);
    let degAngle = payload.degAngle;
    if (degAngle < 0) degAngle += 180; // sync degAngle from cocos angle system into math angle system
    let radAngle = Math.PI * degAngle / 180;
    let power = payload.powerRatio * 2000;

    let newProjectile = new Projectile().assign({
      x: player.x,
      y: 0,
      vx: Math.cos(radAngle) * power,
      vy: Math.sin(radAngle) * power,
    });

    this.state.projectile = newProjectile;
  }
}