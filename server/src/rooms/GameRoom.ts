import { Dispatcher } from "@colyseus/command";
import { Client, Room } from "@colyseus/core";
import { GamePhase } from "./GamePhase";
import { CmdFire, CmdStartMove, CmdStopMove } from "./commands/GameRoomCmds";
import { GameRoomState, PlayerState } from "./schema/GameRoomState";

export const GameRoomConfig = {
  MOVE_SPEED: 150,
  FIELD_WIDTH: 1800,
  TIME_PER_TURN: 20,
  MAX_PLAYER: 2,
  GRAVITY: 1000,
  POWER_BASE: 2000,
  HIT_RADIUS: 80
}

export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);

  onCreate(options: any) {
    this.maxClients = 2;
    this.setState(new GameRoomState());

    this.onMessage('start-move', this.handleStartMoveMsg.bind(this));
    this.onMessage('stop-move', this.handleStopMoveMsg.bind(this));
    this.onMessage('fire', this.handleFireMsg.bind(this));

    this.setPatchRate(16);
    this.setSimulationInterval(this.update.bind(this));
  }

  onJoin(client: Client, options: any) {
    // Insert Player inot state.players
    let newPlayer = new PlayerState().assign({
      sessionId: client.sessionId,
      x: Math.random() * 1800 - 900,
      isAlive: true,
      faceDirection: 1,
      isMoving: false // is it moving at first
    });

    this.state.players.push(newPlayer);

    if (this.hasReachedMaxClients()) {
      this.lock(); // so no other players can join if someone left

      // Start the game
      this.state.phase = GamePhase.INGAME;
      this.enterTurn(0); // call the first player
    }
  }

  async onLeave(client: Client, consented: boolean) {
    //determine other player as winner
    for (let c of this.clients) {
      if (c.sessionId != client.sessionId) {
        this.state.winner = c.sessionId;
        break;
      }
    }
    this.state.phase = GamePhase.ENDED;
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  handleStartMoveMsg(client: Client, msg: any) {
    this.dispatcher.dispatch(new CmdStartMove(), {
      client: client,
      direction: msg.direction
    })
  }

  handleStopMoveMsg(client: Client, msg: any) {
    this.dispatcher.dispatch(new CmdStopMove(), {
      client: client
    });
  }

  handleFireMsg(client: Client, msg: any) {
    this.dispatcher.dispatch(new CmdFire(), {
      client: client,
      degAngle: msg.angle,
      powerRatio: msg.power
    })
  }

  enterTurn(playerIndex: number) {
    this.state.currTurn = playerIndex;
    this.state.secondsLeft = 20;
    this.state.players.forEach(player => player.isMoving = false); // halt all players movements
    this.state.projectile = null;
  }

  update(msDt: number) {
    let secDt = msDt / 1000;
    let currTurn = this.state.currTurn;

    // only update in ingame
    if (this.state.phase === GamePhase.INGAME) {
      if (this.state.projectile !== null) {
        let { vx, vy } = this.state.projectile;

        this.state.projectile.x += vx * secDt;
        this.state.projectile.y += vy * secDt;
        this.state.projectile.vy += -GameRoomConfig.GRAVITY * secDt;

        if (this.state.projectile.y < 0) {
          let ax = this.state.projectile.x;
          // check if any player is hit
          this.state.players.forEach(player => {
            let bx = player.x;
            let distance = Math.abs(ax - bx);
            if (distance <= GameRoomConfig.HIT_RADIUS) {
              player.isAlive = false;
            }
          });

          this.state.projectile = null;
          this.enterTurn(1 - currTurn);
        }
      }

      // update players
      let playingPlayerState = this.state.players[this.state.currTurn];
      if (playingPlayerState.isMoving) {
        let offset = GameRoomConfig.MOVE_SPEED * playingPlayerState.faceDirection * secDt;
        playingPlayerState.x += offset;
      }

      // reduce time countdown -> change turn if timeout
      if (this.state.secondsLeft <= 0) {
        this.enterTurn(1 - currTurn);
      } else {
        this.state.secondsLeft -= secDt;
      }

      // check number of player alive, if there only one, announce winner
      let alivePlayers: string[] = [];
      this.state.players.forEach(player => {
        if (player.isAlive) alivePlayers.push(player.sessionId);
      });

      if (alivePlayers.length === 1) {
        this.state.phase = GamePhase.ENDED;
        this.state.winner = alivePlayers[0];
      }
      else if (alivePlayers.length === 0) {
        this.state.phase = GamePhase.DRAW;
      }
    }
  }
}
