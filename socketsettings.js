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

                let modSyncButtonEnabled = game.settings.get("SocketSettings", "enableFullModuleSync");

                // Standard sync button
                let ssSyncButton = $(`<b class="notes socket-settings-button" title="${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-name-all")}">Sync</b>`);
                // Set blank player data, sync to all
                ssSyncButton.data('player', '');
                let ssModuleSyncButton
                if (modSyncButtonEnabled) {
                    // Full module sync button
                    ssModuleSyncButton = $(`<b class="notes socket-settings-button module-button" title="${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-name-all")}">Sync</b>`);
                    // Set blank player data, sync to all
                    ssModuleSyncButton.data('player', '');
                }

                // Standard sync button
                // On leftclick
                ssSyncButton.click((el) => {
                    let playerID = $(el.currentTarget).data().player;
                    let [moduleKey, ...settingsKey] = $(el.currentTarget).siblings('.form-fields').find('input, select').attr('name').split('.');
                    settingsKey = settingsKey.join('.');
                    let settingsVal;
                    var settingsInput = $(el.currentTarget).siblings('.form-fields').find('input, select')
                    if (settingsInput.is('input[type=checkbox]')) {
                        settingsVal = settingsInput[0].checked;
                    } else {
                        settingsVal = settingsInput.val();
                    }

                    if (moduleKey && settingsKey && settingsVal !== undefined) {
                        SocketSettings.socketHelper.sendData({
                            type: SSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING,
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
                // TODO: Merge this with the module version, they both do the exact same thing
                ssSyncButton.contextmenu((el) => {
                    if (++SocketSettings.activePlayersIndex > SocketSettings.activePlayers.length - 1) {
                        SocketSettings.activePlayersIndex = -1;
                    }

                    if (SocketSettings.activePlayersIndex >= 0) {
                        $('.socket-settings-button').text(`Sync: ${SocketSettings.activePlayers[SocketSettings.activePlayersIndex].name}`);
                        $('.socket-settings-button').title(`${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${SocketSettings.activePlayers[SocketSettings.activePlayersIndex].name}`)
                        $('.socket-settings-button').data("player", SocketSettings.activePlayers[SocketSettings.activePlayersIndex]?.id);
                    } else {
                        $('.socket-settings-button').text('Sync');
                        $('.socket-settings-button').title(`${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-name-all")}`)
                        $('.socket-settings-button').data("player", '');
                    }

                });

                // Module sync button
                // On leftclick

                if (modSyncButtonEnabled) {
                    ssModuleSyncButton.click((el) => {
                        let playerID = $(el.currentTarget).data().player;

                        // let moduleKey = $(el.currentTarget).parent().siblings('.form-group').find('input, select').attr('name').split('.')[0];
                        let moduleKey = $(el.currentTarget).parent().nextAll('.form-group:not(.submenu)').first().find('input, select').attr('name')?.split('.')[0];
                        if (!moduleKey) {
                            ui.notifications.notify(game.i18n.localize("SOCKETSETTINGS.notif.no-client-settings"));
                            return;
                        }
                        // Loop through all settings
                        // let clientConfigObjects = [...game.settings.settings].filter((arr)=>{return arr[0].indexOf(moduleKey) === 0 && arr[1].scope == 'client'})
                        let clientConfigObjects = [...game.settings.settings].filter((arr) => {
                            return arr[0].indexOf(moduleKey) === 0 && arr[1].config && arr[1].scope == 'client'
                        })

                        let settingsKeyVals = [];
                        console.log(clientConfigObjects);
                        for (let [settingKey, settingObj] of clientConfigObjects) {
                            let inputEl = $(`[name=${settingKey.replace(/\./g, '\\.')}]`);
                            let settingVal;
                            if (inputEl.attr('type') == "checkbox") {
                                settingVal = inputEl[0].checked;
                            } else {
                                settingVal = inputEl.val();
                            }
                            settingsKeyVals.push([settingKey.split('.').slice(1).join('.'), settingVal]);
                            console.log(`${settingKey} : ${settingVal}`);
                        }

                        if (moduleKey && settingsKeyVals.length > 0) {
                            SocketSettings.socketHelper.sendData({
                                type: SSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING_ARRAY,
                                target: playerID || '',
                                payload: {
                                    moduleKey: moduleKey,
                                    settingsKeyVals: settingsKeyVals
                                }
                            })
                        } else if (settingsKeyVals.length <= 0) {
                            ui.notifications.notify(game.i18n.localize("SOCKETSETTINGS.notif.no-client-settings"));
                        }
                    });

                    // On rightclick
                    ssModuleSyncButton.contextmenu((el) => {
                        if (++SocketSettings.activePlayersIndex > SocketSettings.activePlayers.length - 1) {
                            SocketSettings.activePlayersIndex = -1;
                        }

                        if (SocketSettings.activePlayersIndex >= 0) {
                            $('.socket-settings-button').text(`Sync: ${SocketSettings.activePlayers[SocketSettings.activePlayersIndex].name}`);
                            $('.socket-settings-button').title(`${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${SocketSettings.activePlayers[SocketSettings.activePlayersIndex].name}`)
                            $('.socket-settings-button').data("player", SocketSettings.activePlayers[SocketSettings.activePlayersIndex]?.id);
                        } else {
                            $('.socket-settings-button').text('Sync');
                            $('.socket-settings-button').title(`${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-name-all")}`)
                            $('.socket-settings-button').data("player", '');
                        }

                    });
                }

                // Add the standard buttons
                html.find("[data-tab=modules],[data-tab=core],[data-tab=system]").find(".form-group > .form-fields > input, select").filter(function (index) {
                    // We only want to add the button to client settings
                    return game.settings.settings.get($(this).attr('name'))?.scope == 'client';
                }).parent().parent().append(ssSyncButton); // Stability concern... Consider switching to a better selector instead of double parents



                if (modSyncButtonEnabled) {
                    // Add the module buttons
                    let ssModContainer = $(`<div class="form-group">
                    <label>SocketSettings Module Sync</label>
                    <p class="notes">Sync all client settings for this module</p>`);
                    ssModContainer.append(ssModuleSyncButton);

                    if (game.modules.get("tidy-ui_game-settings")?.active) {
                        html.find("[data-tab=modules]").find("article > section").prepend(ssModContainer);
                    } else {
                        html.find("[data-tab=modules]").find(".module-header").after(ssModContainer);
                    }
                }
            };
        }, 100);
    }
}

class SSSocketHelper {

    static socketName = "module.SocketSettings";

    // In case we want to add more functionality
    static SOCKETMESSAGETYPE = {
        FORCE_SETTING: 1,
        FORCE_SETTING_ARRAY: 2
    }

    constructor() {
        game.socket.on(SSSocketHelper.socketName, this._onData);
    }

    async _onData(data) {
        switch (data.type) {
            case SSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING:
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
                    } else if(data.render){
                        ui[data.render]?.render();
                    }
                }
                break;
            case SSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING_ARRAY:
                if (game.user.isGM) {
                    return;
                }
                if (data.target && data.target != game.userId) {
                    return;
                }
                if (data.payload.moduleKey && data.payload.settingsKeyVals) {
                    for (let setting of data.payload.settingsKeyVals) {
                        console.log(data.payload.moduleKey + '.' + setting[0] + '/' + setting[1]);
                        await game.settings.set(data.payload.moduleKey, setting[0], setting[1]);
                    }

                    ui.notifications.notify(`${game.i18n.localize("SOCKETSETTINGS.notif.multisetting-precount")} ${data.payload.settingsKeyVals.length} ${game.i18n.localize("SOCKETSETTINGS.notif.multisetting-postcount")}: <b>${data.payload.moduleKey}</b>`);

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
        game.socket.emit(SSSocketHelper.socketName, data);
    }
}


Hooks.on("renderSettingsConfig", SocketSettings.setupSyncButtons);
Hooks.once("ready", () => {
    SocketSettings.socketHelper = new SSSocketHelper();
    game.settings.register("SocketSettings", "enableFullModuleSync", {
        name: "SOCKETSETTINGS.settings.mod-sync.name",
        hint: "SOCKETSETTINGS.settings.mod-sync.hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
});
Hooks.on("renderPlaylistDirectory", (app, html, data)=> {

    if(!game.user.isGM){
        return;
    }

    let ssSoundButton = $(`<b class="notes socket-settings-button socket-settings-playlist" title="${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-title")} ${game.i18n.localize("SOCKETSETTINGS.ui.sync-button-name-all")}">Sync</b>`)
    ssSoundButton.click((el)=>{
        // Sync this vol slider to all players
        let settingName = $(el.currentTarget).siblings('input').attr('name');
        let settingVal = $(el.currentTarget).siblings('input').val();
        SocketSettings.socketHelper.sendData({
            type: SSSocketHelper.SOCKETMESSAGETYPE.FORCE_SETTING,
            target: '',
            render: 'playlists',
            payload: {
                moduleKey: 'core',
                settingKey: settingName,
                settingVal: settingVal
            }
        });
    });

    ssSoundButton.contextmenu((el) => {
        // TODO: Add targetting. Difficult with the minimal UI space we have
        console.log("SocketSettings: Target players not supported on playlist levels");
    });

    html.find(".global-volume-slider").after(ssSoundButton);
});