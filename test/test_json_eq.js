const chai = require('chai');
const expect = chai.expect;
const sinon = require("sinon");
const fs = require('fs');

Game_Interpreter = {};
Game_Interpreter.prototype = {};
$gameMessage = {};
$gameMessage.add = function(){};

PluginManager = {};
PluginManager.parameters = function(str){return {
  "Default Window Position" : 'Bottom',
  "Default Background"      : 'Window',
  "Default Scenario Folder" : '',
  "Default Scenario File"   : '',
  "Default Common Event ID" : '1',
  "Default MapID"           : '1',
  "Default EventID"         : '1',
  "IsOverwrite"             : 'true',
  "Comment Out Char"        : '%',
  "IsDebug"                 : 'false'
};};

const text2frame = require('../Text2Frame.js');

describe('Text2Frame Test', function() {
  var tests = [
    {title: "Basic",   infile: "./test/basic.txt",      mapfile: "./data/Map001.json", expfile: "./test/expected_basic.json"},
    {title: "Crlf",    infile: "./test/crlf.txt",       mapfile: "./data/Map001.json", expfile: "./test/expected_crlf.json"},
    {title: "Audio",   infile: "./test/audio.txt",      mapfile: "./data/Map001.json", expfile: "./test/expected_audio.json"},
    {title: "Extend",  infile: "./test/extend.txt",     mapfile: "./data/Map001.json", expfile: "./test/expected_extend.json"},
    {title: "Mix",     infile: "./test/mix.txt",        mapfile: "./data/Map001.json", expfile: "./test/expected_mix.json"},
    {title: "Context", infile: "./test/31-context.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_31-context.json"},
    {title: 'Show Choices/document-sample', infile: "./test/91-show-choices/document-sample.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_document-sample.json"},
    {title: 'Show Choices/all-args', infile: "./test/91-show-choices/all-args.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_all-args.json"},
    {title: 'Show Choices/no-args', infile: "./test/91-show-choices/no-args.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_no-args.json"},
    {title: 'Show Choices/nest', infile: "./test/91-show-choices/nest.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_nest.json"},
    {title: 'Show Choices/ten-choices', infile: "./test/91-show-choices/ten-choices.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_ten-choices.json"},
    {title: 'Show Choices/practical-case', infile: "./test/91-show-choices/practical-case.txt", mapfile: "./data/Map001.json", expfile: "./test/91-show-choices/expected_practical-case.json"},
    {title: 'Input Number', infile: "./test/92-input-number.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_92-input-number.json"},
    {title: 'Select Item', infile: "./test/93-select-item.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_93-select-item.json"},
    {title: 'Show Scrolling Text', infile: "./test/94-show-scrolling-text.txt", mapfile: "./data/Map001.json", expfile: "./test/expected_94-show-scrolling-text.json"},
    {title: "Control variables/constant", infile: "./test/35-control_variables/constant.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_constant.json"},
    {title: "Control variables/random", infile: "./test/35-control_variables/random.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_random.json"},
    {title: "Control variables/gamedata", infile: "./test/35-control_variables/gamedata.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_gamedata.json"},
    {title: "Control variables/variable", infile: "./test/35-control_variables/variable.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_variable.json"},
    {title: "Control variables/script", infile: "./test/35-control_variables/script.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_script.json"},
    {title: "Control variables/misc", infile: "./test/35-control_variables/misc.txt", mapfile: "./data/Map001.json", expfile: "./test/35-control_variables/expected_misc.json"},
    {title: "Switch", infile: "./test/38-switches.txt", mapfile: "./data/Map001.json", expfile: "./test/38-expected_switches.json"},
    {title: "Self switch", infile: "./test/39-self_switches.txt", mapfile: "./data/Map001.json", expfile: "./test/39-expected_self_switches.json"},
    {title: "Timer", infile: "./test/40-timer.txt", mapfile: "./data/Map001.json", expfile: "./test/40-expected_timer.json"},
    {title: "Comment Out 1", infile: "./test/43-bug-comment-out.txt", mapfile: "./data/Map001.json", expfile: "./test/43-expected_bug-comment-out.json"},
    {title: "Comment Out 2", infile: "./test/45-comment-out.txt", mapfile: "./data/Map001.json", expfile: "./test/45-expected_comment-out.json"},
    {title: "Show Picture", infile: "./test/56-show-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/56-expected_show-picture.json"},
    {title: "Move Picture", infile: "./test/57-move-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/57-expected_move-picture.json"},
    {title: "Rotate Picture", infile: "./test/58-rotate-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/58-expected_rotate_picture.json"},
    {title: "Tint Picture", infile: "./test/59-tint-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/59-expected_tint-picture.json"},
    {title: "Erase Picture", infile: "./test/60-erase-picture.txt", mapfile: "./data/Map001.json", expfile: "./test/60-expected_erase-picture.json"}, 
    {title: "Conditional Branch/if-else", infile: "./test/50-if-else/if-else.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_if-else.json"},
    {title: "Conditional Branch/Switch", infile: "./test/50-if-else/switch.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_switch.json"},
    {title: "Conditional Branch/SelfSwitch", infile: "./test/50-if-else/self-switch.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_self-switch.json"},
    {title: "Conditional Branch/Variable", infile: "./test/50-if-else/variable.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_variable.json"},
    {title: "Conditional Branch/Timer", infile: "./test/50-if-else/timer.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_timer.json"},
    {title: "Conditional Branch/Actor", infile: "./test/50-if-else/actor.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_actor.json"},
    {title: "Conditional Branch/Enemy", infile: "./test/50-if-else/enemy.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_enemy.json"},
    {title: "Conditional Branch/Character", infile: "./test/50-if-else/character.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_character.json"},
    {title: "Conditional Branch/Vehicle", infile: "./test/50-if-else/vehicle.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_vehicle.json"},
    {title: "Conditional Branch/Gold", infile: "./test/50-if-else/gold.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_gold.json"},
    {title: "Conditional Branch/Item", infile: "./test/50-if-else/item.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_item.json"},
    {title: "Conditional Branch/Weapon", infile: "./test/50-if-else/weapon.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_weapon.json"},
    {title: "Conditional Branch/Armor", infile: "./test/50-if-else/armor.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_armor.json"},
    {title: "Conditional Branch/Button", infile: "./test/50-if-else/button.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_button.json"},
    {title: "Conditional Branch/Script", infile: "./test/50-if-else/script.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_script.json"},
    {title: "Conditional Branch/Error", infile: "./test/50-if-else/error.txt", mapfile: "./data/Map001.json", expfile: "./test/50-if-else/expected_error.json"},
    {title: "Loop", infile: "./test/51-loop.txt", mapfile: "./data/Map001.json", expfile: "./test/51-expected_loop.json"},
    {title: "Break Loop", infile: "./test/52-break-loop.txt", mapfile: "./data/Map001.json", expfile: "./test/52-expected_break-loop.json"},
    {title: "Exit Event Processing", infile: "./test/53-exit-event-processing.txt", mapfile: "./data/Map001.json", expfile: "./test/53-expected_exit-event-processing.json"},
    {title: "Label", infile: "./test/54-label.txt", mapfile: "./data/Map001.json", expfile: "./test/54-expected_label.json"},
    {title: "Jump to Label", infile: "./test/55-jump-to-label.txt", mapfile: "./data/Map001.json", expfile: "./test/55-expected_jump-to-label.json"},
    {title: "Change Skill", infile: "./test/actor/change-skill.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-skill.json"},
    {title: "Name", infile: "./test/67-name.txt", mapfile: "./data/Map001.json", expfile: "./test/67-expected_name.json"},
    {title: "Move Picture MZ", infile: "./test/69-move-picture-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/69-expected_move-picture-mz.json"},
    {title: "Conditional Branch/Button-MZ", infile: "./test/70-if-else-button-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/70-expected_if-else-button-mz.json"},
    {title: "Control Variables/Last-MZ", infile: "./test/71-control-variables-last-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/71-expected_control-variables-last-mz.json"},
    {title: "Movement / Set Event Location", infile: "./test/movement/set-event-location.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_set-event-location.json"},
    {title: "Movement / Set Vehicle Location", infile: "./test/movement/set-vehicle-location.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_set-vehicle-location.json"},
    {title: "Movement / Transfer Player", infile: "./test/movement/transfer-player.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_transfer-player.json"},
    {title: "Party / Change Gold", infile: "./test/party/change-gold.txt", mapfile: "./data/Map001.json", expfile: "./test/party/expected_change-gold.json"},
    {title: "Party / Change Items", infile: "./test/party/change-items.txt", mapfile: "./data/Map001.json", expfile: "./test/party/expected_change-items.json"},
    {title: "Party / Change Weapons", infile: "./test/party/change-weapons.txt", mapfile: "./data/Map001.json", expfile: "./test/party/expected_change-weapons.json"},
    {title: "Party / Change Armors", infile: "./test/party/change-armors.txt", mapfile: "./data/Map001.json", expfile: "./test/party/expected_change-armors.json"},
    {title: "Party / Change Party Member", infile: "./test/party/change-party-member.txt", mapfile: "./data/Map001.json", expfile: "./test/party/expected_change-party-member.json"},
    {title: "Actor / Change HP", infile: "./test/actor/change-hp.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-hp.json"},
    {title: "Actor / Change MP", infile: "./test/actor/change-mp.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-mp.json"},
    {title: "Actor / Change TP", infile: "./test/actor/change-tp.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-tp.json"},
    {title: "Actor / Change State", infile: "./test/actor/change-state.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-state.json"},
    {title: "Actor / Recover All", infile: "./test/actor/recover-all.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_recover-all.json"},
    {title: "Actor / Change Exp", infile: "./test/actor/change-exp.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-exp.json"},
    {title: "Actor / Change Level", infile: "./test/actor/change-level.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-level.json"},
    {title: "Actor / Change Parameter", infile: "./test/actor/change-parameter.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-parameter.json"},
    {title: "Actor / Change Equipment", infile: "./test/actor/change-equipment.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-equipment.json"},
    {title: "Actor / Change Name", infile: "./test/actor/change-name.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-name.json"},
    {title: "Actor / Change Class", infile: "./test/actor/change-class.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-class.json"},
    {title: "Actor / Change Nickname", infile: "./test/actor/change-nickname.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-nickname.json"},
    {title: "Actor / Change Profile", infile: "./test/actor/change-profile.txt", mapfile: "./data/Map001.json", expfile: "./test/actor/expected_change-profile.json"},
    {title: "Movement / Scroll Map", infile: "./test/movement/scroll-map.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_scroll-map.json"},
    {title: "Movement / Set Movement Route", infile: "./test/movement/set-movement-route.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_set-movement-route.json"},
    {title: "Movement / Get on/off Vehicle", infile: "./test/movement/get-on-off-vehicle.txt", mapfile: "./data/Map001.json", expfile: "./test/movement/expected_get-on-off-vehicle.json"},
    {title: "character / Change Transparency", infile: "./test/character/change-transparency.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_change-transparency.json"},
    {title: "character / Change Player Followers", infile: "./test/character/change-player-followers.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_change-player-followers.json"},
    {title: "character / Gather Followers", infile: "./test/character/gather-followers.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_gather-followers.json"},
    {title: "character / Show Animation", infile: "./test/character/show-animation.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_show-animation.json"},
    {title: "character/Show Balloon Icon", infile: "./test/character/show-balloon-icon.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_show-balloon-icon.json"},
    {title: "character / Erase Event", infile: "./test/character/erase-event.txt", mapfile: "./data/Map001.json", expfile: "./test/character/expected_erase-event.json"},
    {title: "Screen / Tint Screen", infile: "./test/screen/tint-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/screen/expected_tint-screen.json"},
    {title: "Screen / Flash Screen", infile: "./test/screen/flash-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/screen/expected_flash-screen.json"},
    {title: "Screen / Shake Screen", infile: "./test/screen/shake-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/screen/expected_shake-screen.json"},
    {title: "Screen / Set Weather Effect", infile: "./test/screen/set-weather-effect.txt", mapfile: "./data/Map001.json", expfile: "./test/screen/expected_set-weather-effect.json"},
    {title: "Audio & Video / Play Movie", infile: "./test/audio-and-video/play-movie.txt", mapfile: "./data/Map001.json", expfile: "./test/audio-and-video/expected_play-movie.json"},
    {title: "System Settings / Change Victory ME", infile: "./test/system-settings/change-victory-me.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-victory-me.json"},
    {title: "System Settings / Change Defeat ME", infile: "./test/system-settings/change-defeat-me.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-defeat-me.json"},
    {title: "System Settings / Change Vehicle BGM", infile: "./test/system-settings/change-vehicle-bgm.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-vehicle-bgm.json"},
    {title: "System Settings / Change Actor Image", infile: "./test/system-settings/change-actor-images.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-actor-images.json"},
    {title: "System Settings / Change Vehicle Image", infile: "./test/system-settings/change-vehicle-image.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-vehicle-image.json"},
    {title: "Battle / Change Enemy HP", infile: "./test/battle/change-enemy-hp.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_change-enemy-hp.json"},
    {title: "Battle / Change Enemy MP", infile: "./test/battle/change-enemy-mp.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_change-enemy-mp.json"},
    {title: "Battle / Change Enemy TP", infile: "./test/battle/change-enemy-tp.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_change-enemy-tp.json"},
    {title: "Battle / Change Enemy State", infile: "./test/battle/change-enemy-state.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_change-enemy-state.json"},
    {title: "Battle / Enemy Recover All", infile: "./test/battle/enemy-recover-all.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_enemy-recover-all.json"},
    {title: "Battle / Enemy Appear", infile: "./test/battle/enemy-appear.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_enemy-appear.json"},
    {title: "Battle / Enemy Transform", infile: "./test/battle/enemy-transform.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_enemy-transform.json"},
    {title: "Battle/Show Battle Animation", infile: "./test/battle/show-battle-animation.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_show-battle-animation.json"},
    {title: "Battle/Force Action", infile: "./test/battle/force-action.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_force-action.json"},
    {title: "Battle / Abort Battle", infile: "./test/battle/abort-battle.txt", mapfile: "./data/Map001.json", expfile: "./test/battle/expected_abort-battle.json"},
    {title: "Map/Get Location Info", infile: "./test/map/get-location-info.txt", mapfile: "./data/Map001.json", expfile: "./test/map/expected_get-location-info.json"},
    {title: "Map / Change Battle Back", infile: "./test/map/change-battle-back.txt", mapfile: "./data/Map001.json", expfile: "./test/map/expected_change-battle-back.json"},
    {title: "Map / Change Parallax", infile: "./test/map/change-parallax.txt", mapfile: "./data/Map001.json", expfile: "./test/map/expected_change-parallax.json"},
    {title: "Scene Control/Battle Processing", infile: "./test/scene-control/battle-processing.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_battle-processing.json"},
    {title: "Scene Control/Shop Processing", infile: "./test/scene-control/shop-processing.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_shop-processing.json"},
    {title: "Scene Control / Name Input Processing", infile: "./test/scene-control/name-input-processing.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_name-input-processing.json"},
    {title: "Scene Control / Open Menu Screen", infile: "./test/scene-control/open-menu-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_open-menu-screen.json"},
    {title: "Scene Control / Open Save Screen", infile: "./test/scene-control/open-save-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_open-save-screen.json"},
    {title: "Scene Control / Game Over", infile: "./test/scene-control/game-over.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_game-over.json"},
    {title: "Scene Control / Return to Title Screen", infile: "./test/scene-control/return-to-title-screen.txt", mapfile: "./data/Map001.json", expfile: "./test/scene-control/expected_return-to-title-screen.json"},
    {title: "System Settings / Change Save Access", infile: "./test/system-settings/change-save-access.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-save-access.json"},
    {title: "System Settings / Change Menu Access", infile: "./test/system-settings/change-menu-access.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-menu-access.json"},
    {title: "System Settings / Change Encounter", infile: "./test/system-settings/change-encounter.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-encounter.json"},
    {title: "System Settings / Change Formation Access", infile: "./test/system-settings/change-formation-access.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-formation-access.json"},
    {title: "System Settings / Change Window Color", infile: "./test/system-settings/change-window-color.txt", mapfile: "./data/Map001.json", expfile: "./test/system-settings/expected_change-window-color.json"},
    {title: "Map / Change Map Name Display", infile: "./test/map/change-map-name-display.txt", mapfile: "./data/Map001.json", expfile: "./test/map/expected_change-map-name-display.json"},
    {title: "Map / Change Tileset", infile: "./test/map/change-tileset.txt", mapfile: "./data/Map001.json", expfile: "./test/map/expected_change-tileset.json"},    
    {title: "Plugin Command MZ", infile: "./test/73-plugin-command-mz.txt", mapfile: "./data/Map001.json", expfile: "./test/73-expected_plugin-command-mz.json"},
  ];

  const consoleStub = sinon.stub(console, 'log');
  const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
  const readFileSyncStub = sinon.stub(fs, 'readFileSync');

  tests.forEach(function(test, index) {
    it(test.title, function(done) {
      fs.readFile(test.infile, 'utf8', function(err, test_input) {
      fs.readFile(test.mapfile, 'utf8', function(err, test_map_data) {
      fs.readFile(test.expfile, 'utf8', function(err, expected_data) {
        let result_data = "";
        writeFileSyncStub.callsFake(function(file_path, json_data, encoding){
          result_data = json_data;
          return file_path;
        });
        const count = index * 2;
        readFileSyncStub.onCall(count).returns(test_input);
        readFileSyncStub.onCall(count+1).returns(test_map_data);

        const folder_name = '';
        const file_name   = '';
        const map_id      = '1';
        const event_id    = '1';
        const page_id     = '1';
        const overwrite   = 'true';
        Game_Interpreter.prototype.pluginCommandText2Frame('IMPORT_MESSAGE_TO_EVENT',
          [folder_name, file_name, map_id, event_id, page_id, overwrite]);

        const expected_json = JSON.parse(expected_data);
        const actual_json = JSON.parse(result_data);
        expect(actual_json).to.eql(expected_json);
        done();
      });
      });
      });
    })
  });
})
