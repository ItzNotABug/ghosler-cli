import fs from 'fs';
import path from 'path';
import extract from 'extract-zip';
import {writeFile} from 'fs/promises';
import ora from 'ora';

/**
 * A utility class.
 */
export default class Utils {

    static #spinner = ora({color: 'white', spinner: 'dots'});

    // Temporary directory for processing.
    static #tempDirectory = '.temp';

    // Full path to the downloaded Ghosler archive.
    static #fullArchivePath = `${this.#tempDirectory}/ghosler-latest.zip`;

    static ghoslerReleaseUrl = 'https://api.github.com/repos/itznotabug/ghosler/releases/latest';
    static ghoslerDownloadUrl = 'https://github.com/itznotabug/ghosler/archive/refs/tags/{version}.zip';

    /**
     * Start the spinner with log message.
     *
     * @param message - The log message to print.
     */
    static logStart(message) {
        this.#spinner.start(message);
    }

    /**
     * Print a fail message & complete spinner.
     *
     * @param message - The log message to print.
     */
    static logFail(message) {
        this.#spinner.fail(message);
    }

    /**
     * Print a success message & complete spinner.
     *
     * @param message - The log message to print.
     */
    static logSucceed(message) {
        this.#spinner.succeed(message);
    }

    /**
     * Delays execution for a specified number of milliseconds.
     *
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>} A promise that resolves after the specified delay.
     */
    static sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Checks if the Ghosler app is installed in the current directory.
     *
     * @returns {boolean} True if the 'package.json' file exists in the current directory, false otherwise.
     */
    static isGhoslerInstalled() {
        return this.currentGhoslerVersion().status === 'success';
    }

    /**
     * Clones the Ghosler repository with the latest release version.
     *
     * @returns {Promise<{success: boolean, message: string}>} The result of the cloning operation, including a success flag and a message.
     */
    static async cloneGhosler() {
        try {
            // setup.
            if (!fs.existsSync(this.#tempDirectory)) fs.mkdirSync(this.#tempDirectory);
            if (fs.existsSync(this.#fullArchivePath)) fs.unlinkSync(this.#fullArchivePath);

            const latestVersion = await this.latestReleaseVersion();
            if (latestVersion === 'na') return {success: false, message: 'Unable to check for the latest version.'};

            const response = await fetch(this.ghoslerDownloadUrl.replace('{version}', latestVersion));
            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(this.#fullArchivePath, buffer);

            return {success: true, message: 'Cloning complete.'};
        } catch (error) {
            return {success: false, message: error};
        }
    }

    /**
     * Extracts the Ghosler application to a specified target path.
     *
     * @param {string} [targetPath=process.cwd()] - The path where the application should be extracted.
     * @returns {Promise<{success: boolean, message: string}>} The result of the extraction operation.
     */
    static async extractGhosler(targetPath = process.cwd()) {
        try {
            if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath);

            await extract(this.#fullArchivePath, {dir: targetPath});

            // Identify the extracted directory (assuming it starts with 'project-')
            const directories = fs.readdirSync(targetPath, {withFileTypes: true})
                .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('ghosler-'))
                .map(dirent => dirent.name);

            if (directories.length === 0) {
                return {success: false, message: 'No project directory found after extraction.'};
            }

            if (directories.length > 1) {
                return {success: false, message: 'Multiple project directories found, unsure which one to use'};
            }

            const extractedFolder = path.join(targetPath, directories[0]);

            const files = fs.readdirSync(extractedFolder);

            files.forEach(file => {
                const currentPath = path.join(extractedFolder, file);
                const newPath = path.join(targetPath, file);
                fs.renameSync(currentPath, newPath);
            });

            // unnecessary files, remove them.
            [
                this.#tempDirectory, extractedFolder,
                '.gitignore', 'LICENSE.md', 'README.md',
                // we don't need tailwind's build files.
                'public/styles/tailwind.css', 'tailwind.config.js'
            ].forEach(file => {
                if (fs.existsSync(file)) fs.rmSync(file, {recursive: true});
            });
            return {success: true, message: 'Directory setup completed.'};
        } catch (error) {
            return {success: false, message: error};
        }
    }

    /**
     * Generates a formatted timestamp string.
     *
     * @returns {string} A timestamp string formatted as 'YYYY-MM-DD_hh-mm-ss'.
     */
    static get currentDateStamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-');
    }

    /**
     * Retrieves the latest release version of the Ghosler application.
     *
     * @returns {Promise<string>} The latest version of the Ghosler application, or 'na' if unable to retrieve.
     */
    static async latestReleaseVersion() {
        // return '0.2';
        const response = await fetch(this.ghoslerReleaseUrl);
        if (response.ok) {
            const jsonObject = await response.json();
            return jsonObject.name;
        } else return 'na';
    }

    /**
     * Retrieves the current version of Ghosler application, if installed in the current working directory.
     *
     * @returns {{message: string, status: string}} The status of the operation & a useful message.
     */
    static currentGhoslerVersion() {
        const cwd = process.cwd();
        const packageJsonPath = path.join(cwd, 'package.json');
        try {
            if (fs.existsSync(packageJsonPath)) {
                const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
                const packageJson = JSON.parse(packageJsonContent);

                if (packageJson && packageJson.version) {
                    if (packageJson.name && packageJson.name === 'ghosler' && packageJson.version) {
                        return {
                            status: 'success',
                            message: packageJson.version
                        };
                    } else {
                        return {
                            status: 'error',
                            message: 'packageJson.version'
                        };
                    }
                } else {
                    return {
                        status: 'error',
                        message: 'Are you sure Ghosler instance is running in this directory?'
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Are you sure Ghosler instance is running in this directory?'
                };
            }
        } catch (error) {
            console.error('An error occurred:', error);
            return {
                status: 'error',
                message: 'Error reading current Ghosler version.'
            };
        }
    }
}