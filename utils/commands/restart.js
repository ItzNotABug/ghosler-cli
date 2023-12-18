import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';

/**
 * Class that performs a restart via PM2.
 */
export default class Restart {

    /**
     * Start the restart task.
     *
     * @returns {Promise<void>}
     */
    static async doRestart() {
        if (!Utils.isGhoslerInstalled()) {
            Utils.logFail('You sure that Ghosler is installed in this directory?');
            return;
        }

        Utils.logStart('Restarting Ghosler...');
        const result = await PM2Manager.restart();
        result !== 'Done' ? Utils.logFail(result) : Utils.logSucceed('Ghosler restarted successfully!');
    }
}