import fs from 'fs';
import path from 'path';
import Utils from '../utils.js';
import Backup from './backup.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that performs updates.
 */
export default class Update extends BaseCommand {

    // files to ignore.
    static #toIgnore = [
        '.logs', 'files', '.backups',
        'README.md', 'LICENSE.md', '.gitignore',

        // pre docker
        'config.debug.json',
        'custom-template.ejs',
        'config.production.json',

        // post docker
        'configuration', // <<< directory
        'Dockerfile', '.dockerignore', 'docker-install.sh',
    ];

    static yargsCommand() {
        return {
            command: 'update',
            description: 'Check and update Ghosler if available.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance to update.',
                });
            },
            handler: async (argv) => await this.#performTask(argv)
        };
    }

    /**
     * Start the update task.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        Utils.logStart('Checking for the latest version...');
        const instance = await PM2Manager.getProcess(argv.name);
        if (!instance) {
            Utils.logFail(`Unable to find the registered process: ${argv.name}`);
            return;
        }

        const latestVersion = await this.#checkVersion(instance.path);

        if (latestVersion.status === 'error') {
            Utils.logFail(latestVersion.message);
        } else if (!latestVersion.update) {
            Utils.logSucceed(latestVersion.message);
        } else if (latestVersion.update) {
            Utils.logSucceed(`Latest version: ${latestVersion.message}`);
            await this.#update(argv.name, instance.path);
        }
    }

    /**
     * Backup and then update the Ghosler instance.
     *
     * @param {string} name - The ghosler instance to update.
     * @param {string} instancePath - The path of the ghosler instance.
     * @returns {Promise<void>} - Nothing.
     */
    static async #update(name, instancePath) {
        await Backup.backupInstance(name, instancePath);

        // clone ghosler, extract.
        Utils.logStart('Cloning...');

        const cloneOp = await Utils.cloneGhosler();
        if (cloneOp.success) Utils.logSucceed(cloneOp.message);
        else {
            Utils.logFail(`Failed to clone the repository, ${cloneOp.message}`);
            return;
        }

        // Setting up directories
        const updatePath = path.join(instancePath, '.update');
        const extraction = await Utils.extractGhosler(updatePath);
        if (!extraction.success) {
            Utils.logFail(`Failed to setup the directory, ${extraction.message}`);
            fs.rmSync(updatePath, {recursive: true, force: true});
            return;
        }

        Utils.logSucceed(extraction.message);

        Utils.logStart('Removing previous files...');
        this.#deleteUnwantedFiles(this.#toIgnore, instancePath);
        Utils.logSucceed('Previous files removed.');

        Utils.logStart('Moving upload files...');
        this.#moveFolderSync(updatePath, instancePath, this.#toIgnore);
        Utils.logSucceed('Files moved.');

        fs.rmSync(updatePath, {recursive: true, force: true});

        Utils.logStart('Updating Ghosler configuration file...');
        await Utils.updateConfigurations('release', name, instancePath, false);

        Utils.logStart('Restarting Ghosler...');
        const result = await PM2Manager.restart(name, true);

        if (result.status) Utils.logSucceed(result.message);
        else {
            Utils.logFail(result.message);
            console.log(`Restore your latest backup if something went wrong & execute \`ghosler restart --name ${name}\`.`);
        }
    }

    /**
     * Remove previous files of the app.
     *
     * @param {string[]} toIgnore - Files to ignore.
     * @param {string} instancePath - The path of the ghosler instance.
     */
    static #deleteUnwantedFiles(toIgnore, instancePath) {
        const tempDirName = '.update';

        let entries = fs.readdirSync(instancePath, {withFileTypes: true});
        for (let entry of entries) {
            // Ignore files/directories in the toIgnore list or the temp directory
            if (toIgnore.includes(entry.name) || entry.name === tempDirName) continue;

            let currentPath = path.join(instancePath, entry.name);
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
     * @param {string} instancePath - The path of the ghosler instance to check for version.
     * @returns {Promise<{update: boolean, message: string}|{message: string, status: string}>}
     */
    static async #checkVersion(instancePath) {
        const latestVersion = await Utils.latestReleaseVersion();
        const currentVersion = Utils.currentGhoslerVersion(instancePath);
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