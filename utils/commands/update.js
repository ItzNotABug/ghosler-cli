import fs from 'fs';
import path from 'path';
import Backup from './backup.js';
import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';

/**
 * Class that performs updates.
 */
export default class Update {

    // files to ignore.
    static #toIgnore = [
        '.logs', 'files', '.backups',
        'README.md', 'LICENSE.md', '.gitignore',
        'config.debug.json', 'custom-template.ejs', 'config.production.json',
    ];

    /**
     * Start the update task.
     *
     * @returns {Promise<void>}
     */
    static async doUpdate() {
        if (!Utils.isGhoslerInstalled()) {
            Utils.logFail('You sure that Ghosler is installed in this directory?');
            return;
        }

        Utils.logStart('Checking for the latest version...');

        const latestVersion = await this.#checkVersion();
        if (latestVersion.status === 'error') {
            Utils.logFail(latestVersion.message);
        } else if (!latestVersion.update) {
            Utils.logSucceed(latestVersion.message);
        } else if (latestVersion.update) {
            Utils.logSucceed(`Latest version: ${latestVersion.message}`);
            await this.#update();
        }
    }

    static async #update() {
        await Backup.doBackup();

        // clone ghosler, extract.
        Utils.logStart('Cloning...');

        const cloneOp = await Utils.cloneGhosler();
        if (cloneOp.success) Utils.logSucceed(cloneOp.message);
        else {
            Utils.logFail(`Failed to clone the repository, ${cloneOp.message}`);
            return;
        }

        // Setting up directories
        const extraction = await Utils.extractGhosler(`${path.join(process.cwd(), '.update')}`);
        if (extraction.success) {
            Utils.logSucceed(extraction.message);
        } else {
            Utils.logFail(`Failed to setup the directory, ${extraction.message}`);
            fs.rmSync('.update', {recursive: true, force: true});
            return;
        }

        Utils.logStart('Removing previous files...');
        this.#deleteUnwantedFiles(this.#toIgnore);
        Utils.logSucceed('Previous files removed.');

        Utils.logStart('Moving upload files...');
        this.#moveFolderSync(`${path.join(process.cwd(), '.update')}`, process.cwd(), this.#toIgnore);
        Utils.logSucceed('Files moved.');

        fs.rmSync('.update', {recursive: true, force: true});

        Utils.logStart('Restarting Ghosler...');
        const result = await PM2Manager.restart(true);
        if (result === 'Done') {
            Utils.logSucceed('Ghosler updated successfully!');
        } else {
            Utils.logFail(result);
            console.log('Restore your latest backup if something went wrong & execute `ghosler restart`.');
        }
    }

    /**
     * Remove previous files of the app.
     *
     * @param {string[]} toIgnore - Files to ignore.
     */
    static #deleteUnwantedFiles(toIgnore) {
        const tempDirName = '.update';

        let entries = fs.readdirSync(process.cwd(), {withFileTypes: true});
        for (let entry of entries) {
            // Ignore files/directories in the toIgnore list or the temp directory
            if (toIgnore.includes(entry.name) || entry.name === tempDirName) continue;

            let currentPath = path.join(process.cwd(), entry.name);
            if (entry.isDirectory()) {
                fs.rmSync(currentPath, {recursive: true});
            } else {
                fs.unlinkSync(currentPath);
            }
        }
    }

    /**
     * Move the files from source to destination while excluding some dirs or files.
     *
     * @param srcDir - Source directory.
     * @param destDir - Destination directory.
     * @param excludeFiles - Files or Directories to be excluded.
     */
    static #moveFolderSync(srcDir, destDir, excludeFiles = []) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, {recursive: true});
        let entries = fs.readdirSync(srcDir, {withFileTypes: true});

        for (let entry of entries) {
            let srcPath = path.join(srcDir, entry.name);
            let destPath = path.join(destDir, entry.name);

            if (!excludeFiles.includes(entry.name)) {
                if (entry.isDirectory()) {
                    this.#moveFolderSync(srcPath, destPath, excludeFiles);
                } else fs.renameSync(srcPath, destPath);
            }

        }
    }

    /**
     * Check if there is an update available.
     *
     * @returns {Promise<{update: boolean, message: string}|{message: string, status: string}>}
     */
    static async #checkVersion() {
        const latestVersion = await Utils.latestReleaseVersion();
        const currentVersion = Utils.currentGhoslerVersion();
        if (currentVersion.status === 'success') {
            if (latestVersion !== 'na' && latestVersion > currentVersion.message) {
                return {
                    update: true,
                    message: latestVersion
                };
            } else return {
                update: false,
                message: 'Ghosler is already on the latest version'
            };
        } else return currentVersion;
    }

}