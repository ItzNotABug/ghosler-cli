import fs from 'fs';
import path from 'path';
import Utils from '../utils.js';
import {zip} from 'zip-a-folder';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that performs backup.
 */
export default class Backup extends BaseCommand {

    static #backupDirectory = '.backups';
    static #tempDirectory = '.temp-backup';
    static #excludeFilesDirs = ['.idea', 'node_modules', '.logs', Backup.#backupDirectory, Backup.#tempDirectory];

    static yargsCommand() {
        return {
            command: 'backup',
            description: 'Backup Ghosler instance.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance to back up.',
                });
            }, handler: async (argv) => await this.#performTask(argv)
        };
    }

    /**
     * Perform backup, public method created for the Update task.
     *
     * @param {string} name - The name of the Ghosler instance to back up.
     * @param {string} instancePath - The name of the Ghosler instance to back up.
     * @returns {Promise<void>} - Nothing.
     */
    static async backupInstance(name, instancePath) {
        await this.#performTask({name: name, path: instancePath});
    }

    /**
     * Start the backup task.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        Utils.logStart('Starting backup...');

        let instancePath;

        if (!argv.path) {
            const instance = await PM2Manager.getProcess(argv.name);
            if (!instance) {
                Utils.logFail(`Unable to find the registered process: ${argv.name}`);
                return;
            } else instancePath = instance.path;
        } else instancePath = argv.path;

        const status = await this.#saveFiles(instancePath);
        status instanceof Error ? Utils.logFail(`Backup failed, ${status}`) : Utils.logSucceed('Backup complete');
    }

    /**
     * Start the backup process, copy the files & zip them in the '.backups' folder.
     *
     * @param {string} instancePath - The path of the ghosler instance to back up.
     * @returns {Promise<void|Error>} - Error if something went wrong, void otherwise.
     */
    static async #saveFiles(instancePath) {
        this.#ensureDirs(instancePath);

        const tempDir = path.join(instancePath, this.#tempDirectory);
        this.#copyFolderSync(instancePath, tempDir, this.#excludeFilesDirs);

        const result = await zip(tempDir, this.#backupName(instancePath));

        fs.rmSync(tempDir, {recursive: true, force: true});

        return result;
    }

    /**
     * Ensure the backup directory exists and remove the temp directory if it exists.
     *
     * @param {string} instancePath - The path of the ghosler instance to back up.
     */
    static #ensureDirs(instancePath) {
        const tempDir = path.join(instancePath, this.#tempDirectory);
        const backupDir = path.join(instancePath, this.#backupDirectory);

        fs.mkdirSync(backupDir, {recursive: true});
        fs.rmSync(tempDir, {recursive: true, force: true});
    }

    /**
     * Copy the files from source to destination while excluding some dirs or files.
     *
     * @param srcDir - Source directory.
     * @param destDir - Destination directory.
     * @param excludeFilesDirs - Files or Directories to be excluded.
     */
    static #copyFolderSync(srcDir, destDir, excludeFilesDirs = []) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

        let entries = fs.readdirSync(srcDir, {withFileTypes: true});

        for (let entry of entries) {
            let srcPath = path.join(srcDir, entry.name);
            let destPath = path.join(destDir, entry.name);
            if (!excludeFilesDirs.includes(entry.name)) {
                if (entry.isDirectory()) this.#copyFolderSync(srcPath, destPath, excludeFilesDirs);
                else fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Backup file name.
     *
     * @param {string} instancePath - The home path of the ghosler instance.
     * @returns {string} - Human readable date stamp name for the backup file.
     */
    static #backupName(instancePath) {
        const backupDir = path.join(instancePath, this.#backupDirectory);
        return `${backupDir}/backup_${Utils.currentDateStamp}.zip`;
    }
}