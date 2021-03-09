/**
 * SocketSettings by Blitz
 * 
 * Send client-settings directly to your players
 */

/**
 * Forgive me, I do not wish to spend more than a day on this
 */

class SocketSettings {

    static moduleName = "SocketSettings"
    static socketHelper;
    static activePlayers = [];
    static activePlayersIndex = -1;

    static getActiveUsers() {
        // Previously used .active, but it's a little bit buggy, requiring users to interact in some way at times.
        // Now just checking that the user is not a GM, attempting to sync an unconnected player causes no problems.
        // return game.users.filter((user)=>user.active&&!user.isGM);
        return game.users.filter((user) => !user.isGM);
    }

    static setupSyncButtons(app, html) {
        if (!game.user.isGM) {
            // TODO: Implement optional "Set to GM" button
            return;
        }

        // We need to wait for the Settings to be `rendered`, and there is no hook
        // 100ms interval until it is rendered
        let settingsInterval = setInterval(() => {
            if (app.rendered) {
                SocketSettings.activePlayers = SocketSettings.getActiveUsers();
                // Reset to -1, "sync to all"
                SocketSettings.activePlayersIndex = -1;

                clearInterval(settingsInterval);

                let fcsSyncButton = $(`<b class="notes socket-settings-button">Sync</b>`);
                // Set blank player data, sync to all
                fcsSyncButton.data('player', '');

                // On leftclick
                fcsSyncButton.click((el) => {
                    let playerID = $(el.currentTarget).data().player;
                    let [moduleKey, settingsKey] = $(el.currentTarget).siblings('.form-fields').find('input, select').attr('name').split('.');

                    let settingsVal;
                    var settingsInput = $(el.currentTarget).siblings('.form-fields').find('input, select')
                    if (settingsInput.is('input[type=checkbox]')) {
                        settingsVal = settingsInput[0].checked;
                    } else {
                        settingsVal = settingsInput.val();
                    }

                    if (moduleKey && settingsKey && settingsVal !== undefined) {
                        SocketSettings.socketHelper.sendData({
                            type: FCSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING,
                            target: playerID || '',
                            payload: {
                                moduleKey: moduleKey,
                                settingKey: settingsKey,
                                settingVal: settingsVal
                            }
                        })
                    }
                });

                // On rightclick
                fcsSyncButton.contextmenu((el) => {
                    if (++SocketSettings.activePlayersIndex > SocketSettings.activePlayers.length - 1) {
                        SocketSettings.activePlayersIndex = -1;
                    }
                    $('.socket-settings-button').text(`${SocketSettings.activePlayersIndex < 0?'Sync':`Sync: ${SocketSettings.activePlayers[SocketSettings.activePlayersIndex].name}`}`);
                    $('.socket-settings-button').data("player", SocketSettings.activePlayers[SocketSettings.activePlayersIndex]?.id || '');
                })

                html.find("[data-tab=modules],[data-tab=core],[data-tab=system]").find(".form-group > .form-fields > input, select").filter(function (index) {
                    // We only want to add the button to client settings
                    return game.settings.settings.get($(this).attr('name'))?.scope == 'client';
                }).parent().parent().append(fcsSyncButton); // Stability concern... Consider switching to a better selector instead of double parents
            };
        }, 100);
    }
}

class FCSSocketHelper {

    static socketName = "module.SocketSettings";

    // In case we want to add more functionality
    static SOCKETMESSAGETYPE = {
        FORCE_SETTING: 1
    }

    constructor() {
        game.socket.on(FCSSocketHelper.socketName, this._onData);
    }

    async _onData(data) {
        switch (data.type) {
            case FCSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING:
                if (game.user.isGM) {
                    return;
                }
                if (data.target && data.target != game.userId) {
                    return;
                }
                if (data.payload.moduleKey && data.payload.settingKey && data.payload.settingVal !== undefined) {
                    console.log(data.payload.moduleKey + '.' + data.payload.settingKey + '/' + data.payload.settingVal);
                    await game.settings.set(data.payload.moduleKey, data.payload.settingKey, data.payload.settingVal);
                    ui.notifications.notify(`${game.i18n.localize("SOCKETSETTINGS.notif.setting-updated")}: ${data.payload.moduleKey}.${data.payload.settingKey} -> <b>${data.payload.settingVal}</b>`);
                    if (data.shouldRefresh) {
                        window.location.reload();
                    }
                }
                break;
            default:
                break;
        }
    }

    sendData(data) {
        game.socket.emit(FCSSocketHelper.socketName, data);
    }
}


Hooks.on("renderSettingsConfig", SocketSettings.setupSyncButtons);
Hooks.once("ready", () => {
    SocketSettings.socketHelper = new FCSSocketHelper();
});