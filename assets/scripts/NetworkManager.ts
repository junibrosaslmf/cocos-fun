import { _decorator, Component, Label, Node, sp } from 'cc';

const { ccclass, property } = _decorator;

import Colyseus from 'db://colyseus-sdk/colyseus.js';
import { GamePhase } from './GamePhase';

@ccclass('NetworkManager')
export class NetworkManager extends Component {
  @property hostname = 'localhost';
  @property port = 2567;
  @property useSSL = false;
  @property gameRoom: string = 'game_room';

  @property(Node) projectile: Node = null!;
  @property([sp.Skeleton]) axieSpines: sp.Skeleton[] = []!;
  @property(Label) labelCurrTurn: Label = null;
  @property(Label) labelCountdown: Label = null!;
  @property(Node) meIndicator: Node = null!;
  @property(Node) oppIndicator: Node = null!;
  @property speedStakePower: number = 0.2!;
  @property(Node) panelEnd: Node = null!;
  @property(Label) labelEnd: Label = null!;

  client: Colyseus.Client = null;
  room: Colyseus.Room = null;

  powerRation: number = 0;
  isStakingPower: boolean = false;
  allowStakingPower: boolean = false;
  myFaceDirection: number = 1;
  myIndex: number;

  start() {
    // Instantiate Colyseus Client
    // connects into (ws|wss)://hostname[:port]
    this.client = new Colyseus.Client(`${this.useSSL ? "wss" : "ws"}://${this.hostname}${([443, 80].includes(this.port) || this.useSSL) ? "" : `:${this.port}`}`);

    // Connect into the room
    this.connect();
  }

  async connect() {
    try {
      this.panelEnd.active = false;

      // join/create a room
      this.room = await this.client.joinOrCreate(this.gameRoom);

      // log successfully joined player
      console.log('joined successfully!');
      console.log("user's sessionId: ", this.room.sessionId);

      // add new player
      this.room.state.players.onAdd(this.addNewPlayer.bind(this));

      // listen for any changes in the value of a state
      this.room.state.listen('phase', (value) => {
        if (value === GamePhase.INGAME) {
          this.panelEnd.active = false;
          this.room.state.listen('secondsLeft', this.updateLabelCountdown.bind(this));
          this.room.state.listen('currTurn', this.updateEnterTurn.bind(this));
        }
        else if (value === GamePhase.ENDED) {
          this.panelEnd.active = true;
          let winnerSessionId = this.room.state.winner;
          this.labelEnd.string = winnerSessionId == this.room.sessionId ? "YOU WIN" : "YOU LOSE";
        }
        else if (value === GamePhase.DRAW) {
          this.panelEnd.active = true;
          this.labelEnd.string = 'GAME DRAW';
        }
      });

      this.room.onStateChange(this.onStateChange.bind(this));

      this.room.onLeave((code) => {
        console.log('on leave...');
        console.log('onLeave', code);
      });
    } catch (e) {
      console.log(e);
    }
  }

  onStateChange(state: any) {
    let projectileState = state.projectile;

    if (!projectileState) {
      this.projectile.active = false;
    } else {
      this.projectile.active = true;
      this.projectile.setPosition(projectileState.x, projectileState.y, 0);
    }
  }

  addNewPlayer(player, index) {
    if (player.sessionId === this.room.sessionId) {
      this.myIndex = index;
    }

    this.appearAxie(index);
    this.updateAxieView(index, player.isMoving, player.faceDirection);

    player.listen('isMoving', () => {
      this.updateAxieView(index, player.isMoving, player.faceDirection);
    });

    player.listen('faceDirection', () => {
      this.updateAxieView(index, player.isMoving, player.faceDirection);
    });

    player.listen('x', () => {
      this.updateAxiePosition(index, player.x);
    });
  }

  appearAxie(index: number) {
    let axie = this.axieSpines[index];
    axie.node.active = true;
  }

  updateAxieView(index: number, isMoving: boolean, faceDirection: number) {
    if (index === this.myIndex) {
      this.myFaceDirection = faceDirection;
    }

    let axie = this.axieSpines[index];

    if (isMoving) axie.setAnimation(0, 'action/run', true);
    else axie.setAnimation(0, 'action/idle/normal', true);

    axie.node.setScale(-faceDirection * 0.1, 0.1, 0.1);
  }

  updateAxiePosition(index: number, x: number) {
    let axie = this.axieSpines[index];
    axie.node.setPosition(x, 0, 0);
    if (index === this.myIndex) {
      this.meIndicator.setPosition(x, 0, 0);
    }
    else {
      this.oppIndicator.setPosition(x, 0, 0);
    }
  }

  updateLabelCountdown() {
    let seconds = Math.max(0, Math.ceil(this.room.state.secondsLeft));
    this.labelCountdown.string = seconds.toString();
  }

  updateEnterTurn(newValue, prevValue) {
    if (newValue !== prevValue) {
      this.allowStakingPower = true;
      this.isStakingPower = false;
    }

    let currTurn = this.room.state.currTurn;
    let myTurn = this.room.state.players.findIndex(p => p.sessionId === this.room.sessionId);
    this.labelCurrTurn.string = currTurn === myTurn ? 'Your Turn' : 'Opponent turn';
  }
}


