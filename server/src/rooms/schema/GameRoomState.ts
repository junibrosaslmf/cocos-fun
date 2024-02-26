import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GamePhase } from "../GamePhase";

export class PlayerState extends Schema {
  @type('string') sessionId: string;
  @type('number') x: number;
  @type('boolean') isAlive: boolean;
  @type('number') faceDirection: number;
  @type('boolean') isMoving: boolean;
}

export class Projectile extends Schema {
  @type('number') x: number;
  @type('number') y: number;
  @type('number') vx: number; // vector x
  @type('number') vy: number; // vector y
}

export class GameRoomState extends Schema {
  @type('number') phase: GamePhase = GamePhase.WAITING;
  @type([PlayerState]) players: ArraySchema<PlayerState> = new ArraySchema();
  @type(Projectile) projectile: Projectile = null;

  @type('number') secondsLeft: number = 0;
  @type('number') currTurn: number = 0;
  @type('string') winner: string = '';
}
