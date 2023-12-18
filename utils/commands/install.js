import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';

/**
 * Class that performs Ghosler installation.
 */
export default class Install {

    /**
     * Start the installation task.
     *
     * @returns {Promise<void>}
     */
    static async doInstall() {

        // Checking latest version
        Utils.logStart('Initiating');
        if (Utils.isGhoslerInstalled()) {
            Utils.logFail('Ghosler seems to be installed already. Do you want to update maybe?');
            return;
        }

        // Cloning
        Utils.logStart("Cloning...");
        const clone = await Utils.cloneGhosler();

        if (clone.success) Utils.logSucceed(clone.message);
        else {
            Utils.logFail(`Failed to clone the repository, ${clone.message}`);
            return;
        }

        // Setting up directories
        Utils.logStart("Setting up directories...");
        const extraction = await Utils.extractGhosler();

        if (extraction.success) {
            Utils.logSucceed(extraction.message);
        } else {
            Utils.logFail(`Failed to setup the directory, ${extraction.message}`);
            return;
        }

        Utils.logStart("Installing Ghosler...");

        const result = await PM2Manager.register();
        result !== 'done' ? Utils.logFail(result) : Utils.logSucceed("Ghosler installation completed.");
    }
}