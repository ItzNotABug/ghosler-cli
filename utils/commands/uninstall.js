import fs from 'fs';
import path from 'path';
import PM2Manager from '../pm2/manager.js';
import Utils from '../utils.js';

/**
 * Class that performs a complete uninstall.
 */
export default class Uninstall {

    /**
     * Start the uninstallation task.
     */
    static doUninstall() {
        if (!Utils.isGhoslerInstalled()) {
            Utils.logFail('You sure that Ghosler is installed in this directory?');
            return;
        }

        Utils.logStart('Uninstalling Ghosler...');

        PM2Manager.uninstall();
        this.#deleteDirectoryContents();

        Utils.logSucceed('Ghosler uninstalled!');
    }

    /**
     * Delete everything in the current directory.
     */
    static #deleteDirectoryContents() {
        const files = fs.readdirSync(process.cwd());

        for (const file of files) {
            const fullPath = path.join(process.cwd(), file);
            fs.rmSync(fullPath, {recursive: true, force: true});
        }
    }
}