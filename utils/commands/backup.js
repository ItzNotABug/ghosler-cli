import fs from 'fs';
import path from 'path';
import Utils from '../utils.js';
import {zip} from 'zip-a-folder';

/**
 * Class that performs backup.
 */
export default class Backup {

    static #backupDirectory = '.backups';
    static #tempDirectory = '.temp-backup';
    static #excludeFilesDirs = ['.idea', 'node_modules', '.logs', Backup.#backupDirectory, Backup.#tempDirectory];

    /**
     * Start the backup task.
     *
     * @returns {Promise<void>}
     */
    static async doBackup() {
        if (!Utils.isGhoslerInstalled()) {
            Utils.logFail('You sure that Ghosler is installed in this directory?');
            return;
        }

        Utils.logStart('Starting backup...');

        const status = await this.#saveFiles();
        status instanceof Error ? Utils.logFail(`Backup failed, ${status}`) : Utils.logSucceed('Backup complete');
    }

    /**
     * Start the backup process, copy the files & zip them in the '.backups' folder.
     *
     * @returns {Promise<void|Error>} - Error if something went wrong, void otherwise.
     */
    static async #saveFiles() {
        this.#ensureDirs();

        this.#copyFolderSync(process.cwd(), this.#tempDirectory, this.#excludeFilesDirs);

        const result = await zip(this.#tempDirectory, this.#backupName);

        fs.rmSync(this.#tempDirectory, {recursive: true, force: true});

        return result;
    }

    /**
     * Ensure the backup directory exists and remove the temp directory if it exists.
     */
    static #ensureDirs() {
        fs.mkdirSync(this.#backupDirectory, {recursive: true});
        fs.rmSync(this.#tempDirectory, {recursive: true, force: true});
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
     * @returns {string} - Human readable date stamp name for the backup file.
     */
    static get #backupName() {
        return `${this.#backupDirectory}/backup_${Utils.currentDateStamp}.zip`;
    }
}