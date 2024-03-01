import { _decorator, Component, Label, Node, ProgressBar, sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameClient')
export class GameClient extends Component {
    @property hostname = 'localhost'!;
    @property port = 2567!;
    @property useSSL = false!;
    @property gameRoom: string = 'game_room'!;

    @property(Node) projectile: Node = null!;
    @property([sp.Skeleton]) axieSpines: sp.Skeleton[] = []!;
    @property(Label) labelCountdown: Label = null!;
    @property(Label) labelCurrTurn: Label = null!;
    @property(ProgressBar) pbPowerRatio: ProgressBar = null!;
    @property(Node) meIndicator: Node = null!;
    @property(Node) oppIndicator: Node = null!;
    @property speedStakePower: number = 0.2!;
    @property(Node) panelEnd: Node = null!;
    @property(Label) labelEnd: Label = null!;

    start() {
        this.labelCountdown.string = "john doe";
    }

    update(deltaTime: number) {

    }
}

