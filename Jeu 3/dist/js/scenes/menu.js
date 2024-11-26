class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    preload() {
    }

    create() {
        this.clickButton = this.add.text(100, 100, 'Start Game', { fill: '#0f0' })
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('Game');
            });
    }

    update(time, delta) {
    }

    buttonClickDown() {
        this.scene.start('Game');
    }

    enterButtonHoverState() {
        this.clickButton.setStyle({ fill: '#ff0'});
    }

    enterButtonRestState() {
        this.clickButton.setStyle({ fill: '#0f0' });
    }
}

export default Menu;